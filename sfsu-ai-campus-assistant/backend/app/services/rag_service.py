import asyncio
import os
import threading

TOP_K = 5

_rag = None
_rag_lock = threading.Lock()


class RetrievalError(Exception):
    pass


def _use_mock() -> bool:
    return os.getenv("USE_MOCK_RAG", "true").lower() == "true"


def init_rag() -> None:
    global _rag
    if _use_mock():
        return
    with _rag_lock:
        if _rag is None:
            from rag import RAG

            _rag = RAG.from_env()


def close_rag() -> None:
    global _rag
    with _rag_lock:
        if _rag is not None:
            _rag.close()
            _rag = None


async def retrieve_documents(question: str):
    # Temporary mock data for development
    if _use_mock():
        if "library" in question.lower():
            return [
                {
                    "title": "J. Paul Leonard Library",
                    "content": (
                        "The official J. Paul Leonard Library website "
                        "is https://library.sfsu.edu/. "
                        "This mock record does not contain hours or directions."
                    ),
                    "source": "https://library.sfsu.edu/",
                }
            ]

        if "semester" in question.lower():
            return [
                {
                    "title": "SFSU Academic Calendar",
                    "content": (
                        "SFSU publishes academic calendars at "
                        "https://academicresources.sfsu.edu/calendars. "
                        "No semester start date is included in this mock."
                    ),
                    "source": "https://academicresources.sfsu.edu/calendars",
                }
            ]

        return []

    try:
        if _rag is None:
            await asyncio.to_thread(init_rag)
        chunks = await asyncio.to_thread(_rag.retrieve, question, TOP_K)
    except Exception as exc:
        raise RetrievalError("RAG retrieval failed") from exc

    return [
        {
            "title": c.title,
            "content": c.text,
            "source": c.url,
        }
        for c in chunks
    ]
