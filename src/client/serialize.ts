import { DocData, UNIQUE_FORIEGN_FIELD_OBJ } from '../constants'
import ForeignField from './foreignField'

export const serialise = (obj: DocData): DocData => {
    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => {
            if (value instanceof ForeignField) {
                return [key, value.getJson()]
            }
            return [key, value]
        }),
    )
}

export const deSerialise = (obj: DocData): DocData => {
    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => {
            if (
                '_jsondb_i9i_' in value &&
                value._jsondb_i9i_ === UNIQUE_FORIEGN_FIELD_OBJ._jsondb_i9i_
            ) {
                return [key, new ForeignField(value.collectionName, value.id, value.populatedDoc)]
            }
            return [key, value]
        }),
    )
}
