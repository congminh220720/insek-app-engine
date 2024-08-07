const fs = require('fs')
const jwt = require('jsonwebtoken')

const { userRef } = require('@database/collections')

exports.getUserInfo = async (req, res) => {
    try {
        if (req.method !== 'GET') {
            res.status(403).send('Forbidden')
            return
        }

        let token = req.header('Authorization')

        if (token) {
            token = token.replace('Bearer','').trim()
        }

        let publicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH, 'utf8');
        let decoded = {}
        try {
            decoded = jwt.verify(token,publicKey)
        } catch (e) {
            console.log(e)
            res.writeHead(401, {});
            res.end(JSON.stringify({msgCode: 10301,msgResp: 'Unauthorized'}))
            return
        }
        const userId = decoded.uid

        let userDoc = await userRef.doc(userId).get()

        let user = userDoc.data()
        user.id = userDoc.id

        delete user.ipSet

        res.writeHead(200, {})
        res.end(JSON.stringify({ msgCode:10300, msgReps: user}))
        return


    } catch (e) {
        console.log(e)
        res.writeHead(400, {})
        res.end(JSON.stringify({msgCode: 10399, msgReps:'Unknown'}))
        return
    }
}