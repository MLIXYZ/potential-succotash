import os
import httpx


async def retrieve_documents(question: str):
    # Temporary mock data for development
    if os.getenv("USE_MOCK_RAG", "true").lower() == "true":
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

    # Real RAG integration (when Mark finishes)
    rag_url = os.environ["RAG_SERVICE_URL"].rstrip("/")

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            f"{rag_url}/retrieve", json={"query": question, "top_k": 5}
        )

        response.raise_for_status()

        data = response.json()
        return data["results"]
