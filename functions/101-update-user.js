const moment = require('moment')
const md5 = require('md5')
const fs = require('fs')
const jwt = require('jsonwebtoken')

const validation = require('@utils/validation')
const { userRef, tasksRef, groupRef, userGroupRef } = require('@database/collections')

function updateUserBundle() {

}

exports.updateUser = async (req, res) => {
    let response = false
    try {
        if (req.method !== 'PATCH') {
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
            res.end(JSON.stringify({msgCode: 10101,msgResp: 'Unauthorized'}))
            return
        }

        const payload = req.body

        let name = payload.name || null;
        if (!validation.string(name, 1, 256, false)) {
            res.writeHead(400, {});
            res.end(JSON.stringify({ msgCode: 10102, msgResp: 'Name is mandatory' }));
            return
        }

        let phone = payload.phone || null;
        if (!validation.phone(phone, false)) {
            res.writeHead(400, {});
            res.end(JSON.stringify({ msgCode: 10103, msgResp: 'Phone is mandatory' }));
            return
        }

        let photoUrl = payload.photoUrl || null;
        if (!validation.url(photoUrl, true)) {
          res.writeHead(400, {});
          res.end(JSON.stringify({ msgCode: 10104, msgResp: 'Invalid photo url' }));
          return
        }

        var userDoc = await userRef.doc(decoded.uid).get();
        if (!userDoc.exists) {
            res.writeHead(400, {});
            res.end(JSON.stringify({msgCode: 10105, msgResp: 'User not found'}))
            return;
        }

        let user = userDoc.data()
        user.id = userDoc.id

        var diff = moment().unix() - user.lastModifiedAt;
        if (diff < 20) {
        res.writeHead(400, {});
        res.end(JSON.stringify({msgCode: 10106, msgResp: 'Update will be allowed after '+(20 - diff)+'s'}))
        return;
        }

        try {
            await updateUserBundle()
        } catch (e) {
            res.writeHead(400, {});
            res.end(JSON.stringify({msgCode: 10107, msgResp: 'Can\'t update user'}))
            return;
        }

        res.writeHead(200, {});
        res.end(JSON.stringify({msgCode: 10100,msgResp: 'Success'}))
        return
    } catch (e) {
        console.log(e)
        res.writeHead(400, {});
        res.end(JSON.stringify({msgCode: 10199, msgResp: 'Unknown'}))
    }
}