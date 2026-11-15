import logging

import httpx
from anthropic import APIError
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

from app.services.rag_service import retrieve_documents
from app.services.claude_service import generate_answer

logger = logging.getLogger(__name__)

app = FastAPI(title="SFSU AI Campus Assistant API", version="0.1.0")

# Allow the local React frontend to call FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# Define the expected request body
class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


# Chat endpoint
@app.post("/api/chat")
async def chat(request: ChatRequest):
    question = request.message.strip()

    if not question:
        raise HTTPException(status_code=422, detail="Message cannot be empty")

    try:
        # Step 1: Retrieve documents from RAG
        documents = await retrieve_documents(question)

        # Step 2: Generate answer using Claude
        answer = await generate_answer(question, documents)

        # Step 3: Send results to frontend
        return {
            "answer": answer,
            "sources": [
                {"title": doc["title"], "url": doc["source"]} for doc in documents
            ],
        }

    except (httpx.HTTPError, APIError):
        logger.exception("Upstream AI service failure")
        raise HTTPException(
            status_code=502, detail="An AI service is temporarily unavailable"
        )
