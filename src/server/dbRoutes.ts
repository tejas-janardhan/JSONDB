import { FastifyInstance } from 'fastify'
import Engine from './dbEngine'
import { DocData, Filter, HttpError, Projection } from '../constants'

type JsonDbReqBody = {
    op: string
    collectionName: string
    payload: {
        filter?: Filter
        projection?: Projection
        documents?: DocData[]
        data?: DocData
        field?: string
    }
}

const engine = new Engine()

export const addRoutes = (fastify: FastifyInstance) => {
    // add env vars
    // add fastify schema validation
    fastify.setErrorHandler((error, request, reply) => {
        if (error instanceof HttpError) {
            reply.status(error.code).send(error.message)
            return
        }
        console.error(error)
        reply.status(500).send(error)
    })

    fastify.get('/', function (request, reply) {
        return { thisIs: 'JSONdb server' }
    })
    fastify.post('/op', async function (request, reply) {
        const { op, collectionName, payload } = request.body as JsonDbReqBody

        switch (op) {
            case 'count':
                return { count: engine.count(collectionName) }
            case 'insert':
                if (!payload.documents) {
                    throw new HttpError({
                        code: 400,
                        message: 'Documents do not exist.',
                    })
                }
                await engine.insert(collectionName, payload.documents)
                return {}
            case 'all':
                return {
                    documents: await engine.all(
                        collectionName,
                        payload.projection,
                    ),
                }
            case 'filter':
                if (!payload.filter) {
                    throw new HttpError({
                        code: 400,
                        message: 'Filter do not exist.',
                    })
                }
                return {
                    documents: await engine.filter(
                        collectionName,
                        payload.filter,
                        payload.projection,
                    ),
                }
            case 'filterOne':
                if (!payload.filter) {
                    throw new HttpError({
                        code: 400,
                        message: 'Filter do not exist.',
                    })
                }
                return {
                    document: await engine.filterOne(
                        collectionName,
                        payload.filter,
                        payload.projection,
                    ),
                }
            case 'update':
                if (!payload.filter) {
                    throw new HttpError({
                        code: 400,
                        message: 'Filter do not exist.',
                    })
                }
                if (!payload.data) {
                    throw new HttpError({
                        code: 400,
                        message: 'Filter do not exist.',
                    })
                }
                await engine.update(
                    collectionName,
                    payload.filter,
                    payload.data,
                )
                return {}
            case 'delete':
                if (!payload.filter) {
                    throw new HttpError({
                        code: 400,
                        message: 'Filter do not exist.',
                    })
                }
                await engine.delete(collectionName, payload.filter)
                return {}
            case 'updateOne':
                if (!payload.filter) {
                    throw new HttpError({
                        code: 400,
                        message: 'Filter do not exist.',
                    })
                }
                if (!payload.data) {
                    throw new HttpError({
                        code: 400,
                        message: 'Data do not exist.',
                    })
                }
                await engine.updateOne(
                    collectionName,
                    payload.filter,
                    payload.data,
                )
                return {}
            case 'deleteOne':
                if (!payload.filter) {
                    throw new HttpError({
                        code: 400,
                        message: 'Filter do not exist.',
                    })
                }
                await engine.deleteOne(collectionName, payload.filter)
                return {}
            case 'createIndex':
                if (!payload.field) {
                    throw new HttpError({
                        code: 400,
                        message: 'Filter do not exist.',
                    })
                }
                engine.createIndex(collectionName, payload.field)
            default:
                reply.code(404).send('Op not found!')
        }
    })
}
