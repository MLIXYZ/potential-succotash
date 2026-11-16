import { useEffect, useRef, useState } from "react";
import { sendMessage, ChatError } from "./api.js";
import Message from "./components/Message.jsx";
import Composer from "./components/Composer.jsx";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, error]);

  // Cancel any in-flight request if the page unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleSend(text) {
    setError("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);

    abortRef.current = new AbortController();
    try {
      const data = await sendMessage(text, abortRef.current.signal);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.answer, sources: data.sources ?? [], location: data.location },
      ]);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err instanceof ChatError ? err.message : "Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <span className="header__title">Campus Assistant</span>
      </header>

      <main className="chat">
        {messages.length === 0 && (
          <div className="empty">
            <h1>Ask anything about SFSU</h1>
            <p>Deadlines, buildings, advising, financial aid, and more.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <Message key={i} message={m} />
        ))}

        {loading && (
          <div className="bubble bubble--assistant typing" role="status" aria-label="Assistant is typing">
            <span /><span /><span />
          </div>
        )}

        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <Composer onSend={handleSend} disabled={loading} />
    </div>
  );
}
