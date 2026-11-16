import { useState } from "react";

const MAX = 2000; // matches ChatRequest.max_length on the backend

export default function Composer({ onSend, disabled }) {
  const [text, setText] = useState("");

  function submit() {
    const value = text.trim();
    if (!value || disabled) return;
    onSend(value);
    setText("");
  }

  function onKeyDown(e) {
    // Enter sends, Shift+Enter adds a line. isComposing skips the Enter that
    // only confirms an IME candidate (Japanese, Chinese, Korean input), which
    // would otherwise send half-typed text.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <footer className="composer">
      <form
        className="composer__form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="q" className="sr-only">Ask a question</label>
        <textarea
          id="q"
          name="q"
          rows={1}
          maxLength={MAX}
          enterKeyHint="send"
          placeholder="Ask about deadlines, buildings, advising, financial aid..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" aria-label="Send message" disabled={disabled || !text.trim()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5" /><path d="M5 12l7-7 7 7" />
          </svg>
        </button>
      </form>
      <p className="composer__note">
        Answers come from official SFSU pages. Always check the linked source.
      </p>
    </footer>
  );
}
