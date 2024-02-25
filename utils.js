'use strict'
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k
              var desc = Object.getOwnPropertyDescriptor(m, k)
              if (
                  !desc ||
                  ('get' in desc
                      ? !m.__esModule
                      : desc.writable || desc.configurable)
              ) {
                  desc = {
                      enumerable: true,
                      get: function () {
                          return m[k]
                      },
                  }
              }
              Object.defineProperty(o, k2, desc)
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k
              o[k2] = m[k]
          })
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, 'default', {
                  enumerable: true,
                  value: v,
              })
          }
        : function (o, v) {
              o['default'] = v
          })
var __importStar =
    (this && this.__importStar) ||
    function (mod) {
        if (mod && mod.__esModule) return mod
        var result = {}
        if (mod != null)
            for (var k in mod)
                if (
                    k !== 'default' &&
                    Object.prototype.hasOwnProperty.call(mod, k)
                )
                    __createBinding(result, mod, k)
        __setModuleDefault(result, mod)
        return result
    }
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod }
    }
Object.defineProperty(exports, '__esModule', { value: true })
exports.objLog =
    exports.writeObjToJson =
    exports.writeObjToJsonSync =
    exports.objfromJsonPath =
    exports.objfromJsonPathSync =
    exports.generateId =
        void 0
const fs = __importStar(require('fs'))
const crypto_1 = __importDefault(require('crypto'))
const generateId = () => crypto_1.default.randomBytes(8).toString('hex')
exports.generateId = generateId
const objfromJsonPathSync = (path) => {
    return JSON.parse(fs.readFileSync(path).toString())
}
exports.objfromJsonPathSync = objfromJsonPathSync
const objfromJsonPath = (path) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err) {
                reject(err)
            } else {
                resolve(JSON.parse(data.toString()))
            }
        })
    })
}
exports.objfromJsonPath = objfromJsonPath
const writeObjToJsonSync = (obj, path) => {
    fs.writeFileSync(path, JSON.stringify(obj))
}
exports.writeObjToJsonSync = writeObjToJsonSync
const writeObjToJson = (obj, path) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, JSON.stringify(obj), {}, (err) => {
            if (err) {
                reject(err)
            } else {
                resolve(undefined)
            }
        })
    })
}
exports.writeObjToJson = writeObjToJson
const objLog = (obj) => {
    console.log(JSON.stringify(obj, null, 2))
}
exports.objLog = objLog
