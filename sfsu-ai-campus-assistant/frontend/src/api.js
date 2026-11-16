// Single place that talks to the backend, so a contract change touches one file.
//
// Backend contract (backend/app/main.py):
//   POST /api/chat  { message }  ->  { answer, sources: [{ title, url }] }
// `location` is optional and not sent by the backend yet; MapCard renders only
// when it is present, so adding it server-side later needs no frontend change.

export class ChatError extends Error {}

export async function sendMessage(message, signal) {
  let res;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal,
    });
  } catch (err) {
    // An abort is a deliberate cancel, not a failure the user should see.
    if (err.name === "AbortError") throw err;
    throw new ChatError("Can't reach the assistant. Check your connection and try again.");
  }

  if (!res.ok) {
    // The backend returns 502 when retrieval or Claude fails, 422 for bad input.
    throw new ChatError(
      res.status === 502
        ? "The assistant is temporarily unavailable. Please try again in a moment."
        : "Something went wrong with that question. Please try again."
    );
  }
  return res.json();
}
