/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_TOKEN?: string;
  readonly VITE_AUTH_TOKEN_REQUIRED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
