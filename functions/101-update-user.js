const moment = require('moment')
const { userRef } = require('@database/collections')

exports.updateUser = async (req, res) => {
    try {
        await userRef.doc('8c6QQw5yaTqiFk1gky3t').update({
            name: 'Minh edit',
            age: 11
        })
        res.status(200).send('Success')
    } catch (e) {
        console.log(e)
    }
}