// THIS IS A TEST FILE TO TEST THE JSON DB CLIENT
// TESTED - INSERT - ALL - FILTER
// TESTED - DELETE ONE AND MANY, UPDATE ONE AND MANY
// TO TEST CHUNCKS


import JsonDbClient from './src/client'

const client = new JsonDbClient('4354', '127.0.0.1')

;(async () => {
    // for(let i=0;i<1000;i++){
    const usersCollection = client.collection('users')
    
    await usersCollection.insert({ name: 'Ram Sharma', age: 19 })
    await usersCollection.insert({ name: 'Ram Sharma 2', age: 19 })
    await usersCollection.insert({ name: 'Ram Sharma 3', age: 29 })
    await usersCollection.insert({ name: 'Ram Sharma 4', age: 49 })
    await usersCollection.insert({ name: 'Ram Sharma 5', age: 39 })
    await usersCollection.insert({ name: 'Ram Sharma 6', age: 29 })
    // }

    await usersCollection.update({name:'Ram Sharma'}, {age:30})
    
    console.log(await usersCollection.filterOne({name:'Ram Sharma'}), { name: 'Ram Sharma', age: 30 })

    await usersCollection.delete({name:'Ram Sharma 2'})

    console.log(await usersCollection.filterOne({name:'Ram Sharma 2'}))
})()
