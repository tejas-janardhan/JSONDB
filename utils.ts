import * as fs from 'fs'
import crypto from 'crypto'

export const generateId: () => string = () =>
    crypto.randomBytes(8).toString('hex')

export const objfromJsonPathSync = (path: string) => {
    return JSON.parse(fs.readFileSync(path).toString())
}

export const objfromJsonPath = (path: string): Promise<any> => {
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

export const writeObjToJsonSync = (obj: Record<any, any>, path: string) => {
    fs.writeFileSync(path, JSON.stringify(obj))
}

export const writeObjToJson = (
    obj: Record<any, any>,
    path: string
): Promise<void> => {
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

export const objLog = (obj: Record<any, any>) => {
    console.log(JSON.stringify(obj, null, 2))
}
