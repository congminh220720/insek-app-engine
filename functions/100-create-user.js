const moment = require('moment')
const md5 = require('md5')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken')

const validation = require('@utils/validation')
const { userRef } = require('@database/collections')

function get(host, port, path, token) {
    return new Promise(async function(succeed, fail) {
      var headers = {
        'User-Agent': 'Co-bee web/1.0'
      };
      if (token) {
        headers['Authorization'] = token;
      }
  
      const https = require('https');
      const options = {
        hostname: host,
        port: port,
        path: path,
        method: 'GET',
        headers: headers
      };
  
      const request = https.request(options, response => {
        var data = '';
        response.on('data', chunk => {
          data += chunk;
        });
  
        response.on('end', () => {
          var body = null;
          try {
            body = JSON.parse(data);
          } catch (err) {}
  
          if (body == null) {
            fail(response.statusCode);
            return;
          }
  
          if (~~(response.statusCode / 100) == 2) {
            succeed(body);
          } else {
            fail(body);
          }
        });
      });
  
      request.on('error', err => {
        fail(-1);
      });
  
      request.end();
    });
  };

exports.createUser = async (req, res) => {
    let responsed = false
    try {
        if (req.method !== "POST") {
            res.status(400).send('Forbidden')
            return
        }
        let passwordRequired = true;
        const payload = req.body

        let email = payload.email
        if(!validation.email(email, false)) {
            res.writeHead(400, {});
            res.end(JSON.stringify({ msgCode: 10001, msgResp: 'Invalid email' }));
            return
        }

        let password = payload.password || null;
        let linkedGGAccount = payload.linkedGGAccount
        if (linkedGGAccount) {
            passwordRequired = false
            let userSnap = await userRef.where('linkedGGAccount', '==', linkedGGAccount).get()
            if (userSnap.size > 1) {
                res.writeHead(400, {})
                res.end(JSON.stringify({ msgCode: 10002, msgReps: 'Google account has been linked'})) 
                return
            }

        let accessToken = payload.accessToken;
        if (!validation.string(accessToken, 0, 1024, false)) {
            res.writeHead(400, {});
            res.end(JSON.stringify({ msgCode: 10003, msgResp: 'Invalid access token'}));
            return;
        }

        var result = await get('www.googleapis.com', 443, '/oauth2/v3/tokeninfo', 'Bearer '+accessToken)
        console.log(result)
        if (result.sub != linkedGGAccount) {
            res.writeHead(400, {});
            res.end(JSON.stringify({ msgCode: 10004, msgResp: 'Account not matching'}))
            return;
        }
        }

        if (passwordRequired) {
            if (!validation.string(password, 4, 64, false)) {
                res.writeHead(400, {});
                res.end(JSON.stringify({ msgCode: 10005, msgResp: 'Invalid password' }));
                return
            }
        }

        let name = payload.name || null;
        if (!validation.string(name, 1, 256, false)) {
            res.writeHead(400, {});
            res.end(JSON.stringify({ msgCode: 10006, msgResp: 'Name is mandatory' }));
            return
        }

        let phone = payload.phone || null;
        parseInt(phone)
        if (!validation.phone(phone, false)) {
            res.writeHead(400, {});
            res.end(JSON.stringify({ msgCode: 10007, msgResp: 'Phone is mandatory' }));
            return
        }

        var snap = await userRef.where('email', '==', email).get();
        if (snap.size > 0) {
            res.writeHead(400, {});
            res.end(JSON.stringify({ msgCode: 10008, msgResp: 'Email is taken' }));
            return
        }

        let photoUrl = payload.photoUrl || null;
        if (!validation.url(photoUrl, true)) {
          res.writeHead(400, {});
          res.end(JSON.stringify({ msgCode: 10008, msgResp: 'Invalid photo url' }));
          return
        }

        var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null);
        ip = ip.split(',')[0];

        let doc = {
            email: email,
            password: password ? md5(password) : null,
            name: name,
            phone: phone,
            createdAt: moment().unix(),
            photoUrl: photoUrl,
            lastModifiedAt: 0,
            loginTryCount: 0,
            loginLockedTime: 0,
            codeToResetPassword: 0,
            resetPasswordRequestTime: 0,
            linkedGGAccount: linkedGGAccount || null,
            ipSet: [ip],
          };
      
        try {
            var added = await userRef.add(doc);
            doc.id = added.id;
        }catch (e) {
            res.writeHead(400, {});
            res.end(JSON.stringify({ msgCode: 10009, msgResp: 'Can\'t add user' }));
            return
        }

        let privKey = fs.readFileSync(process.env.JWT_PRIVATE_KEY_PATH, 'utf8');
        let tokenData = {
        iss: 'Insek',
        aud: doc.email,
        jti: uuidv4(),
        exp: Math.floor(Date.now() / 1000) + parseInt(process.env.JWT_TOKEN_PERIOD),
        iat: Math.floor(Date.now() / 1000),
        uid: doc.id,
        version: 1,
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        photoUrl: photoUrl,
        }

        token = jwt.sign(tokenData, privKey, {algorithm: 'ES256'});

        res.writeHead(201, {});
        res.end(JSON.stringify({ msgCode: 10000,msgResp: {token: token}}))
        responsed = true;
    } catch (e) {
        console.log(e);
        if (!responsed) {
        res.writeHead(400, {});
        res.end(JSON.stringify({ msgCode: 10099, msgResp: 'Unknown'}))}
    }
}