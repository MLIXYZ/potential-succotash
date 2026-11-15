from __future__ import annotations

import os
from dataclasses import dataclass

DEFAULT_QUERY_INSTRUCTION = (
    "Given a user question, retrieve relevant passages that answer the question"
)


def _env_int(name: str, default: int) -> int:
    value = os.environ.get(name)
    return int(value) if value else default


@dataclass(frozen=True)
class Settings:
    database_url: str
    db_schema: str = "rag"
    model_path: str | None = None
    model_repo: str = "Qwen/Qwen3-Embedding-0.6B-GGUF"
    model_file: str = "*Q8_0.gguf"
    embed_model_name: str = "Qwen3-Embedding-0.6B-Q8_0"
    n_threads: int = 4
    n_ctx: int = 2048
    embed_dim: int = 1024
    chunk_size: int = 1200
    chunk_overlap: int = 200
    query_instruction: str = DEFAULT_QUERY_INSTRUCTION

    @classmethod
    def from_env(cls) -> "Settings":
        database_url = os.environ.get("RAG_DATABASE_URL")
        if not database_url:
            raise RuntimeError("Set RAG_DATABASE_URL to the rag_app Postgres DSN")
        return cls(
            database_url=database_url,
            db_schema=os.environ.get("RAG_DB_SCHEMA", cls.db_schema),
            model_path=os.environ.get("RAG_MODEL_PATH") or None,
            model_repo=os.environ.get("RAG_MODEL_REPO", cls.model_repo),
            model_file=os.environ.get("RAG_MODEL_FILE", cls.model_file),
            embed_model_name=os.environ.get("RAG_EMBED_MODEL_NAME", cls.embed_model_name),
            n_threads=_env_int("RAG_THREADS", cls.n_threads),
            n_ctx=_env_int("RAG_N_CTX", cls.n_ctx),
            embed_dim=_env_int("RAG_EMBED_DIM", cls.embed_dim),
            chunk_size=_env_int("RAG_CHUNK_SIZE", cls.chunk_size),
            chunk_overlap=_env_int("RAG_CHUNK_OVERLAP", cls.chunk_overlap),
            query_instruction=os.environ.get("RAG_QUERY_INSTRUCTION", DEFAULT_QUERY_INSTRUCTION),
        )
