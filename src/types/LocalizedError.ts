export type LocalizedError =
  | string // Can be a direct translation key
  | { key: string; params?: Record<string, string | number | undefined> } // Or an object with key and params
  | null;
