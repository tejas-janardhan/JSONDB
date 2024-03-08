import CollectionClient from './client'

class JsonDbClient {
    constructor(
        readonly host: string,
        readonly port: string,
    ) {}
    public collection(collectionName: string) {
        return new CollectionClient(
            collectionName,
            `http://${this.port}:${this.host}/op`,
        )
    }
}

export default JsonDbClient
