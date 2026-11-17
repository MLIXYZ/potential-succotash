import { useState, type KeyboardEvent } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";

const MAX = 2000; // matches ChatRequest.max_length on the backend

export interface ComposerProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function Composer({ onSend, disabled }: ComposerProps) {
  const [text, setText] = useState("");

  function submit() {
    const value = text.trim();
    if (!value || disabled) return;
    onSend(value);
    setText("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    // Enter sends, Shift+Enter adds a line. isComposing skips the Enter that
    // only confirms an IME candidate (Japanese, Chinese, Korean input), which
    // would otherwise send half-typed text.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <Box
      component="footer"
      sx={{
        position: "sticky",
        bottom: 0,
        bgcolor: "background.paper",
        px: { xs: 2, sm: 3 },
        pt: { xs: 1.5, sm: 2 },
        pb: { xs: 2, sm: 3 },
      }}
    >
      <Paper
        component="form"
        variant="outlined"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        sx={{
          maxWidth: 760,
          mx: "auto",
          p: 1.25,
          display: "flex",
          alignItems: "flex-end",
          gap: 1.25,
          borderRadius: 4,
          borderColor: "primary.light",
          "&:focus-within": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: 1,
          },
        }}
      >
        <TextField
          name="q"
          multiline
          fullWidth
          maxRows={10}
          variant="standard"
          placeholder="Ask about deadlines, buildings, advising, financial aid..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          slotProps={{
            input: { disableUnderline: true, sx: { px: 1, py: 1.25 } },
            htmlInput: { "aria-label": "Ask a question", maxLength: MAX, enterKeyHint: "send" },
          }}
        />
        <IconButton
          type="submit"
          aria-label="Send message"
          disabled={disabled || !text.trim()}
          sx={{
            width: 44,
            height: 44,
            flex: "0 0 auto",
            borderRadius: 3,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            "&:hover": { bgcolor: "primary.dark" },
            "&.Mui-disabled": {
              bgcolor: "primary.main",
              color: "primary.contrastText",
              opacity: 0.45,
            },
          }}
        >
          <ArrowUpwardRounded />
        </IconButton>
      </Paper>
      <Typography
        variant="caption"
        component="p"
        color="text.secondary"
        sx={{ mt: 1.25, textAlign: "center" }}
      >
        Answers come from official SFSU pages. Always check the linked source.
      </Typography>
    </Box>
  );
}
