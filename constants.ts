// Holds all types and constants.
export type DOCDATA = Record<string, any>;
export type Document = DOCDATA & {
  id: string;
  updatedAt: string;
  createdAt: string;
};
export type Filter = Record<string, any>;
export type CHUNKED_COLLECTION = Record<string, Document>;
export type FilterOptions = {
  getOne?: boolean;
};
