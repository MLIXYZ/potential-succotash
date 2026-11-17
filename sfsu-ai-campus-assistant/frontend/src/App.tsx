import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";
import { sendMessage, ChatError, isAbort } from "./api";
import Message from "./components/Message";
import Composer from "./components/Composer";
import type { ChatMessage } from "./types";

const pulse = keyframes`
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
`;

// Three pulsing dots while waiting for the answer.
function TypingIndicator() {
  return (
    <Paper
      variant="outlined"
      role="status"
      aria-label="Assistant is typing"
      sx={{
        alignSelf: "flex-start",
        display: "inline-flex",
        gap: "5px",
        p: 2,
        borderRadius: "16px 16px 16px 4px",
      }}
    >
      {[0, 0.15, 0.3].map((delay) => (
        <Box
          key={delay}
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "divider",
            animation: `${pulse} 1.2s infinite ease-in-out`,
            animationDelay: `${delay}s`,
            "@media (prefers-reduced-motion: reduce)": { animation: "none", opacity: 0.6 },
          }}
        />
      ))}
    </Paper>
  );
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, error]);

  // Cancel any in-flight request if the page unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleSend(text: string) {
    setError("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);

    abortRef.current = new AbortController();
    try {
      const data = await sendMessage(text, abortRef.current.signal);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: data.answer,
          sources: data.sources ?? [],
          location: data.location,
        },
      ]);
    } catch (err) {
      if (isAbort(err)) return;
      setError(err instanceof ChatError ? err.message : "Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" sx={{ borderBottom: 4, borderColor: "secondary.main" }}>
        <Toolbar>
          <Typography component="span" sx={{ fontSize: 18, fontWeight: 600 }}>
            Campus Assistant
          </Typography>
        </Toolbar>
      </AppBar>

      <Container
        component="main"
        maxWidth="md"
        sx={{ flex: "1 1 auto", py: { xs: 2.5, sm: 4 }, px: { xs: 2, sm: 3 } }}
      >
        <Stack spacing={3.5}>
          {messages.length === 0 && (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography variant="h1" color="primary" gutterBottom>
                Ask anything about SFSU
              </Typography>
              <Typography color="text.secondary">
                Deadlines, buildings, advising, financial aid, and more.
              </Typography>
            </Box>
          )}

          {messages.map((m, i) => (
            <Message key={i} message={m} />
          ))}

          {loading && <TypingIndicator />}

          {error && (
            <Alert severity="error" variant="outlined" sx={{ alignSelf: "flex-start" }}>
              {error}
            </Alert>
          )}
          <div ref={bottomRef} />
        </Stack>
      </Container>

      <Composer onSend={handleSend} disabled={loading} />
    </Box>
  );
}
