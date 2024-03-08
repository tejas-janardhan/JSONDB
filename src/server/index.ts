import Fastify from 'fastify'
import { addRoutes } from './dbRoutes'

const PORT = 4354

const fastify = Fastify({
    logger: {
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        },
    },
})

addRoutes(fastify)

const start = async () => {
    try {
        await fastify.listen({ port: PORT })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

start()
