import * as fs from 'fs'
import Collection from './collection'
import {
    DocData,
    Document,
    Filter,
    FilterOptions,
    Projection,
} from '../constants'
import { generateId } from '../utils'
import { LRUCache } from 'lru-cache'
import { isObjectEmpty } from '../utils'

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
            throw Error('Empty filter.')
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
            ).filter((document) => Boolean(document))
        }

        const docFilterFunc = (document: Document): boolean => {
            return Object.entries(filterRest).every(([field, value]) => {
                return document[field] === value
            })
        }

        if (!filterId && filterRest) {
            foundDocs = await collection.filter(docFilterFunc, getOne)
        } else if (filterRest) {
            return foundDocs.filter(docFilterFunc)
        }
        return foundDocs
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

    public async filter(
        collectionName: string,
        filter: Filter,
        projection: Projection | undefined = undefined,
    ): Promise<Document[]> {
        this.validateFilter(filter)
        const collection = this.getCollection(collectionName)
        const documents = await this.internalFilter(filter, collection)

        if (projection) {
            const projectionMap = projection.reduce(
                (map, field) => {
                    map[field] = 1
                    return map
                },
                {} as Record<string, 1>,
            )
            projectionMap['id'] = 1
            projectionMap['updatedAt'] = 1
            projectionMap['createdAt'] = 1
            // iterate over projection not the document
            return documents.map((document) => {
                Object.keys(document).forEach((field) => {
                    if (!projectionMap[field]) delete document[field]
                })
                return document
            })
        } else {
            return documents
        }
    }

    public async update(
        collectionName: string,
        filter: Filter,
        updateData: DocData,
    ) {
        this.validateFilter(filter)
        const collection = this.getCollection(collectionName)
        const foundDocs = await this.internalFilter(filter, collection)

        if (!foundDocs.length) throw Error('Cannot find any elements to update')

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

        if (!foundDocs.length) throw Error('Cannot find any elements to delete')

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

        if (!foundDoc) throw Error('Cannot find any element to update')
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

        if (!foundDoc) throw Error('Cannot find any element to delete')
        collection.deleteTemp(foundDoc.id)
        await collection.write()
    }

    public createIndex(collectionName: string, field: string) {
        const collection = this.getCollection(collectionName)
        collection.createIndex(field)
    }
}

export default Engine