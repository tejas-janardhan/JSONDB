import EventEmitter from "events";
import Collection from "./collection";
import { DOCDATA, Document, Filter, FilterOptions } from "./constants";
import { generateId } from "./utils";

const server = new EventEmitter();
const sendRequest = (endPoint: string, data: Record<any, any>) =>
  server.emit(endPoint, JSON.stringify(data));
const sendRequestWResponse = (
  endPoint: string,
  data: Record<any, any> | undefined = undefined
) => {
  server.emit(endPoint, data ? JSON.stringify(data) : undefined);

  return new Promise((resolve) => {
    server.once(endPoint + "-response", (data) => {
      resolve(JSON.parse(data));
    });
  });
};

// Add index support.
// seperate server and client. and add error handling and jsondb:// connection string current focus.
// add multiple collection support to client
// add env vars
// add ts support to client and schema support.
// add user support
// add projection support after client server seperation.

const COLL_NAME = "collection1";

const collectionCache: Record<string, Collection> = {};

const getCollection = (collectionName: string) => {
  return collectionCache[collectionName]
    ? collectionCache[collectionName]
    : new Collection(collectionName);
};

const engine = {
  _idFilter: (
    ids: string[],
    collection: Collection,
    getOne: boolean
  ): Document[] => {
    if (getOne) {
      for (const id of ids) {
        const document = collection.getById(id);
        if (document) return [document];
      }
      return [];
    }
    return ids
      .map((id) => collection.getById(id))
      .filter((document) => Boolean(document));
  },
  _validateFilter: (filter: Filter): void => {
    if (filter === {}) {
      throw Error("Empty filter.");
    }
  },
  _filter: (
    filter: Filter,
    collection: Collection,
    filterOptions: FilterOptions = {}
  ): Document[] => {
    let foundDocs: Document[] = [];
    const getOne = Boolean(filterOptions.getOne);

    const { id: filterId, ...filterRest } = filter;
    if (filterId) {
      foundDocs = engine._idFilter(
        Array.isArray(filterId) ? filterId : [filterId],
        collection,
        getOne
      );
      if (getOne) return foundDocs;
    }

    const docFilterFunc = (document: Document): boolean => {
      return Object.entries(filterRest).every(([field, value]) => {
        return document[field] === value;
      });
    };

    if (!foundDocs.length && filterRest) {
      foundDocs = collection.filter(docFilterFunc, getOne);
    } else if (filterRest) {
      foundDocs.filter(docFilterFunc);
    }

    return foundDocs;
  },
  count: () => {
    const collection = getCollection(COLL_NAME);
    return collection.totalCount();
  },
  insert: (newdocs: DOCDATA[]) => {
    const collection = getCollection(COLL_NAME);
    newdocs.forEach((newDoc) => {
      collection.addTemp({
        ...newDoc,
        id: generateId(),
        updatedAt: new Date().toJSON(),
        createdAt: new Date().toJSON(),
      });
    });
    collection.write();
  },
  filter: (filter: Filter) => {
    engine._validateFilter(filter);
    const collection = getCollection(COLL_NAME);
    return engine._filter(filter, collection);
  },
  update: (filter: Filter, updateData: DOCDATA) => {
    engine._validateFilter(filter);
    const collection = getCollection(COLL_NAME);
    const foundDocs = engine._filter(filter, collection);

    if (!foundDocs.length) throw Error("Cannot find any elements to update");

    foundDocs.forEach((document) => {
      collection.replaceTemp({
        ...document,
        ...updateData,
        updatedAt: new Date().toJSON(),
      });
    });

    collection.write();
  },
  delete: (filter: Filter) => {
    engine._validateFilter(filter);
    const collection = getCollection(COLL_NAME);
    const foundDocs = engine._filter(filter, collection);

    if (!foundDocs.length) throw Error("Cannot find any elements to delete");

    foundDocs.forEach((document) => {
      collection.deleteTemp(document.id);
    });
    collection.write();
  },
  updateOne: (filter: Filter, updateData: DOCDATA) => {
    engine._validateFilter(filter);
    const collection = getCollection(COLL_NAME);
    const [foundDoc] = engine._filter(filter, collection, { getOne: true });

    if (!foundDoc) throw Error("Cannot find any element to update");
    collection.replaceTemp({
      ...foundDoc,
      ...updateData,
      updatedAt: new Date().toJSON(),
    });
    collection.write();
  },
  deleteOne: (filter: Filter) => {
    engine._validateFilter(filter);
    const collection = getCollection(COLL_NAME);
    const [foundDoc] = engine._filter(filter, collection, { getOne: true });

    if (!foundDoc) throw Error("Cannot find any element to delete");
    collection.deleteTemp(foundDoc.id);
    collection.write();
  },
};

server.on("insert", (docsString) => {
  engine.insert(JSON.parse(docsString));
});

server.on("filter", (filterString) => {
  setImmediate(() => {
    const filter: Filter = JSON.parse(filterString);
    const documentList = engine.filter(filter);
    server.emit("filter-response", JSON.stringify(documentList));
  });
});

server.on("count", () => {
  setImmediate(() => {
    server.emit("count-response", engine.count());
  });
});

server.on("update", (updateString) => {
  const { filter, data } = JSON.parse(updateString);
  engine.update(filter, data);
});

server.on("delete", (filterString) => {
  const filter: Filter = JSON.parse(filterString);
  engine.delete(filter);
});

server.on("updateOne", (updateString) => {
  const { filter, data } = JSON.parse(updateString);
  engine.updateOne(filter, data);
});

server.on("deleteOne", (filterString) => {
  const filter: Filter = JSON.parse(filterString);
  engine.deleteOne(filter);
});

const client = {
  insert: (documents: DOCDATA[] | DOCDATA) => {
    sendRequest("insert", Array.isArray(documents) ? documents : [documents]);
  },
  filter: async (filter: Filter) => {
    return await sendRequestWResponse("filter", filter);
  },
  count: async () => {
    return await sendRequestWResponse("count");
  },
  update: (filter: Filter, data: DOCDATA) => {
    sendRequest("update", { filter, data });
  },
  delete: (filter: Filter) => {
    sendRequest("delete", filter);
  },
  updateOne: (filter: Filter, data: DOCDATA) => {
    sendRequest("updateOne", { filter, data });
  },
  deleteOne: (filter: Filter) => {
    sendRequest("deleteOne", filter);
  },
};

const main = async () => {
  client.insert({ name1: 400, name2: 400, name3: 400 });
  // console.log(await client.count());
  // console.log(client.delete({ temp: 200 }));
  // console.log(await client.count());
  // console.time();
  const docs = (await client.filter({
    name1: 400,
  })) as any[];

  console.log(docs);

  // console.timeEnd();
  // console.time();
  // console.log(
  //   await client.filter({
  //     id: ["7a8165e91e88735b", "374b06ac6c4d54ac"],
  //     temp: 300,
  //   })
  // );
  // console.timeEnd();
};
main();

// client.insert({
//     test:2,
//     temp:200
// })
