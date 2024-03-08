import { DocData, Filter, Projection } from './constants'
import axios from 'axios'

// add client connection interface
// add get all, flush, update all,
// add find - only gets one
// add bulk writes
// add ts collection support
const HOST = '127.0.0.1'
const PORT = 4354
const OP_URL = `http://${HOST}:${PORT}/op`

class ClientConnection {
    constructor(readonly collectionName: string) {}

    public async insert(documents: DocData[] | DocData) {
        const response = await axios.post(`${HOST}:${PORT}/op`, {
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
        const response = await axios.post(OP_URL, {
            op: 'filter',
            collectionName: this.collectionName,
            payload: { filter, projection },
        })
        if (response.status !== 200) {
            throw Error(response.statusText)
        }
        return response.data.documents
    }

    public async count() {
        const response = await axios.post(OP_URL, {
            op: 'count',
            collectionName: this.collectionName,
        })
        if (response.status !== 200) {
            throw Error(response.statusText)
        }
        return response.data.count
    }

    public async update(filter: Filter, data: DocData) {
        const response = await axios.post(OP_URL, {
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
        const response = await axios.post(OP_URL, {
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
        const response = await axios.post(OP_URL, {
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
        const response = await axios.post(OP_URL, {
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

export default ClientConnection
