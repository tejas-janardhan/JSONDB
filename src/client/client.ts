import { DocData, Filter, Projection } from '../constants'
import axios from 'axios'

// add get all, flush, update all,
// add find - only gets one
// add bulk writes
// add ts collection support

class CollectionClient {
    constructor(
        readonly collectionName: string,
        readonly opUrl: string,
    ) {}

    public async insert(documents: DocData[] | DocData) {
        const response = await axios.post(this.opUrl, {
            op: 'insert',
            collectionName: this.collectionName,
            payload: {
                documents: Array.isArray(documents) ? documents : [documents],
            },
        })
        if (response.status !== 200) {
            throw Error(response.statusText)
        }
        return true
    }

    public async filter(
        filter: Filter,
        projection: Projection | undefined = undefined,
    ) {
        const response = await axios.post(this.opUrl, {
            op: 'filter',
            collectionName: this.collectionName,
            payload: { filter, projection },
        })
        if (response.status !== 200) {
            throw Error(response.statusText)
        }
        return response.data.documents
    }

    public async all(
        filter: Filter,
        projection: Projection | undefined = undefined,
    ) {
        const response = await axios.post(this.opUrl, {
            op: 'all',
            collectionName: this.collectionName,
            payload: { filter, projection },
        })
        if (response.status !== 200) {
            throw Error(response.statusText)
        }
        return response.data.documents
    }

    public async count() {
        const response = await axios.post(this.opUrl, {
            op: 'count',
            collectionName: this.collectionName,
            
        })
        if (response.status !== 200) {
            throw Error(response.statusText)
        }
        return response.data.count
    }

    public async countFilter(filter: Filter) {
        const response = await axios.post(this.opUrl, {
            op: 'count',
            collectionName: this.collectionName,
            payload: { filter },
        })
        if (response.status !== 200) {
            throw Error(response.statusText)
        }
        return response.data.count
    }

    public async update(filter: Filter, data: DocData) {
        const response = await axios.post(this.opUrl, {
            op: 'update',
            collectionName: this.collectionName,
            payload: { filter, data },
        })
        if (response.status !== 200) {
            throw Error(response.statusText)
        }
        return true
    }

    public async delete(filter: Filter) {
        const response = await axios.post(this.opUrl, {
            op: 'delete',
            collectionName: this.collectionName,
            payload: { filter },
        })
        if (response.status !== 200) {
            throw Error(response.statusText)
        }
        return true
    }

    public async updateOne(filter: Filter, data: DocData) {
        const response = await axios.post(this.opUrl, {
            op: 'updateOne',
            collectionName: this.collectionName,
            payload: { filter, data },
        })
        if (response.status !== 200) {
            throw Error(response.statusText)
        }
        return true
    }

    public async deleteOne(filter: Filter) {
        const response = await axios.post(this.opUrl, {
            op: 'deleteOne',
            collectionName: this.collectionName,
            payload: { filter },
        })
        if (response.status !== 200) {
            throw Error(response.statusText)
        }
        return true
    }
}

export default CollectionClient
