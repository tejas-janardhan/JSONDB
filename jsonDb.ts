import EventEmitter from "events";
import Collection from "./collection";
import { DOCUMENT, FILTER } from "./constants";
import { generateId, objLog } from "./utils";

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
// Add deleteOne and updateOne.
// seperate server and client. and add error handling
// add compression snappy.
// add multiple collection support to client
// add createdAt and updatedAt

const COLL_NAME = "collection1";

const collectionCache: Record<string, Collection> = {};

const getCollection = (collectionName: string) => {
  return collectionCache[collectionName]
    ? collectionCache[collectionName]
    : new Collection(collectionName);
};

const engine = {
  _idFilter: (ids: string[], collection: Collection) => {
    return ids
      .map((id) => collection.getById(id))
      .filter((document) => Boolean(document));
  },
  _validateFilter: (filter: FILTER) => {
    if (filter === {}) {
      throw Error("Empty filter.");
    }
  },
  _filter: (filter: FILTER, collection: Collection) => {
    let foundDocs: DOCUMENT[] = [];

    const { id: filterId, ...filterRest } = filter;
    if (filterId) {
      foundDocs = engine._idFilter(
        Array.isArray(filterId) ? filterId : [filterId],
        collection
      );
    }

    const docFilterFunc = (document: DOCUMENT) => {
      return Object.entries(filterRest).every(([field, value]) => {
        return document[field] === value;
      });
    };

    if (!foundDocs.length && filterRest) {
      foundDocs = collection.filter(docFilterFunc);
    } else if (filterRest) {
      foundDocs.filter(docFilterFunc);
    }

    return foundDocs.map((document) => document);
  },
  count: () => {
    const collection = getCollection(COLL_NAME);
    return collection.totalCount();
  },
  insert: (documents: Omit<DOCUMENT, "id">[]) => {
    const collection = getCollection(COLL_NAME);
    documents.forEach((document) => {
      const id = generateId();
      collection.addTemp({ ...document, id });
    });
    collection.write();
  },
  filter: (filter: FILTER) => {
    engine._validateFilter(filter);
    const collection = getCollection(COLL_NAME);
    return engine._filter(filter, collection);
  },
  update: (filter: FILTER, updateData: Omit<DOCUMENT, "id">) => {
    engine._validateFilter(filter);
    const collection = getCollection(COLL_NAME);
    const foundDocs = engine._filter(filter, collection);

    if (!foundDocs.length) throw Error("Cannot find any elements to update");

    foundDocs.forEach((document) => {
      collection.replaceTemp({ ...document, ...updateData });
    });

    collection.write();
  },
  delete: (filter: FILTER) => {
    engine._validateFilter(filter);
    const collection = getCollection(COLL_NAME);
    const foundDocs = engine._filter(filter, collection);

    if (!foundDocs.length) throw Error("Cannot find any elements to delete");

    foundDocs.forEach((document) => {
      collection.deleteTemp(document.id);
    });

    collection.write();
  },
};

server.on("insert", (docsString) => {
  engine.insert(JSON.parse(docsString));
});

server.on("filter", (filterString) => {
  setImmediate(() => {
    const filter: FILTER = JSON.parse(filterString);
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
  engine.delete(JSON.parse(filterString));
});

const client = {
  insert: (documents: Omit<DOCUMENT, "id">[] | Omit<DOCUMENT, "id">) => {
    sendRequest("insert", Array.isArray(documents) ? documents : [documents]);
  },
  filter: async (filter: FILTER) => {
    return await sendRequestWResponse("filter", filter);
  },
  count: async () => {
    return await sendRequestWResponse("count");
  },
  update: (filter: FILTER, data: Omit<DOCUMENT, "id">) => {
    sendRequest("update", { filter, data });
  },
  delete: (filter: FILTER) => {
    sendRequest("delete", filter);
  },
};

const main = async () => {
  // client.insert(
  //   Array(2000)
  //     .fill(0)
  //     .map((_) => ({ temp: 400 }))
  // );
  console.log(await client.count());
  client.delete({ test: 2, temp: 200, ruby: 3000 });
  console.log(await client.count());
  // console.time();
  // console.log(
  //   await client.filter({
  //     id: ["7a8165e91e88735b", "374b06ac6c4d54ac"],
  //     temp: 300,
  //   })
  // );
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
