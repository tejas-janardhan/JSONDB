import Collection from "./collection";
import {
  DocData,
  Document,
  Filter,
  FilterOptions,
  Projection,
} from "./constants";
import { generateId } from "./utils";

// add single index support current focus
// add batching support
// concurrent request support.
// add collection cache limit
// lru cache library and replace other cacehs with it too (NodeCache??)
class Engine {
  collectionCache: Record<string, Collection>;

  private getCollection(collectionName: string): Collection {
    if (!this.collectionCache[collectionName]) {
      this.collectionCache[collectionName] = new Collection(collectionName);
    }
    return this.collectionCache[collectionName];
  }

  private validateFilter(filter: Filter): void {
    if (filter === {}) {
      throw Error("Empty filter.");
    }
  }

  private internalFilter(
    filter: Filter,
    collection: Collection,
    filterOptions: FilterOptions = {}
  ): Document[] {
    let foundDocs: Document[] = [];
    const getOne = Boolean(filterOptions.getOne);

    const { id: filterId, ...filterRest } = filter;

    if (filterId) {
      const ids = Array.isArray(filterId) ? filterId : [filterId];
      if (getOne) {
        for (const id of ids) {
          const document = collection.getById(id);
          if (document) return [document];
        }
        return [];
      }
      foundDocs = ids
        .map((id) => collection.getById(id))
        .filter((document) => Boolean(document));
    }

    const docFilterFunc = (document: Document): boolean => {
      return Object.entries(filterRest).every(([field, value]) => {
        return document[field] === value;
      });
    };

    if (!filterId && filterRest) {
      foundDocs = collection.filter(docFilterFunc, getOne);
    } else if (filterRest) {
      return foundDocs.filter(docFilterFunc);
    }
    return foundDocs;
  }

  constructor() {
    this.collectionCache = {};
  }

  public count(collectionName: string) {
    const collection = this.getCollection(collectionName);
    return collection.totalCount();
  }

  public insert(collectionName: string, newdocs: DocData[]): void {
    const collection = this.getCollection(collectionName);
    newdocs.forEach((newDoc) => {
      collection.addTemp({
        ...newDoc,
        id: generateId(),
        updatedAt: new Date().toJSON(),
        createdAt: new Date().toJSON(),
      });
    });
    collection.write();
  }

  public filter(
    collectionName: string,
    filter: Filter,
    projection: Projection | undefined = undefined
  ): Document[] {
    this.validateFilter(filter);
    const collection = this.getCollection(collectionName);
    const documents = this.internalFilter(filter, collection);

    if (projection) {
      const projectionMap = projection.reduce((map, field) => {
        map[field] = 1;
        return map;
      }, {} as Record<string, 1>);
      projectionMap["id"] = 1;
      projectionMap["updatedAt"] = 1;
      projectionMap["createdAt"] = 1;
      return documents.map((document) => {
        Object.keys(document).forEach((field) => {
          if (!projectionMap[field]) delete document[field];
        });
        return document;
      });
    } else {
      return documents;
    }
  }

  public update(collectionName: string, filter: Filter, updateData: DocData) {
    this.validateFilter(filter);
    const collection = this.getCollection(collectionName);
    const foundDocs = this.internalFilter(filter, collection);

    if (!foundDocs.length) throw Error("Cannot find any elements to update");

    foundDocs.forEach((document) => {
      collection.replaceTemp({
        ...document,
        ...updateData,
        updatedAt: new Date().toJSON(),
      });
    });

    collection.write();
  }

  public delete(collectionName: string, filter: Filter) {
    this.validateFilter(filter);
    const collection = this.getCollection(collectionName);
    const foundDocs = this.internalFilter(filter, collection);

    if (!foundDocs.length) throw Error("Cannot find any elements to delete");

    foundDocs.forEach((document) => {
      collection.deleteTemp(document.id);
    });
    collection.write();
  }

  public updateOne(
    collectionName: string,
    filter: Filter,
    updateData: DocData
  ) {
    this.validateFilter(filter);
    const collection = this.getCollection(collectionName);
    const [foundDoc] = this.internalFilter(filter, collection, {
      getOne: true,
    });

    if (!foundDoc) throw Error("Cannot find any element to update");
    collection.replaceTemp({
      ...foundDoc,
      ...updateData,
      updatedAt: new Date().toJSON(),
    });
    collection.write();
  }

  public deleteOne(collectionName: string, filter: Filter) {
    this.validateFilter(filter);
    const collection = this.getCollection(collectionName);
    const [foundDoc] = this.internalFilter(filter, collection, {
      getOne: true,
    });

    if (!foundDoc) throw Error("Cannot find any element to delete");
    collection.deleteTemp(foundDoc.id);
    collection.write();
  }

  public createIndex(collectionName: string, field: string) {
    const collection = this.getCollection(collectionName);
    collection.createIndex(field);
  }
}

export default Engine;
