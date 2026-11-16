import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The backend's CORS list only allows http://localhost:5173 and 127.0.0.1:5173,
// so the dev server stays on that exact port. strictPort makes Vite fail loudly
// instead of silently hopping to 5174, which the backend would then reject.
// The proxy lets the app call a relative "/api/..." URL, so it works the same
// in dev and in production behind one domain, with no CORS involved at all.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
});
