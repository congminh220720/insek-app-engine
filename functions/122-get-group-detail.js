const fs = require("fs");
const jwt = require("jsonwebtoken");
const {userRef,groupRef} = require("@database/collections");
const validation = require("@utils/validation")

const {
    ACTIVE,
  } = require("@utils/constant");

exports.getGroupDetail = async (req,res) => {
    let responsed = false
    try {
        if (req.method !== 'GET') {
            res.status(403).send('Forbidden')
            return
        }

        var token = req.header('Authorization')

        if (token) {
            token = token.replace('Bearer', '').trim()
        }

        let publicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH,'utf8')
        let decoded = {}
        
        try {
            decoded = await jwt.verify(token, publicKey)
        } catch (e) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 12201,
                msgReps: 'Unauthorized'
            }))
            return
        }

        let userDoc = await userRef.doc(decoded.uid).get();
        if (!userDoc.exists) {
            res.writeHead(401, {});
            res.end(
              JSON.stringify({
                msgCode: 12202,
                msgReps: "User Not Found",
              })
            );
            return;
          }
      
        let user = userDoc.data();       
        user.id = userDoc.id;
        
       let groupId = req.query.groupId
       if (!validation.id(groupId, false)) {
            res.writeHead(401, {});
            res.end(
              JSON.stringify({
                msgCode: 12203,
                msgReps: "Invalid Group Id",
              })
            );
            return;
        }

        let groupDoc = await groupRef.doc(groupId).get()

        if (!groupDoc.exists) {
            res.writeHead(401, {});
            res.end(
              JSON.stringify({
                msgCode: 12204,
                msgReps: "Group Not Found",
              })
            );
            return;
        }

        let group = groupDoc.data()
        group = groupDoc.id

        if (group.active !== ACTIVE) {
            res.writeHead(401, {});
            res.end(
              JSON.stringify({
                msgCode: 12205,
                msgReps: "Group IS INACTIVE",
              })
            );
            return;
        }

        delete group.coordinates

        res.writeHead(200, {})
        res.end(JSON.stringify({
            msgCode: 12200,
            msgReps:group
        }))
        responsed = true
        return
    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 12299,
                msgReps: 'Unknown'
            }))
            return
        }
    }
}
