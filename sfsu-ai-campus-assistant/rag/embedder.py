from __future__ import annotations

import threading

import llama_cpp
import numpy as np
from llama_cpp import Llama

from .config import Settings

_EOT = "<|endoftext|>"


class Embedder:
    def __init__(self, settings: Settings) -> None:
        kwargs = dict(
            embedding=True,
            pooling_type=llama_cpp.LLAMA_POOLING_TYPE_LAST,
            n_ctx=settings.n_ctx,
            n_batch=settings.n_ctx,
            n_ubatch=settings.n_ctx,
            n_threads=settings.n_threads,
            verbose=False,
        )
        if settings.model_path:
            self._llm = Llama(model_path=settings.model_path, **kwargs)
        else:
            self._llm = Llama.from_pretrained(
                repo_id=settings.model_repo, filename=settings.model_file, **kwargs
            )
        self._lock = threading.Lock()
        self._dim = settings.embed_dim
        self._query_instruction = settings.query_instruction
        self._suffix = "" if self._tokenizer_appends_eot() else _EOT

    def _tokenizer_appends_eot(self) -> bool:
        eot = self._llm.tokenize(_EOT.encode(), add_bos=False, special=True)
        probe = self._llm.tokenize(b"probe", add_bos=True, special=False)
        return len(eot) == 1 and bool(probe) and probe[-1] == eot[0]

    def _embed(self, text: str) -> np.ndarray:
        with self._lock:
            raw = self._llm.embed(text + self._suffix, normalize=False, truncate=True)
        vec = np.asarray(raw, dtype=np.float32)
        if vec.ndim != 1:
            vec = vec.reshape(-1)
        vec = vec[: self._dim]
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec

    def embed_query(self, query: str) -> np.ndarray:
        return self._embed(f"Instruct: {self._query_instruction}\nQuery:{query}")

    def embed_documents(self, texts: list[str]) -> list[np.ndarray]:
        return [self._embed(t) for t in texts]

    def close(self) -> None:
        self._llm.close()
