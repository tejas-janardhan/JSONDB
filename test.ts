// THIS IS A TEST FILE TO TEST THE JSON DB CLIENT

import JsonDbClient from './src/client'

const client = new JsonDbClient('4354', '127.0.0.1')

;(async () => {
    console.log(
        await client.collection('users').filterOne({ id: '8d2893459a4ab26b' }),
    )
    // console.log(await client.collection('users').all())
    // await client.collection('users').insert({ name: 'Ram Sharma', age: 19 })
    // await client.collection('users').insert({ name: 'Ram Sharma 2', age: 19 })
    // await client.collection('users').insert({ name: 'Ram Sharma 3', age: 29 })
    // await client.collection('users').insert({ name: 'Ram Sharma 4', age: 49 })
    // await client.collection('users').insert({ name: 'Ram Sharma 5', age: 39 })
    // await client.collection('users').insert({ name: 'Ram Sharma 6', age: 29 })
})()
