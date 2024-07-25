const moment = require('moment')
const { userRef } = require('@database/collections')

exports.createUser = async (req, res) => {
    try {
        await userRef.add({
            name: 'Minh',
            age: 10
        })
        res.status(201).send('Success')
    } catch (e) {
        console.log(e)
    }
}