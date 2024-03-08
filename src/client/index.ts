import CollectionClient from '../server/collection'

class JsonDbClient {
    constructor(
        readonly host: string,
        readonly port: string,
    ) {}
    public collection(collectionName: string) {
        return new CollectionClient(
            collectionName,
            `http://${this.host}:${this.port}/op`,
        )
    }
}

export default JsonDbClient
