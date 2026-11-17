from __future__ import annotations

import hashlib
from html import escape
from pathlib import Path
from typing import Any, Callable

from .chunking import chunk_text
from .config import Settings
from .store import Chunk, Store, init_schema, render_text

_EMBED_SKIP = frozenset({"source_url", "observed_on"})


class RAG:
    def __init__(self, settings: Settings) -> None:
        from .embedder import Embedder

        self.settings = settings
        self.embedder = Embedder(settings)
        self.store = Store(settings.database_url, settings.db_schema)

    @classmethod
    def from_env(cls) -> "RAG":
        return cls(Settings.from_env())

    @staticmethod
    def init_db(settings: Settings | None = None) -> None:
        settings = settings or Settings.from_env()
        init_schema(settings.database_url, settings.embed_dim, settings.db_schema)

    def retrieve(self, question: str, k: int = 5) -> list[Chunk]:
        return self.store.search(self.embedder.embed_query(question), question, k)

    def ingest_text(
        self,
        text: str,
        source: str,
        metadata: dict[str, Any] | None = None,
        force: bool = False,
    ) -> int | None:
        content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        model = self.settings.embed_model_name
        if not force and self.store.get_fingerprint(source) == (content_hash, model):
            return None

        chunks = chunk_text(text, self.settings.chunk_size, self.settings.chunk_overlap)
        if not chunks:
            return 0
        embeddings = self.embedder.embed_documents(chunks)
        return self.store.upsert_document(
            source, metadata or {}, content_hash, model, chunks, embeddings
        )

    def ingest_file(
        self,
        path: str | Path,
        source: str | None = None,
        metadata: dict[str, Any] | None = None,
        force: bool = False,
    ) -> int | None:
        path = Path(path)
        text = path.read_text(encoding="utf-8", errors="replace")
        metadata = dict(metadata or {})
        metadata.setdefault("title", _guess_title(text, path))
        return self.ingest_text(text, source or path.as_posix(), metadata, force=force)

    def embed_missing(
        self, batch_size: int = 32, on_progress: Callable[[int, int], None] | None = None
    ) -> int:
        total = self.store.count_missing()
        done = 0
        while rows := self.store.fetch_missing(batch_size):
            vecs = self.embedder.embed_documents(
                [render_text(content, _EMBED_SKIP) for _, content in rows]
            )
            self.store.set_embeddings([(chunk_id, v) for (chunk_id, _), v in zip(rows, vecs)])
            done += len(rows)
            if on_progress:
                on_progress(done, total)
        return done

    def delete(self, source: str) -> bool:
        return self.store.delete_document(source)

    def close(self) -> None:
        self.store.close()
        self.embedder.close()


def _guess_title(text: str, path: Path) -> str:
    for line in text.splitlines():
        if line.startswith("#"):
            heading = line.lstrip("#").strip()
            if heading:
                return heading
    return path.stem.replace("-", " ").replace("_", " ")


def format_context(chunks: list[Chunk]) -> str:
    parts = ["<documents>"]
    for i, c in enumerate(chunks, 1):
        parts.append(
            f'<document index="{i}" title="{escape(c.title, quote=True)}" '
            f'source="{escape(c.url, quote=True)}">\n'
            f"{c.text}\n</document>"
        )
    parts.append("</documents>")
    return "\n".join(parts)
