from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from functools import cached_property
from pathlib import Path
from typing import Any

import numpy as np
import psycopg
from pgvector.psycopg import register_vector
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

SCHEMA_FILE = Path(__file__).parent / "sql" / "setup.sql"


def _conn_kwargs(schema: str) -> dict[str, str]:
    if not re.fullmatch(r"[a-z_][a-z0-9_]*", schema):
        raise ValueError(f"invalid RAG_DB_SCHEMA: {schema!r}")
    return {"options": f"-c search_path={schema},public"}


_RRF_K = 60

_HYBRID_SEARCH_SQL = """
WITH semantic AS (
    SELECT id, row_number() OVER (ORDER BY embedding <=> %(q)s) AS rank
    FROM rag_chunks
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> %(q)s
    LIMIT %(pool)s
),
keyword AS (
    SELECT c.id, row_number() OVER (ORDER BY ts_rank_cd(c.content_tsv, tq) DESC) AS rank
    FROM rag_chunks c, websearch_to_tsquery('english', %(text)s) tq
    WHERE c.content_tsv @@ tq
    ORDER BY ts_rank_cd(c.content_tsv, tq) DESC
    LIMIT %(pool)s
),
fused AS (
    SELECT coalesce(s.id, k.id) AS id,
           coalesce(1.0 / (%(rrf_k)s + s.rank), 0)
         + coalesce(1.0 / (%(rrf_k)s + k.rank), 0) AS rrf
    FROM semantic s
    FULL OUTER JOIN keyword k ON k.id = s.id
)
SELECT c.content, d.source, c.chunk_index,
       coalesce(1 - (c.embedding <=> %(q)s), 0) AS score, d.metadata
FROM fused f
JOIN rag_chunks c ON c.id = f.id
JOIN rag_documents d ON d.id = c.document_id
ORDER BY f.rrf DESC
LIMIT %(k)s
"""


def _parse_row(content: str) -> dict[str, Any] | None:
    try:
        data = json.loads(content)
    except ValueError:
        return None
    row = data.get("row") if isinstance(data, dict) else None
    return row if isinstance(row, dict) else None


def render_text(content: str, skip: frozenset[str] = frozenset()) -> str:
    row = _parse_row(content)
    if row is None:
        return content
    return "\n".join(
        f"{key.replace('_', ' ')}: {value}"
        for key, value in row.items()
        if key not in skip and value not in (None, "")
    )


@dataclass
class Chunk:
    content: str
    source: str
    chunk_index: int
    score: float
    metadata: dict[str, Any] = field(default_factory=dict)

    @cached_property
    def row(self) -> dict[str, Any] | None:
        return _parse_row(self.content)

    @property
    def title(self) -> str:
        row = self.row or {}
        return (self.metadata.get("title") or row.get("source_title")
                or self.metadata.get("dataset") or self.source)

    @property
    def url(self) -> str:
        return (self.row or {}).get("source_url") or self.source

    @property
    def text(self) -> str:
        return render_text(self.content)


def init_schema(dsn: str, dim: int, schema: str = "rag") -> None:
    sql = SCHEMA_FILE.read_text(encoding="utf-8")
    if dim != 1024:
        sql = sql.replace("vector(1024)", f"vector({int(dim)})")
    with psycopg.connect(dsn, **_conn_kwargs(schema)) as conn:
        conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        conn.execute(sql)


_REQUIRED_COLUMNS = {
    "rag_documents": {"id", "source", "metadata", "content_hash", "embed_model",
                      "created_at", "updated_at"},
    "rag_chunks": {"id", "document_id", "chunk_index", "content", "content_tsv", "embedding"},
}
_REQUIRED_PRIVILEGES = {
    "rag_documents": ("SELECT", "INSERT", "UPDATE", "DELETE"),
    "rag_chunks": ("SELECT", "INSERT", "UPDATE", "DELETE"),
}


def check_db(dsn: str, dim: int, schema: str = "rag") -> tuple[list[str], list[str], list[str]]:
    ok: list[str] = []
    warnings: list[str] = []
    problems: list[str] = []
    try:
        conn = psycopg.connect(dsn, connect_timeout=5, **_conn_kwargs(schema))
    except psycopg.OperationalError as exc:
        return ok, warnings, [f"cannot connect with RAG_DATABASE_URL: {str(exc).strip()}"]

    with conn:
        user = conn.execute("SELECT current_user, current_database()").fetchone()
        ok.append(f"connected as {user[0]} to {user[1]}")

        if not conn.execute(
            "SELECT 1 FROM pg_namespace WHERE nspname = %s", (schema,)
        ).fetchone():
            problems.append(
                f"schema {schema!r} does not exist: run rag/sql/roles.sql as superuser"
            )
            return ok, warnings, problems
        if not conn.execute("SELECT has_schema_privilege(%s, 'USAGE')", (schema,)).fetchone()[0]:
            problems.append(f"{user[0]} lacks USAGE on schema {schema}")
            return ok, warnings, problems
        ok.append(f"schema {schema}")

        strays = [t for t in _REQUIRED_COLUMNS
                  if conn.execute("SELECT to_regclass(%s)", (f"public.{t}",)).fetchone()[0]]
        if strays and schema != "public":
            problems.append(f"stray tables in public: {', '.join(strays)} (drop them; "
                            f"they belong in {schema})")

        ext = conn.execute(
            "SELECT extversion FROM pg_extension WHERE extname = 'vector'"
        ).fetchone()
        if not ext:
            problems.append("pgvector not enabled: as superuser run CREATE EXTENSION vector;")
            return ok, warnings, problems
        version = tuple(int(p) for p in ext[0].split(".")[:2] if p.isdigit())
        if version < (0, 5):
            problems.append(f"pgvector {ext[0]} is too old (need >= 0.5.0 for HNSW)")
        else:
            ok.append(f"pgvector {ext[0]}")

        for table, required in _REQUIRED_COLUMNS.items():
            qualified = f"{schema}.{table}"
            cols = {r[0] for r in conn.execute(
                "SELECT column_name FROM information_schema.columns"
                " WHERE table_schema = %s AND table_name = %s", (schema, table)
            )}
            if not cols:
                problems.append(f"table {qualified} missing: run `python -m rag init-db` "
                                "(as rag_app)")
                continue
            if missing := required - cols:
                problems.append(f"{qualified} lacks columns {sorted(missing)}: "
                                "old schema, run reset.sql then init-db")
            denied = [p for p in _REQUIRED_PRIVILEGES[table] if not conn.execute(
                "SELECT has_table_privilege(%s, %s)", (qualified, p)).fetchone()[0]]
            if denied:
                problems.append(f"{user[0]} lacks {', '.join(denied)} on {qualified}")
            if not missing and not denied:
                ok.append(f"{qualified} schema + privileges")

        for seq in ("rag_documents_id_seq", "rag_chunks_id_seq"):
            qualified = f"{schema}.{seq}"
            row = conn.execute("SELECT to_regclass(%s)", (qualified,)).fetchone()
            if row[0] and not conn.execute(
                    "SELECT has_sequence_privilege(%s, 'USAGE')", (qualified,)).fetchone()[0]:
                problems.append(f"{user[0]} lacks USAGE on sequence {qualified}")

        typmod = conn.execute(
            "SELECT atttypmod FROM pg_attribute"
            " WHERE attrelid = to_regclass(%s) AND attname = 'embedding'",
            (f"{schema}.rag_chunks",),
        ).fetchone()
        if typmod and typmod[0] != dim:
            problems.append(f"rag_chunks.embedding is vector({typmod[0]}) but RAG_EMBED_DIM={dim}")

        if not problems:
            docs, chunks, missing_vecs = conn.execute(
                "SELECT (SELECT count(*) FROM rag_documents), (SELECT count(*) FROM rag_chunks),"
                " (SELECT count(*) FROM rag_chunks WHERE embedding IS NULL)"
            ).fetchone()
            ok.append(f"{docs} documents, {chunks} chunks loaded")
            if missing_vecs:
                warnings.append(f"{missing_vecs} of {chunks} chunks have no embedding (keyword "
                                "search only): run `python -m rag embed-missing`")
    return ok, warnings, problems


class Store:
    def __init__(self, dsn: str, schema: str = "rag", min_size: int = 1, max_size: int = 4) -> None:
        self._pool = ConnectionPool(
            dsn,
            min_size=min_size,
            max_size=max_size,
            kwargs=_conn_kwargs(schema),
            configure=register_vector,
            open=True,
        )

    def get_fingerprint(self, source: str) -> tuple[str | None, str] | None:
        with self._pool.connection() as conn:
            row = conn.execute(
                "SELECT content_hash, embed_model FROM rag_documents WHERE source = %s",
                (source,),
            ).fetchone()
        return (row[0], row[1]) if row else None

    def upsert_document(
        self,
        source: str,
        metadata: dict[str, Any],
        content_hash: str,
        embed_model: str,
        chunks: list[str],
        embeddings: list[np.ndarray],
    ) -> int:
        with self._pool.connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO rag_documents (source, metadata, content_hash, embed_model)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (source) DO UPDATE
                    SET metadata     = EXCLUDED.metadata,
                        content_hash = EXCLUDED.content_hash,
                        embed_model  = EXCLUDED.embed_model,
                        updated_at   = now()
                RETURNING id
                """,
                (source, Jsonb(metadata), content_hash, embed_model),
            )
            doc_id = cur.fetchone()[0]
            cur.execute("DELETE FROM rag_chunks WHERE document_id = %s", (doc_id,))
            cur.executemany(
                "INSERT INTO rag_chunks (document_id, chunk_index, content, embedding)"
                " VALUES (%s, %s, %s, %s)",
                [(doc_id, i, c, e) for i, (c, e) in enumerate(zip(chunks, embeddings))],
            )
        return len(chunks)

    def count_missing(self) -> int:
        with self._pool.connection() as conn:
            return conn.execute(
                "SELECT count(*) FROM rag_chunks WHERE embedding IS NULL"
            ).fetchone()[0]

    def fetch_missing(self, limit: int) -> list[tuple[int, str]]:
        with self._pool.connection() as conn:
            return conn.execute(
                "SELECT id, content FROM rag_chunks WHERE embedding IS NULL ORDER BY id LIMIT %s",
                (limit,),
            ).fetchall()

    def set_embeddings(self, rows: list[tuple[int, np.ndarray]]) -> None:
        with self._pool.connection() as conn, conn.cursor() as cur:
            cur.executemany(
                "UPDATE rag_chunks SET embedding = %s WHERE id = %s",
                [(vec, chunk_id) for chunk_id, vec in rows],
            )

    def delete_document(self, source: str) -> bool:
        with self._pool.connection() as conn:
            cur = conn.execute("DELETE FROM rag_documents WHERE source = %s", (source,))
            return cur.rowcount > 0

    def search(self, query_vec: np.ndarray, query_text: str, k: int) -> list[Chunk]:
        with self._pool.connection() as conn:
            rows = conn.execute(
                _HYBRID_SEARCH_SQL,
                {"q": query_vec, "text": query_text, "k": k,
                 "pool": max(k * 4, 20), "rrf_k": _RRF_K},
            ).fetchall()
        return [
            Chunk(content=r[0], source=r[1], chunk_index=r[2], score=float(r[3]), metadata=r[4])
            for r in rows
        ]

    def close(self) -> None:
        self._pool.close()
