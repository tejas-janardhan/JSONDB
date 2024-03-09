import * as fs from 'fs'
import sizeof from 'object-sizeof'
import { Document, HttpError, Index } from '../constants'
import {
    objfromJsonPath,
    objfromJsonPathSync,
    writeObjToJson,
    writeObjToJsonSync,
} from '../utils'

import { LRUCache } from 'lru-cache'

const MAX_CHUNK_SIZE = 41943040 // 40 mb
const CHUNK_CACHE_LIMIT = 4
const INDEX_CACHE_LIMIT = 4

// Change to Map or a faster node js hash map implementation.
// backup support and restore..
// add compression snappy.
// improve the size logic its broken, use buffers.
// support for collection schema.. (unique)
class Collection {
    // Notes : chunkInfo has a list of all chunks.
    metaData: {
        count: number
        chunkInfo: Record<string, { size: number }>
        collectionName: string
        index: string[]
    }
    dataDirPath: string
    idChunkMap: Record<string, string>
    writes:
        | Record<
              string,
              { insert?: Document[]; replace?: Document[]; delete?: string[] }
          >
        | undefined
    chunkCache: LRUCache<string, Record<string, Document>>
    indexCache: LRUCache<string, Index>

    private getSize(document: Document) {
        return sizeof(document) + sizeof(document.id)
    }

    private loadInitData() {
        // In constructor.
        this.metaData = objfromJsonPathSync(
            this.getDirPath() + '/metaData.json',
        )
        if (this.metaData.count !== 0) {
            this.idChunkMap = objfromJsonPathSync(
                this.getDirPath() + '/idChunkMap.json',
            )
        } else {
            this.idChunkMap = {}
        }
    }

    private createCollectionDir() {
        // In constructor.
        fs.mkdirSync(this.getDirPath())
        this.idChunkMap = {}
        writeObjToJsonSync(this.metaData, this.getDirPath() + '/metaData.json')
        writeObjToJsonSync(
            this.idChunkMap,
            this.getDirPath() + '/idChunkMap.json',
        )
    }

    private getDirPath() {
        return this.dataDirPath + `/${this.metaData.collectionName}`
    }

    private numChunks() {
        return Object.keys(this.metaData.chunkInfo).length
    }

    private async getChunk(chunkKey: string) {
        if (!this.chunkCache.has(chunkKey)) {
            try {
                this.chunkCache.set(
                    chunkKey,
                    await objfromJsonPath(
                        this.getDirPath() + `/${chunkKey}.json`,
                    ),
                )
            } catch {
                this.chunkCache.set(chunkKey, {})
            }
        }
        return { ...this.chunkCache.get(chunkKey)! }
    }

    private verifyChunks() {
        return (
            fs.readdirSync(this.getDirPath()).length - 2 ===
            Object.keys(this.metaData.chunkInfo).length
        )
    }

    private getInsertChunkKey(docSize: number) {
        if (!this.numChunks()) return 'chunk1'
        const [chosenKey, _] = Object.entries(this.metaData.chunkInfo).reduce(
            ([chosenKey, minSize], [chunkKey, { size }]) => {
                if (size + docSize < minSize && size + docSize < MAX_CHUNK_SIZE)
                    return [chunkKey, size]
                return [chosenKey, minSize]
            },
            [undefined, MAX_CHUNK_SIZE] as [string | undefined, number],
        )
        if (chosenKey) return chosenKey
        return `chunk${this.numChunks() + 1}`
    }

    constructor(collectionName: string, dataDirPath: string) {
        this.metaData = {
            count: 0,
            chunkInfo: {},
            collectionName: collectionName,
            index: [],
        }
        this.dataDirPath = dataDirPath
        if (fs.existsSync(this.getDirPath())) {
            try {
                this.loadInitData()
            } catch {
                throw new Error('Files corrupted please restore or reset .')
            }

            if (!this.verifyChunks())
                throw new Error('Files corrupted please restore or reset .')
        } else {
            this.createCollectionDir()
        }
        this.chunkCache = new LRUCache({ max: CHUNK_CACHE_LIMIT })
        this.indexCache = new LRUCache({ max: INDEX_CACHE_LIMIT })
    }

    public async getById(id: string) {
        const chunkKey = this.idChunkMap[id]
        if (!chunkKey) return
        const chunk = await this.getChunk(chunkKey)
        return chunk[id]
    }

    public checkIndex(field: string) {
        return this.metaData.index.includes(field)
    }

    private async updateIndex(
        field: string,
        addValueIdsMap: Record<any, string[]>,
        removeValueIdsMap: Record<any, string[]>,
    ) {
        const index: Index = await objfromJsonPath(
            this.getDirPath() + `/${field}Index.json`,
        )
        Object.entries(addValueIdsMap).map(([value, ids]) => {
            if (index[value]) {
                index[value].concat(ids)
            } else {
                index[value] = ids
            }
        })
        Object.entries(removeValueIdsMap).map(([value, ids]) => {
            index[value] = index[value].filter((id) => !ids.includes(id))
        })
        writeObjToJson(index, this.getDirPath() + `/${field}Index.json`)
    }

    public async getIdsByIndex(field: string, value: any) {
        if (!this.indexCache.has(field)) {
            try {
                this.indexCache.set(
                    field,
                    await objfromJsonPath(
                        this.getDirPath() + `/${field}Index.json`,
                    ),
                )
            } catch (err) {
                throw Error(`Cannot find Index for ${field}.`)
            }
        }

        return this.indexCache.get(field)![value] ?? []
    }

    private async *iterator() {
        // iterates over the entire collection.
        const chunkKeys = Object.keys(this.metaData.chunkInfo)

        for (const chunkKey of chunkKeys) {
            const chunk = await this.getChunk(chunkKey)
            for (const document of Object.values(chunk)) {
                yield document
            }
        }
    }

    // Very Slow.
    public async filter(
        filterFunc: (document: Document) => boolean,
        getOne: boolean,
    ): Promise<Document[]> {
        const foundDocs: Document[] = []
        for await (const document of this.iterator()) {
            if (filterFunc(document)) {
                if (getOne) {
                    return [document]
                } else {
                    foundDocs.push(document)
                }
            }
        }
        return foundDocs
    }

    private addToWrite(
        data: Document | string,
        chunkKey: string,
        type: 'insert' | 'delete' | 'replace',
    ) {
        if (type === 'delete' && typeof data !== 'string')
            throw Error('Delete op needs data of type string')

        if (this.writes) {
            if (this.writes[chunkKey] && this.writes[chunkKey][type]) {
                // @ts-ignore Added due to if guard above,
                this.writes[chunkKey][type]!.push(data)
            } else if (this.writes[chunkKey]) {
                // @ts-ignore
                this.writes[chunkKey][type] = [data]
            } else {
                this.writes[chunkKey] = { [type]: [data] }
            }
        } else {
            this.writes = { [chunkKey]: { [type]: [data] } }
        }
    }

    public addTemp(document: Document) {
        const id = document.id
        if (!id) {
            throw Error('Id must exist in document')
        }
        const chunkKey = this.getInsertChunkKey(this.getSize(document))
        this.addToWrite(document, chunkKey, 'insert')
    }

    public replaceTemp(newDocument: Document) {
        if (!newDocument.id) {
            throw Error('Id must exist in document')
        }
        const chunkKey = this.idChunkMap[newDocument.id]

        this.addToWrite(newDocument, chunkKey, 'insert')
    }

    public deleteTemp(id: string) {
        const chunkKey = this.idChunkMap[id]
        this.addToWrite(id, chunkKey, 'delete')
    }

    public async write() {
        if (this.writes) {
            console.log(this.writes)
            await Promise.all(
                Object.entries(this.writes).map(async ([chunkKey, write]) => {
                    // Investigate if it works
                    const chunk = await this.getChunk(chunkKey)
                    if (write.insert) {
                        write.insert.forEach((document) => {
                            this.idChunkMap[document.id] = chunkKey
                            chunk[document.id] = document
                            this.metaData.count += 1
                            this.metaData.chunkInfo[chunkKey]
                                ? (this.metaData.chunkInfo[chunkKey].size +=
                                      this.getSize(document))
                                : (this.metaData.chunkInfo[chunkKey] = {
                                      size: this.getSize(document),
                                  })
                        })
                    } else if (write.replace) {
                        write.replace.forEach((document) => {
                            this.metaData.chunkInfo[chunkKey].size -=
                                this.getSize(chunk[document.id])
                            chunk[document.id] = document
                            this.metaData.chunkInfo[chunkKey].size +=
                                this.getSize(document)
                        })
                    } else if (write.delete) {
                        write.delete.forEach((id) => {
                            delete this.idChunkMap[id]
                            this.metaData.chunkInfo[chunkKey].size -=
                                this.getSize(chunk[id])
                            delete chunk[id]
                            this.metaData.count -= 1
                        })
                    }

                    this.chunkCache.set(chunkKey, chunk)
                    await writeObjToJson(
                        chunk,
                        this.getDirPath() + `/${chunkKey}.json`,
                    )
                }),
            )
            await writeObjToJson(
                this.metaData,
                this.getDirPath() + '/metaData.json',
            )
            if (
                Object.values(this.writes).some(
                    (write) => write.insert || write.delete,
                )
            ) {
                console.log('HIT')
                await writeObjToJson(
                    this.idChunkMap,
                    this.getDirPath() + '/idChunkMap.json',
                )
            }
            // update Indexes.

            this.writes = undefined
        }
    }

    public async createIndex(field: string) {
        if (this.checkIndex(field)) {
            throw Error('Index already exists')
        }
        const index: Record<any, string[]> = {}
        for await (const document of this.iterator()) {
            index[document[field]]?.push(document.id) ||
                (index[document[field]] = [document.id])
        }
        if (!Object.keys(index).length)
            throw Error('Index cannot be created, documents do not have field.')
        this.metaData.index.push(field)
        await writeObjToJson(index, this.getDirPath() + `/${field}Index.json`)
        await writeObjToJson(this.metaData, this.getDirPath() + 'metaData.json')
    }

    public canWrite() {
        return Boolean(this.writes)
    }

    public totalCount() {
        return this.metaData.count
    }

    public clearCache() {
        this.chunkCache.clear()
    }
}

export default Collection
