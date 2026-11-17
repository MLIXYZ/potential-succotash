// Single place that talks to the backend, so a contract change touches one file.
// The request/response shapes live in types.ts.
import type { ChatResponse } from "./types";

export class ChatError extends Error {}

// An abort is a deliberate cancel, not a failure the user should see.
export function isAbort(err: unknown): boolean {
  return (err as { name?: unknown } | null)?.name === "AbortError";
}

export async function sendMessage(message: string, signal?: AbortSignal): Promise<ChatResponse> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal,
    });
  } catch (err) {
    if (isAbort(err)) throw err;
    throw new ChatError("Can't reach the assistant. Check your connection and try again.");
  }

  if (!res.ok) {
    // The backend returns 502 when retrieval or Claude fails, 422 for bad input.
    throw new ChatError(
      res.status === 502
        ? "The assistant is temporarily unavailable. Please try again in a moment."
        : "Something went wrong with that question. Please try again.",
    );
  }
  return (await res.json()) as ChatResponse;
}
