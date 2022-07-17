import * as fs from "fs";
import sizeof from "object-sizeof";
import { DOCUMENT } from "./constants";
import { objfromJsonPath, writeObjToJson } from "./utils";

const DATA_DIR = __dirname + "/data";
const DEFAULT_COLL_CHUNK = { chunkKey: "", chunk: {} };
const MAX_FILESIZE = 41943040; // 40 mb

// Add support for multiple chunks in memory.
// Change to Map or a faster node js hash map implementation.
class Collection {
  metaData: {
    count: number;
    chunkSize: Record<string, number>;
    collectionName: string;
  };
  idChunkMap: Record<string, string>;
  writes:
    | Record<
        string,
        { insert?: DOCUMENT[]; update?: DOCUMENT[]; delete?: string[] }
      >
    | undefined;
  collectionChunk: { chunkKey: string; chunk: Record<string, DOCUMENT> };

  private getSize(document: DOCUMENT) {
    return sizeof(document) + sizeof(document.id);
  }

  private loadInitData() {
    this.metaData = objfromJsonPath(this.getDirPath() + "/metaData.json");
    if (this.metaData.count !== 0) {
      this.idChunkMap = objfromJsonPath(this.getDirPath() + "/idChunkMap.json");
    } else {
      this.idChunkMap = {};
    }
    this.collectionChunk = DEFAULT_COLL_CHUNK;
  }

  private createCollectionDir() {
    fs.mkdirSync(this.getDirPath());
    this.idChunkMap = {};
    this.collectionChunk = DEFAULT_COLL_CHUNK;
    writeObjToJson(this.metaData, this.getDirPath() + "/metaData.json");
    writeObjToJson(this.idChunkMap, this.getDirPath() + "/idChunkMap.json");
  }

  private getDirPath() {
    return DATA_DIR + `/${this.metaData.collectionName}`;
  }

  private numChunks() {
    return Object.keys(this.metaData.chunkSize).length;
  }

  private loadChunk(chunkKey: string) {
    try {
      this.collectionChunk.chunk = objfromJsonPath(
        this.getDirPath() + `/${chunkKey}.json`
      );
      this.collectionChunk.chunkKey = chunkKey;
    } catch {
      this.collectionChunk = { chunkKey, chunk: {} };
    }
  }

  private getNewChunkKey(docSize: number) {
    if (!this.numChunks()) return "chunk1";
    const [chosenKey, _] = Object.entries(this.metaData.chunkSize).reduce(
      ([chosenKey, minSize], [chunkKey, size]) => {
        if (size + docSize < minSize && size + docSize < MAX_FILESIZE)
          return [chunkKey, size];
        return [chosenKey, minSize];
      },
      [undefined, MAX_FILESIZE] as [string | undefined, number]
    );
    if (chosenKey) return chosenKey;
    return `chunk${this.numChunks() + 1}`;
  }

  constructor(collectionName: string) {
    this.metaData = {
      count: 0,
      chunkSize: {},
      collectionName: collectionName,
    };
    if (fs.existsSync(this.getDirPath())) {
      try {
        this.loadInitData();
      } catch {
        throw Error("Files corrupted please restore or reset .");
      }
    } else {
      this.createCollectionDir();
    }
  }

  public getById(id: string) {
    const chunkKey = this.idChunkMap[id];
    if (this.collectionChunk.chunkKey !== chunkKey) {
      this.loadChunk(chunkKey);
    }
    return this.collectionChunk.chunk[id];
  }

  // Very Slow.
  public filter(filterFunc: (document: DOCUMENT) => boolean) {
    const foundDocs: DOCUMENT[] = [];
    const chunkKeys = Object.keys(this.metaData.chunkSize);
    chunkKeys.forEach((chunkKey) => {
      if (this.collectionChunk.chunkKey !== chunkKey) {
        // Only relevant for the first interation.
        this.loadChunk(chunkKey);
      }
      Object.values(this.collectionChunk.chunk).forEach((document) => {
        if (filterFunc(document)) foundDocs.push(document);
      });
    });

    return foundDocs;
  }

  public addTemp(document: DOCUMENT) {
    const id = document.id;
    if (!id) {
      throw Error("Id must exist in document");
    }
    const chunkKey = this.getNewChunkKey(this.getSize(document));

    if (this.writes) {
      if (this.writes[chunkKey] && this.writes[chunkKey]["insert"]) {
        this.writes[chunkKey]["insert"]!.push(document);
      } else if (this.writes[chunkKey]) {
        this.writes[chunkKey]["insert"] = [document];
      } else {
        this.writes[chunkKey] = { insert: [document] };
      }
    } else {
      this.writes = { [chunkKey]: { insert: [document] } };
    }
  }

  public replaceTemp(newDocument: DOCUMENT) {
    if (newDocument.id) {
      throw Error("Id must exist in document");
    }
    const chunkKey = this.idChunkMap[newDocument.id];

    if (this.writes) {
      if (this.writes[chunkKey] && this.writes[chunkKey]["update"]) {
        this.writes[chunkKey]["update"]!.push(newDocument);
      } else if (this.writes[chunkKey]) {
        this.writes[chunkKey]["update"] = [newDocument];
      } else {
        this.writes[chunkKey] = { update: [newDocument] };
      }
    } else {
      this.writes = { [chunkKey]: { update: [newDocument] } };
    }
  }

  public deleteTemp(id: string) {
    const chunkKey = this.idChunkMap[id];

    if (this.writes) {
      if (this.writes[chunkKey] && this.writes[chunkKey]["delete"]) {
        this.writes[chunkKey]["delete"]!.push(id);
      } else if (this.writes[chunkKey]) {
        this.writes[chunkKey]["delete"] = [id];
      } else {
        this.writes[chunkKey] = { delete: [id] };
      }
    } else {
      this.writes = { [chunkKey]: { delete: [id] } };
    }
  }

  public write() {
    if (this.writes) {
      Object.entries(this.writes).forEach(([chunkKey, write]) => {
        if (this.collectionChunk.chunkKey !== chunkKey) {
          this.loadChunk(chunkKey);
        }
        if (write.insert) {
          write.insert.forEach((document) => {
            this.idChunkMap[document.id] = chunkKey;
            this.collectionChunk.chunk[document.id] = document;
            this.metaData.count += 1;
            this.metaData.chunkSize[chunkKey]
              ? (this.metaData.chunkSize[chunkKey] += this.getSize(document))
              : (this.metaData.chunkSize[chunkKey] = this.getSize(document));
          });
        } else if (write.update) {
          write.update.forEach((document) => {
            this.metaData.chunkSize[chunkKey] -= this.getSize(
              this.collectionChunk.chunk[document.id]
            );
            this.collectionChunk.chunk[document.id] = document;
            this.metaData.chunkSize[chunkKey] += this.getSize(document);
          });
        } else if (write.delete) {
          write.delete.forEach((id) => {
            delete this.idChunkMap[id];
            this.metaData.chunkSize[chunkKey] -= this.getSize(
              this.collectionChunk.chunk[id]
            );
            delete this.collectionChunk.chunk[id];
            this.metaData.count -= 1;
          });
        }

        writeObjToJson(
          this.collectionChunk.chunk,
          this.getDirPath() + `/${chunkKey}.json`
        );
      });
      writeObjToJson(this.metaData, this.getDirPath() + "/metaData.json");
      if (
        Object.values(this.writes).some((write) => write.insert || write.delete)
      ) {
        writeObjToJson(this.idChunkMap, this.getDirPath() + "/idChunkMap.json");
      }

      this.writes = undefined;
    }
  }

  public canWrite() {
    return Boolean(this.writes);
  }

  public totalCount() {
    return this.metaData.count;
  }

  public clearCache() {
    this.collectionChunk = DEFAULT_COLL_CHUNK;
  }
}

export default Collection;
