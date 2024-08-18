const fs = require("fs");
const jwt = require("jsonwebtoken");
const {userRef,groupRef,userGroupRef} = require("@database/collections");
const validation = require("@utils/validation")

const { ACTIVE } = require("@utils/constant");

exports.joinGroup = async (req,res) => {
    let responsed = false
    try {
        if (req.method !== 'POST') {
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
                msgCode: 12301,
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

        if (user.active !== ACTIVE) {
            res.writeHead(401, {});
            res.end(
              JSON.stringify({
                msgCode: 12303,
                msgReps: "You Account Is Inactive",
              })
            );
            return;
        }
        
       let groupId = req.query.groupId
       if (!validation.id(groupId, false)) {
            res.writeHead(401, {});
            res.end(
              JSON.stringify({
                msgCode: 12304,
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
                msgCode: 12305,
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
                msgCode: 12306,
                msgReps: "Group Is Inactive",
              })
            );
            return;
        }

        var userGroupDoc = {
            groupId: groupId,
            uid: user.id,
            photoUrl: user.photoUrl,
            role: 1,
            uName: user.name,
            baned: false,
            approve: false,
            createdAt: moment().unix(),
            lastModifiedAt: 0,
            totalTaskAssigned: 0,
            totalTaskAssignDone: 0,
            totalTaskAssignProcess: 0,
        };


        try {
            const id = userGroupRef.doc().id
            await userGroupRef.doc(id).create(userGroupDoc)
        } catch (e) {
            res.writeHead(401, {});
            res.end(
              JSON.stringify({
                msgCode: 12307,
                msgReps: "You Can\'t Join This Group !",
              })
            );
            return;
        }
      
        res.writeHead(200, {})
        res.end(JSON.stringify({
            msgCode: 12300,
            msgReps:'Send Request Join Group Success'
        }))
        responsed = true
        return
    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 12399,
                msgReps: 'Unknown'
            }))
            return
        }
    }
}
