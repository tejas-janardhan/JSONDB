// Holds all types and constants.
export type DocData = Record<string, any>
export type Document = DocData & {
    id: string
    updatedAt: string
    createdAt: string
}
export type Filter = { id?: string[] | string } & Record<string, any>
export type CHUNKED_COLLECTION = Record<string, Document>
export type FilterOptions = {
    getOne?: boolean
}
export type Projection = Array<string>
export type Index = Record<string, string[]>
export class HttpError extends Error {
    code: number
    constructor({ message, code }: { message: string; code: number }) {
        super(message)
        this.code = code
    }
}
