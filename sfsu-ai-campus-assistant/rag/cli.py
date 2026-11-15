from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

from .config import Settings
from .embedder import Embedder
from .pipeline import RAG
from .store import check_db

TEXT_SUFFIXES = {".txt", ".md", ".markdown", ".rst"}


def _iter_files(paths: list[str]):
    for p in map(Path, paths):
        if p.is_dir():
            yield from sorted(f for f in p.rglob("*") if f.suffix.lower() in TEXT_SUFFIXES)
        else:
            yield p


def main() -> None:
    parser = argparse.ArgumentParser(prog="rag")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init-db", help="create pgvector extension + rag_ tables")
    sub.add_parser("check-db", help="verify connection, pgvector, schema and privileges")
    sub.add_parser("warmup", help="download/load the embedding model and embed a test string")
    ingest = sub.add_parser("ingest", help="ingest .txt/.md files or directories")
    ingest.add_argument("paths", nargs="+")
    ingest.add_argument("--source", help="single file only: source to store, e.g. the page URL")
    ingest.add_argument("--title", help="single file only: display title")
    ingest.add_argument("--force", action="store_true", help="re-embed even if unchanged")
    search = sub.add_parser("search", help="test retrieval")
    search.add_argument("question")
    search.add_argument("-k", type=int, default=5)
    embed = sub.add_parser("embed-missing", help="fill NULL embeddings (e.g. after a SQL seed)")
    embed.add_argument("--batch", type=int, default=32)
    delete = sub.add_parser("delete", help="remove a document by source")
    delete.add_argument("source")
    args = parser.parse_args()
    load_dotenv(find_dotenv(usecwd=True))

    if args.cmd == "ingest" and (args.source or args.title):
        files = list(_iter_files(args.paths))
        if len(files) != 1:
            parser.error("--source/--title need exactly one file")

    if args.cmd == "init-db":
        RAG.init_db(Settings.from_env())
        print("schema ready")
        return

    if args.cmd == "check-db":
        settings = Settings.from_env()
        ok, warnings, problems = check_db(
            settings.database_url, settings.embed_dim, settings.db_schema
        )
        for msg in ok:
            print(f"  OK    {msg}")
        for msg in warnings:
            print(f"  WARN  {msg}")
        for msg in problems:
            print(f"  FAIL  {msg}")
        print("DB ready" if not problems else "DB NOT ready (see rag/README.md)")
        sys.exit(1 if problems else 0)

    if args.cmd == "warmup":
        settings = Settings.from_env()
        start = time.perf_counter()
        embedder = Embedder(settings)
        loaded = time.perf_counter()
        vec = embedder.embed_query("Where is the library?")
        done = time.perf_counter()
        embedder.close()
        print(f"model loaded in {loaded - start:.1f}s, query embedded in "
              f"{(done - loaded) * 1000:.0f}ms, dim={len(vec)}")
        return

    rag = RAG.from_env()
    try:
        if args.cmd == "ingest":
            meta = {"title": args.title} if args.title else None
            for f in _iter_files(args.paths):
                n = rag.ingest_file(f, source=args.source, metadata=meta, force=args.force)
                print(f"{f}: " + ("unchanged, skipped" if n is None else f"{n} chunks"))
        elif args.cmd == "search":
            for c in rag.retrieve(args.question, args.k):
                preview = c.text[:200].replace("\n", " | ")
                print(f"[{c.score:.3f}] {c.title} <{c.url}>: {preview}")
        elif args.cmd == "embed-missing":
            start = time.perf_counter()

            def progress(done: int, total: int) -> None:
                rate = done / max(time.perf_counter() - start, 1e-6)
                print(f"\r  {done}/{total} chunks embedded ({rate:.1f}/s)", end="", flush=True)

            n = rag.embed_missing(args.batch, progress)
            print(f"\n{n} chunks embedded" if n else "nothing to embed")
        elif args.cmd == "delete":
            print("deleted" if rag.delete(args.source) else "not found")
    finally:
        rag.close()


if __name__ == "__main__":
    main()
