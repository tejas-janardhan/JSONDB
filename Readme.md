# JSON DB

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/slinkity/slinkity/blob/main/LICENSE.md)

> 🏫 **This project is for educational purposes only !** 🏫 As excited as you may be, we don't recommend this for production use. Still, give it a try if you want to have some fun and don't mind [logging bugs](https://github.com/tejas-janardhan/JSONDB/issues) along the way !

JSON DB is a NO SQL Database that stores files in the .json format. It is heavily inspired by [MongoDB](https://www.mongodb.com/docs/atlas/)

-   🚀 **Chunking Support** JSON DB supports chunking, which means that data is stored in multiple json db files with default chunk-id indexes.
*********
-   🔖 **Insert, Filter, Count** Insert documents into the db, filter them as well as get a count of the documents in the db.
*********
-   💧 **Update, Delete** Update and Delete documents in the db.
*********
-   💅 **Is packaged with server and client instances** Comes with a client side API as well as a dev command to run the db.

## Technologies used

JSON DB stands on the shoulders of giants. You can think of JSON DB as the product of the following :

1. [**Fastify:**](https://fastify.dev/) Fastify is a web framework highly focused on providing the best developer experience with the least overhead and a powerful plugin architecture.
2. [**Snappy:**](https://www.npmjs.com/package/snappy) Fastest Snappy compression library in Node.js, powered by napi-rs and rust-snappy.

## Getting started

Run the dev server with this command: `npm run dev:server`. Import the client class into any file to run the client side api like shown below.

`import JsonDbClient from './src/client'

    const client = new JsonDbClient('4354', '127.0.0.1')

    ;(async () => {
        const usersCollection = client.collection('users')
        
        await usersCollection.insert({ name: 'Ram Sharma', age: 19 })
        await usersCollection.insert({ name: 'John Mack', age: 19 })
        await usersCollection.insert({ name: 'Mack Remariz', age: 29 })
        await usersCollection.insert({ name: 'Sid Gupta', age: 49 })
        await usersCollection.insert({ name: 'Yaun Lee', age: 39 })
        await usersCollection.insert({ name: 'Lee Hun Jin', age: 29 })
    
        await usersCollection.update({ name:'Ram Sharma' }, {age:30})
        
        console.log(await usersCollection.filterOne({name:'Ram Sharma'}), { name: 'Ram Sharma', age: 30 })
    
        await usersCollection.delete({name:'Ram Sharma 2'})
    
        console.log(await usersCollection.filterOne({name:'Ram Sharma 2'}))
    })()`


## Feature set

This project is still in early alpha, so we have many features soon to come! Check the table below to see the status of each feature.

| Feature                                                                          | Status |
| -------------------------------------------------------------------------------- | ------ |
| Insert                                                                           | ✅     |
| Filter                                                                           | ✅     |
| List All Documents, w Count                                                      | ✅     |
| Update                                                                           | ✅     |
| Delete                                                                           | ✅     |
| Foreign Key Support                                                              | ⏳     |
| Projection                                                                       | ✅     |
| Indexing Support                                                                 | ⏳     |
| Compression Support                                                              | ⏳     |

-   ✅ = Ready to use
-   ⏳ = In progress

## Have an idea? Notice a bug?

We'd love to hear your feedback! Feel free to log an issue on our [GitHub issues page](https://github.com/tejas-janardhan/JSONDB).
