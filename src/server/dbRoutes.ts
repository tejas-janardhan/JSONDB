import { FastifyInstance } from 'fastify'
import Engine from './dbEngine'

type JsonDbReqBody = {
    op: string
    collectionName: string
    payload: any
}

const engine = new Engine()

export const addRoutes = (fastify: FastifyInstance) => {
    // add env vars
    // add user support
    // add fastify schema validation
    fastify.get('/', function (request, reply) {
        return { thisIs: 'JSONdb server' }
    })
    fastify.post('/op', function (request, reply) {
        const { op, collectionName, payload } = request.body as JsonDbReqBody

        switch (op) {
            case 'count':
                return { count: engine.count(collectionName) }
            case 'insert':
                engine.insert(collectionName, payload.documents)
                return {}
            case 'filter':
                return {
                    documents: engine.filter(
                        collectionName,
                        payload.filter,
                        payload.projection,
                    ),
                }
            case 'update':
                engine.update(collectionName, payload.filter, payload.data)
                return {}
            case 'delete':
                engine.delete(collectionName, payload.filter)
                return {}
            case 'updateOne':
                engine.updateOne(collectionName, payload.filter, payload.data)
                return {}
            case 'deleteOne':
                engine.deleteOne(collectionName, payload.filter)
                return {}
            case 'createIndex':
                engine.createIndex(collectionName, payload.field)
            default:
                reply.code(404).send('Op not found!')
        }
    })
}
