declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module '*.css' {
  const content: void;
  export default content;
}

interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly ENV: string;

  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
