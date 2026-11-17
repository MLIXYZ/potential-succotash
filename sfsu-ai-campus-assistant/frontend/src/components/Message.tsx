import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import MapCard from "./MapCard";
import type { ChatMessage } from "../types";

// Only link http(s) URLs: sources come from scraped data, and a javascript:
// URL in a chip would run script when clicked.
const isWebUrl = (url: string) => /^https?:\/\//i.test(url);

const bubble = {
  px: 2,
  py: 1.5,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
};

export default function Message({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <Paper
        sx={{
          ...bubble,
          alignSelf: "flex-end",
          maxWidth: { xs: "100%", sm: "80%" },
          bgcolor: "primary.main",
          color: "primary.contrastText",
          borderRadius: "16px 16px 4px 16px",
        }}
      >
        {message.text}
      </Paper>
    );
  }

  const sources = (message.sources ?? []).filter((s) => isWebUrl(s.url));

  return (
    <Stack spacing={1.5} sx={{ alignSelf: "flex-start", width: "100%", maxWidth: { sm: "90%" } }}>
      <Paper
        variant="outlined"
        sx={{
          ...bubble,
          alignSelf: "flex-start",
          lineHeight: 1.6,
          borderRadius: "16px 16px 16px 4px",
        }}
      >
        {message.text}
      </Paper>

      {message.location && <MapCard location={message.location} />}

      {sources.length > 0 && (
        <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Sources
          </Typography>
          {sources.map((s) => (
            <Chip
              key={s.url}
              label={s.title}
              component="a"
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              clickable
              size="small"
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
