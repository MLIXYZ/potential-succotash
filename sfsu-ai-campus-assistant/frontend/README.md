# SFSU Campus Assistant: frontend

React + Vite chat UI for the FastAPI backend in `../backend`.

## Run

    # terminal 1: backend (mock mode needs no API key or database)
    cd ../backend && uvicorn app.main:app --port 8000

    # terminal 2: frontend
    npm install
    npm run dev        # http://localhost:5173

The dev server proxies `/api` to `127.0.0.1:8000`. It must stay on port 5173,
because that is the only origin the backend's CORS list allows.

## Checks (same as CI)

    npm test               # Vitest
    npm run lint           # ESLint
    npm run typecheck      # TypeScript
    npm run format:check   # Prettier (npm run format to fix)

In production, CI builds `dist/` and commits it to the `deploy` branch, and
FastAPI serves it from `/`, so the UI and API share one origin.

Optional: copy `.env.example` to `.env` and set `VITE_GOOGLE_MAPS_KEY` to
show a live map when the backend sends a `location`.
