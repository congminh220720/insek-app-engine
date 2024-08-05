const moment = require('moment')
const md5 = require('md5')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken')

const validation = require('@utils/validation')
const { userRef } = require('@database/collections')

exports.login = async (req,res) => {
    let responsed = false
    try {
        if (req.method !== 'POST') {
            res.status(400).send('Forbidden')
            return
        }

        const payload = req.body

        let email = payload.email
        if (!validation.email(email, false)) {
            res.writeHead(400, {})
            res.end(JSON.stringify({ msgCode: 10201, msgReps: 'Invalid Email'}))
            return
        }

        let password = payload.password ||  null
        if (!validation.password(password)) {
            res.writeHead(400, {});
            res.end(JSON.stringify({ msgCode: 10202, msgResp: 'Invalid account ID/password'}))
            return;
        }

        let userSnap = await userRef.where('email','==', email).get()
        if (userSnap.empty) {
            res.writeHead(400, {});
            res.end(JSON.stringify({ msgCode: 10203, msgResp: 'Invalid account ID/password'}))
            return;
        }

        let user = userSnap.docs[0].data();
        user.id = userSnap.docs[0].id;
        var lockedTimeCoeff = parseInt(process.env.LOCKED_TIME_COEFFICIENT);
        var allowedRetries = parseInt(process.env.ALLOW_LOGIN_RETRIES);

        if (moment().unix() <= user.loginLockedTime) {
            res.writeHead(400, {});
            res.end(JSON.stringify({ msgCode: 10204, msgResp: 'User account got locked in ' + (lockedTimeCoeff * (user.loginTryCount - allowedRetries)) + ' seconds'}))
            return;
        }

        let ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null);
        ip = ip.split(',')[0];
        let ipSet = new Set(user.ipSet);
        ipSet.add(ip);
    
        let update = {
          loginTryCount: 0,
          ipSet: Array.from(ipSet),
        };
    
        await userRef.doc(user.id).update(update);
        let privKey = fs.readFileSync(process.env.JWT_PRIVATE_KEY_PATH);
        let tokenData = {
            iss: 'Insek',
            aud: user.email,
            jti: uuidv4(),
            exp: Math.floor(Date.now() / 1000) + parseInt(process.env.JWT_TOKEN_PERIOD),
            iat: Math.floor(Date.now() / 1000),
            uid: user.id,
            version: 1,
            name: user.name,
            email: user.email,
            phone: user.phone,
            photoUrl: user.photoUrl,
        };
        var token = jwt.sign(tokenData, privKey, {algorithm: 'ES256'});
    
        res.writeHead(200, {});
        res.end(JSON.stringify({ msgCode: 10200, msgResp: {token: token} }))
        responsed = true
    } catch (e) {
        console.log(e);
        if (!responsed) {
        res.writeHead(400, {});
        res.end(JSON.stringify({ msgCode: 10299,msgResp: 'Unknown'}))}
    }
}