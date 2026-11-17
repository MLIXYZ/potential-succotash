/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional. Without a key, location answers show the placeholder map card.
  readonly VITE_GOOGLE_MAPS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
