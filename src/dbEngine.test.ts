// Only use the external API. No Stubbing allowed so this stands in as integration test.
import assert from 'assert'
import fs from 'fs'
import { Filter } from './constants'
import Engine from './dbEngine'
const TEST_DIR_PATH = './test_data'

const testCollectionName = 'testCollection'
describe('Test inserting and finding a document', async () => {
    it('inserted doc should be queryed / create new data dir', async () => {
        const engine = new Engine(TEST_DIR_PATH)
        const testDocument = {
            field1: 3,
            field2: 'placeholder-string',
            field3: { subField1: 1, subField2: 'sub-string' },
            field4: null,
        }
        await engine.insert(testCollectionName, [testDocument])

        const { id, createdAt, updatedAt, ...doc } = (
            await engine.filter(testCollectionName, testDocument)
        )[0]

        assert.deepStrictEqual(doc, testDocument)

        fs.rmSync(TEST_DIR_PATH, { recursive: true, force: true })
    })
})
describe('Test querying by ids and updating a document', async () => {
    it('inserted doc should be queryed / create new data dir', async () => {
        const engine = new Engine(TEST_DIR_PATH)
        const testDocument = {
            field1: 3,
            field2: 'placeholder-string',
            field3: { subField1: 1, subField2: 'sub-string' },
            field4: null,
        }
        const [insertedId] = await engine.insert(testCollectionName, [
            testDocument,
        ])
        const filter: Filter = { id: insertedId }
        const update = {
            field2: 'changed-placeholder-string',
            field5: 'new-field',
        }

        await engine.update(testCollectionName, filter, update)

        const { id, createdAt, updatedAt, ...doc } = (
            await engine.filter(testCollectionName, filter)
        )[0]

        assert.deepStrictEqual(doc, { ...testDocument, ...update })

        fs.rmSync(TEST_DIR_PATH, { recursive: true, force: true })
    })
})
