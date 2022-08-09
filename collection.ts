import * as fs from "fs";
import sizeof from "object-sizeof";
import { Document, Index } from "./constants";
import { objfromJsonPath, writeObjToJson } from "./utils";

const DATA_DIR = __dirname + "/data";
const MAX_CHUNK_SIZE = 41943040; // 40 mb
const CHUNK_CACHE_LIMIT = 4;

// Change to Map or a faster node js hash map implementation.
// backup support and restore.
// make read and write non blocking except those in constructor.
// add compression snappy.
class Collection {
  // Notes : chunkInfo has a list of all chunks.
  metaData: {
    count: number;
    chunkInfo: Record<string, { size: number }>;
    collectionName: string;
    index: string[];
  };
  idChunkMap: Record<string, string>;
  writes:
    | Record<
        string,
        { insert?: Document[]; replace?: Document[]; delete?: string[] }
      >
    | undefined;
  chunkCache: Record<
    string,
    { chunk: Record<string, Document>; lastUsed: Date }
  >;

  private getSize(document: Document) {
    return sizeof(document) + sizeof(document.id);
  }

  private loadInitData() {
    this.metaData = objfromJsonPath(this.getDirPath() + "/metaData.json");
    if (this.metaData.count !== 0) {
      this.idChunkMap = objfromJsonPath(this.getDirPath() + "/idChunkMap.json");
    } else {
      this.idChunkMap = {};
    }
    this.chunkCache = {};
  }

  private createCollectionDir() {
    fs.mkdirSync(this.getDirPath());
    this.idChunkMap = {};
    this.chunkCache = {};
    writeObjToJson(this.metaData, this.getDirPath() + "/metaData.json");
    writeObjToJson(this.idChunkMap, this.getDirPath() + "/idChunkMap.json");
  }

  private getDirPath() {
    return DATA_DIR + `/${this.metaData.collectionName}`;
  }

  private numChunks() {
    return Object.keys(this.metaData.chunkInfo).length;
  }

  private getChunk(chunkKey: string) {
    if (this.chunkCache[chunkKey]) {
      this.chunkCache[chunkKey].lastUsed = new Date();
    } else {
      // cleanup
      if (Object.keys(this.chunkCache).length === CHUNK_CACHE_LIMIT) {
        const [[toDeleteKey, _]] = Object.entries(this.chunkCache).sort(
          ([_, chunkDataA], [__, chunkDataB]) => {
            if (chunkDataA.lastUsed < chunkDataB.lastUsed) return -1;
            if (chunkDataA.lastUsed > chunkDataB.lastUsed) return 1;
            return 0;
          }
        );
        delete this.chunkCache[toDeleteKey];
      }
      try {
        this.chunkCache[chunkKey] = {
          chunk: objfromJsonPath(this.getDirPath() + `/${chunkKey}.json`),
          lastUsed: new Date(),
        };
      } catch {
        this.chunkCache[chunkKey] = { chunk: {}, lastUsed: new Date() };
      }
    }
    return this.chunkCache[chunkKey].chunk;
  }

  private verifyChunks() {
    return (
      fs.readdirSync(this.getDirPath()).length - 2 ===
      Object.keys(this.metaData.chunkInfo).length
    );
  }

  private getInsertChunkKey(docSize: number) {
    if (!this.numChunks()) return "chunk1";
    const [chosenKey, _] = Object.entries(this.metaData.chunkInfo).reduce(
      ([chosenKey, minSize], [chunkKey, { size }]) => {
        if (size + docSize < minSize && size + docSize < MAX_CHUNK_SIZE)
          return [chunkKey, size];
        return [chosenKey, minSize];
      },
      [undefined, MAX_CHUNK_SIZE] as [string | undefined, number]
    );
    if (chosenKey) return chosenKey;
    return `chunk${this.numChunks() + 1}`;
  }

  constructor(collectionName: string) {
    this.metaData = {
      count: 0,
      chunkInfo: {},
      collectionName: collectionName,
      index: [],
    };
    if (fs.existsSync(this.getDirPath())) {
      try {
        this.loadInitData();
      } catch {
        throw new Error("Files corrupted please restore or reset .");
      }

      if (!this.verifyChunks())
        throw new Error("Files corrupted please restore or reset .");
    } else {
      this.createCollectionDir();
    }
  }

  public getById(id: string) {
    const chunkKey = this.idChunkMap[id];
    const chunk = this.getChunk(chunkKey);
    return chunk[id];
  }

  public checkIndex(field: string) {
    return this.metaData.index.includes(field);
  }

  private updateIndex(
    field: string,
    addValueIdsMap: Record<any, string[]>,
    removeValueIdsMap: Record<any, string[]>
  ) {
    const index: Index = objfromJsonPath(
      this.getDirPath() + `/${field}Index.json`
    );
    Object.entries(addValueIdsMap).map(([value, ids]) => {
      if (index[value]) {
        index[value].concat(ids);
      } else {
        index[value] = ids;
      }
    });
    Object.entries(removeValueIdsMap).map(([value, ids]) => {
      index[value] = index[value].filter((id) => !ids.includes(id));
    });
    writeObjToJson(index, this.getDirPath() + `/${field}Index.json`);
  }

  public getIdsByIndex(field: string, value: any) {
    // add index cache with node cache.
    const index: Index = objfromJsonPath(
      this.getDirPath() + `/${field}Index.json`
    );

    return index[value] ?? [];
  }

  private *iterator() {
    // iterates over the entire collection.
    const chunkKeys = Object.keys(this.metaData.chunkInfo);

    for (const chunkKey of chunkKeys) {
      const chunk = this.getChunk(chunkKey);
      for (const document of Object.values(chunk)) {
        yield document;
      }
    }
  }

  // Very Slow.
  public filter(
    filterFunc: (document: Document) => boolean,
    getOne: boolean
  ): Document[] {
    const foundDocs: Document[] = [];
    for (const document of this.iterator()) {
      if (filterFunc(document)) {
        if (getOne) {
          return [document];
        } else {
          foundDocs.push(document);
        }
      }
    }
    return foundDocs;
  }

  private addToWrite(
    data: Document | string,
    chunkKey: string,
    type: "insert" | "delete" | "replace"
  ) {
    if (type === "delete" && typeof data !== "string")
      throw Error("Delete op needs data of type string");

    if (this.writes) {
      if (this.writes[chunkKey] && this.writes[chunkKey][type]) {
        // @ts-ignore Added due to if gaurd above,
        this.writes[chunkKey][type]!.push(data);
      } else if (this.writes[chunkKey]) {
        // @ts-ignore
        this.writes[chunkKey][type] = [data];
      } else {
        this.writes[chunkKey] = { [type]: [data] };
      }
    } else {
      this.writes = { [chunkKey]: { [type]: [document] } };
    }
  }

  public addTemp(document: Document) {
    const id = document.id;
    if (!id) {
      throw Error("Id must exist in document");
    }
    const chunkKey = this.getInsertChunkKey(this.getSize(document));
    this.addToWrite(document, chunkKey, "insert");
  }

  public replaceTemp(newDocument: Document) {
    if (!newDocument.id) {
      throw Error("Id must exist in document");
    }
    const chunkKey = this.idChunkMap[newDocument.id];

    this.addToWrite(newDocument, chunkKey, "insert");
  }

  public deleteTemp(id: string) {
    const chunkKey = this.idChunkMap[id];

    this.addToWrite(id, chunkKey, "delete");
  }

  public write() {
    if (this.writes) {
      Object.entries(this.writes).forEach(([chunkKey, write]) => {
        const chunk = this.getChunk(chunkKey);
        if (write.insert) {
          write.insert.forEach((document) => {
            this.idChunkMap[document.id] = chunkKey;
            chunk[document.id] = document;
            this.metaData.count += 1;
            this.metaData.chunkInfo[chunkKey]
              ? (this.metaData.chunkInfo[chunkKey].size +=
                  this.getSize(document))
              : (this.metaData.chunkInfo[chunkKey] = {
                  size: this.getSize(document),
                });
          });
        } else if (write.replace) {
          write.replace.forEach((document) => {
            this.metaData.chunkInfo[chunkKey].size -= this.getSize(
              chunk[document.id]
            );
            chunk[document.id] = document;
            this.metaData.chunkInfo[chunkKey].size += this.getSize(document);
          });
        } else if (write.delete) {
          write.delete.forEach((id) => {
            delete this.idChunkMap[id];
            this.metaData.chunkInfo[chunkKey].size -= this.getSize(chunk[id]);
            delete chunk[id];
            this.metaData.count -= 1;
          });
        }

        writeObjToJson(chunk, this.getDirPath() + `/${chunkKey}.json`);
      });
      writeObjToJson(this.metaData, this.getDirPath() + "/metaData.json");
      if (
        Object.values(this.writes).some((write) => write.insert || write.delete)
      ) {
        writeObjToJson(this.idChunkMap, this.getDirPath() + "/idChunkMap.json");
      }

      // update Indexes.

      this.writes = undefined;
    }
  }

  public createIndex(field: string) {
    if (this.checkIndex(field)) {
      throw Error("Index already exists");
    }
    const index: Record<any, string[]> = {};
    for (const document of this.iterator()) {
      index[document[field]]?.push(document.id) ||
        (index[document[field]] = [document.id]);
    }
    if (!Object.keys(index).length)
      throw Error("Index cannot be created, documents do not have field.");
    this.metaData.index.push(field);
    writeObjToJson(index, this.getDirPath() + `/${field}Index.json`);
    writeObjToJson(this.metaData, this.getDirPath() + "metaData.json");
  }

  public canWrite() {
    return Boolean(this.writes);
  }

  public totalCount() {
    return this.metaData.count;
  }

  public clearCache() {
    this.chunkCache = {};
  }
}

export default Collection;
