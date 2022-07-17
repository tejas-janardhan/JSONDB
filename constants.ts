// Holds all types and constants.
export type DOCUMENT = Record<string, any> & { id: string };
export type FILTER = Record<string, any>;
export type CHUNKED_COLLECTION = Record<string, DOCUMENT>;