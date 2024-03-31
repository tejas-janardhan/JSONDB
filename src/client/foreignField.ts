import { DocData, UNIQUE_FORIEGN_FIELD_OBJ } from '../constants'

class ForeignField {
    constructor(
        public collectionName: string,
        public id: string,
        public populatedDoc?: DocData | undefined,
    ) {}

    getJson(): {
        collectionName: string
        id: string
    } & typeof UNIQUE_FORIEGN_FIELD_OBJ {
        return {
            collectionName: this.collectionName,
            id: this.id,
            ...UNIQUE_FORIEGN_FIELD_OBJ,
        }
    }
}

export default ForeignField
