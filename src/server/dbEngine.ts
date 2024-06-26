import * as fs from 'fs'
import Collection from './collection'
import {
    DocData,
    Document,
    Filter,
    FilterOptions,
    HttpError,
    Populate,
    Projection,
    UNIQUE_FORIEGN_FIELD_OBJ,
} from '../constants'
import { generateId } from '../utils'
import { LRUCache } from 'lru-cache'
import { isObjectEmpty } from '../utils'
import equal from 'deep-equal'

// add single index support.
// add batch writes support
// concurrent request support. Fix mutation bugs for this too.
class Engine {
    collectionCache: LRUCache<string, Collection>
    dataDirPath: string

    private getCollection(collectionName: string): Collection {
        if (!this.collectionCache.has(collectionName)) {
            this.collectionCache.set(
                collectionName,
                new Collection(collectionName, this.dataDirPath),
            )
        }
        return this.collectionCache.get(collectionName)!
    }

    private validateFilter(filter: Filter): void {
        if (isObjectEmpty(filter)) {
            throw new HttpError({ code: 400, message: 'Filter not found!' })
        }
    }

    private async internalFilter(
        filter: Filter,
        collection: Collection,
        filterOptions: FilterOptions = {},
    ): Promise<Document[]> {
        let foundDocs: Document[] = []
        const getOne = Boolean(filterOptions.getOne)

        const { id: filterId, ...filterRest } = filter

        if (filterId) {
            const ids = Array.isArray(filterId) ? filterId : [filterId]
            if (getOne) {
                for (const id of ids) {
                    const document = await collection.getById(id)
                    if (document) return [document]
                }
                return []
            }

            foundDocs = (
                await Promise.all(ids.map((id) => collection.getById(id)))
            ).filter((document) => Boolean(document)) as Document[]
        }

        const docFilterFunc = (document: Document): boolean => {
            // Add deep equal instead from a fast lib
            return Object.entries(filterRest).every(([field, value]) => {
                if (
                    '_jsondb_i9i_' in document[field] &&
                    document[field]._jsondb_i9i_ ===
                        UNIQUE_FORIEGN_FIELD_OBJ._jsondb_i9i_
                ) {
                    if (Array.isArray(value)) {
                        return value.includes(document[field].id)
                    } else {
                        return value === document[field].id
                    }
                }
                return equal(document[field], value)
            })
        }

        if (!filterId && filterRest) {
            foundDocs = await collection.filter(docFilterFunc, getOne)
        } else if (filterRest) {
            return foundDocs.filter(docFilterFunc)
        }
        return foundDocs
    }

    private project(documents: Document[], projection: Projection): DocData[] {
        return documents.map((document) =>
            projection.reduce<DocData>((doc, key) => {
                return { ...doc, key: document[key] }
            }, {}),
        )
    }

    private async populate(
        documents: Document[],
        populate: Populate,
    ): Promise<DocData[]> {
        return await Promise.all(
            documents.map(async (document) => {
                return Object.fromEntries(
                    await Promise.all(
                        Object.entries(document).map(async ([key, value]) => {
                            if (
                                populate.includes(key) &&
                                '_jsondb_i9i_' in value &&
                                value._jsondb_i9i_ ===
                                    UNIQUE_FORIEGN_FIELD_OBJ._jsondb_i9i_
                            ) {
                                value.populatedDoc = await this.internalFilter(
                                    { id: value.id },
                                    value.collectionName,
                                    { getOne: true },
                                )
                                return [key, value]
                            }
                            return [key, value]
                        }),
                    ),
                )
            }),
        )
    }

    constructor(dataDirPath: string | undefined = undefined) {
        this.collectionCache = new LRUCache<string, Collection>({ max: 5 })
        this.dataDirPath = dataDirPath ?? './data'
        if (!fs.existsSync(this.dataDirPath)) {
            fs.mkdirSync(this.dataDirPath)
        }
    }

    public count(collectionName: string) {
        const collection = this.getCollection(collectionName)
        return collection.totalCount()
    }

    public async insert(
        collectionName: string,
        newdocs: DocData[],
    ): Promise<string[]> {
        const collection = this.getCollection(collectionName)
        const insertedIds: string[] = []
        newdocs.forEach((newDoc) => {
            const id = generateId()
            insertedIds.push(id)
            collection.addTemp({
                ...newDoc,
                id,
                updatedAt: new Date().toJSON(),
                createdAt: new Date().toJSON(),
            })
        })
        await collection.write()
        return insertedIds
    }

    public async all(
        collectionName: string,
        projection: Projection | undefined = undefined,
    ): Promise<Document[] | DocData[]> {
        const collection = this.getCollection(collectionName)
        const documents = await collection.all()
        if (projection) {
            return this.project(documents, projection)
        } else {
            return documents
        }
    }

    public async filter(
        collectionName: string,
        filter: Filter,
        projection: Projection | undefined = undefined,
        populate: Populate | undefined = undefined,
    ): Promise<Document[] | DocData[]> {
        this.validateFilter(filter)
        const collection = this.getCollection(collectionName)
        let documents: Document[] | DocData[] = await this.internalFilter(
            filter,
            collection,
        )

        if (projection) {
            documents = this.project(documents as Document[], projection)
        }

        if (populate) {
            documents = await this.populate(documents as Document[], populate)
        }

        return documents
    }

    public async filterOne(
        collectionName: string,
        filter: Filter,
        projection: Projection | undefined = undefined,
        populate: Populate | undefined = undefined,
    ): Promise<Document | DocData> {
        this.validateFilter(filter)
        const collection = this.getCollection(collectionName)
        let documents: Document[] | DocData[] = await this.internalFilter(
            filter,
            collection,
            {
                getOne: true,
            },
        )
        if (projection) {
            documents = this.project(documents as Document[], projection)
        }

        if (populate) {
            documents = await this.populate(documents as Document[], populate)
        }

        return documents[0]
    }

    public async update(
        collectionName: string,
        filter: Filter,
        updateData: DocData,
    ) {
        this.validateFilter(filter)
        const collection = this.getCollection(collectionName)
        const foundDocs = await this.internalFilter(filter, collection)

        if (!foundDocs.length)
            throw new HttpError({
                code: 400,
                message: 'Cannot find any elements to update',
            })

        foundDocs.forEach((document) => {
            collection.replaceTemp({
                ...document,
                ...updateData,
                updatedAt: new Date().toJSON(),
            })
        })

        await collection.write()
    }

    public async delete(collectionName: string, filter: Filter) {
        this.validateFilter(filter)
        const collection = this.getCollection(collectionName)
        const foundDocs = await this.internalFilter(filter, collection)

        if (!foundDocs.length)
            throw new HttpError({
                code: 400,
                message: 'Cannot find any elements to delete',
            })

        foundDocs.forEach((document) => {
            collection.deleteTemp(document.id)
        })
        await collection.write()
    }

    public async updateOne(
        collectionName: string,
        filter: Filter,
        updateData: DocData,
    ) {
        this.validateFilter(filter)
        const collection = this.getCollection(collectionName)
        const [foundDoc] = await this.internalFilter(filter, collection, {
            getOne: true,
        })

        if (!foundDoc)
            throw new HttpError({
                code: 400,
                message: 'Cannot find any element to update',
            })
        collection.replaceTemp({
            ...foundDoc,
            ...updateData,
            updatedAt: new Date().toJSON(),
        })
        await collection.write()
    }

    public async deleteOne(collectionName: string, filter: Filter) {
        this.validateFilter(filter)
        const collection = this.getCollection(collectionName)
        const [foundDoc] = await this.internalFilter(filter, collection, {
            getOne: true,
        })

        if (!foundDoc)
            throw new HttpError({
                code: 400,
                message: 'Cannot find any element to delete',
            })
        collection.deleteTemp(foundDoc.id)
        await collection.write()
    }

    public createIndex(collectionName: string, field: string) {
        const collection = this.getCollection(collectionName)
        collection.createIndex(field)
    }
}

export default Engine
