const moment = require('moment')
const db = require('@database/connectdb')

// declare collection
const userRef = db.collection('user')

exports.createUser = async (req, res) => {
    try {
        await userRef.add({
            name: 'Minh',
            age: 10
        })
    } catch (e) {
        console.log(e)
    }
}