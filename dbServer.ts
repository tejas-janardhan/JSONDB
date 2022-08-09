import Engine from "./dbEngine";
import Fastify from "fastify";

const PORT = 4354;

const fastify = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
});

const engine = new Engine();

type JsonDbReqBody = {
  op: string;
  collectionName: string;
  payload: any;
};

// add env vars
// add user support
// add fastify schema validation
fastify.get("/", function (request, reply) {
  return { thisIs: "JSONdb server" };
});
fastify.post("/op", function (request, reply) {
  const { op, collectionName, payload } = request.body as JsonDbReqBody;
  console.log(collectionName);
  switch (op) {
    case "count":
      return { count: engine.count(collectionName) };
    case "insert":
      engine.insert(collectionName, payload.documents);
      return {};
    case "filter":
      return {
        documents: engine.filter(
          collectionName,
          payload.filter,
          payload.projection
        ),
      };
    case "update":
      engine.update(collectionName, payload.filter, payload.data);
      return {};
    case "delete":
      engine.delete(collectionName, payload.filter);
      return {};
    case "updateOne":
      engine.updateOne(collectionName, payload.filter, payload.data);
      return {};
    case "deleteOne":
      engine.deleteOne(collectionName, payload.filter);
      return {};
    case "createIndex":
      engine.createIndex(collectionName, payload.field);
    default:
      reply.code(404).send("Op not found!");
  }
});

// This can move to index.ts.
const start = async () => {
  try {
    await fastify.listen({ port: PORT });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
