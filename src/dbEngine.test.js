'use strict'
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value)
                  })
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value))
                } catch (e) {
                    reject(e)
                }
            }
            function rejected(value) {
                try {
                    step(generator['throw'](value))
                } catch (e) {
                    reject(e)
                }
            }
            function step(result) {
                result.done
                    ? resolve(result.value)
                    : adopt(result.value).then(fulfilled, rejected)
            }
            step(
                (generator = generator.apply(thisArg, _arguments || [])).next()
            )
        })
    }
var __rest =
    (this && this.__rest) ||
    function (s, e) {
        var t = {}
        for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
                t[p] = s[p]
        if (s != null && typeof Object.getOwnPropertySymbols === 'function')
            for (
                var i = 0, p = Object.getOwnPropertySymbols(s);
                i < p.length;
                i++
            ) {
                if (
                    e.indexOf(p[i]) < 0 &&
                    Object.prototype.propertyIsEnumerable.call(s, p[i])
                )
                    t[p[i]] = s[p[i]]
            }
        return t
    }
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod }
    }
Object.defineProperty(exports, '__esModule', { value: true })
// Only use the external API. No Stubbing allowed so this stands in as integration test.
const assert_1 = __importDefault(require('assert'))
const fs_1 = __importDefault(require('fs'))
const dbEngine_1 = __importDefault(require('./dbEngine'))
const TEST_DIR_PATH = './test_data'
const testCollectionName = 'testCollection'
describe('Test inserting and finding a document', () =>
    __awaiter(void 0, void 0, void 0, function* () {
        it('inserted doc should be queryed / create new data dir', () =>
            __awaiter(void 0, void 0, void 0, function* () {
                const engine = new dbEngine_1.default(TEST_DIR_PATH)
                const testDocument = {
                    field1: 3,
                    field2: 'placeholder-string',
                    field3: { subField1: 1, subField2: 'sub-string' },
                    field4: null,
                }
                yield engine.insert(testCollectionName, [testDocument])
                const _a = (yield engine.filter(
                        testCollectionName,
                        testDocument
                    ))[0],
                    { id, createdAt, updatedAt } = _a,
                    doc = __rest(_a, ['id', 'createdAt', 'updatedAt'])
                assert_1.default.deepStrictEqual(doc, testDocument)
                fs_1.default.rmSync(TEST_DIR_PATH, {
                    recursive: true,
                    force: true,
                })
            }))
    }))
describe('Test querying by ids and updating a document', () =>
    __awaiter(void 0, void 0, void 0, function* () {
        it('inserted doc should be queryed / create new data dir', () =>
            __awaiter(void 0, void 0, void 0, function* () {
                const engine = new dbEngine_1.default(TEST_DIR_PATH)
                const testDocument = {
                    field1: 3,
                    field2: 'placeholder-string',
                    field3: { subField1: 1, subField2: 'sub-string' },
                    field4: null,
                }
                const [insertedId] = yield engine.insert(testCollectionName, [
                    testDocument,
                ])
                const filter = { id: insertedId }
                const update = {
                    field2: 'changed-placeholder-string',
                    field5: 'new-field',
                }
                yield engine.update(testCollectionName, filter, update)
                const _b = (yield engine.filter(testCollectionName, filter))[0],
                    { id, createdAt, updatedAt } = _b,
                    doc = __rest(_b, ['id', 'createdAt', 'updatedAt'])
                assert_1.default.deepStrictEqual(
                    doc,
                    Object.assign(Object.assign({}, testDocument), update)
                )
                fs_1.default.rmSync(TEST_DIR_PATH, {
                    recursive: true,
                    force: true,
                })
            }))
    }))
