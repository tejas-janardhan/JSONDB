// THIS IS A TEST FILE TO TEST THE JSON DB CLIENT

import JsonDbClient from './src/client'

const client = new JsonDbClient('4354','127.0.0.1' )

client.collection

;(async () => {
    await client.collection('users').insert({ name: 'Ram Sharma', age: 19 })
})()
