const fs = require("fs");
const jwt = require("jsonwebtoken");
const {groupRef,userGroupRef} = require("@database/collections");
const validation = require("@utils/validation")

exports.listMemberByGroup = async (req,res) => {
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
                msgCode: 12701,
                msgReps: 'Unauthorized'
            }))
            return
        }

        let groupId = req.query.groupId
        if (!validation.id(groupId, false)) {
             res.writeHead(401, {});
             res.end(
               JSON.stringify({
                 msgCode: 12702,
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
                msgCode: 12703,
                msgReps: "Group Not Found",
            })
            );
            return;
        }

        let group = groupDoc.data()
        group = groupDoc.id

        var userGroupSnap = await userGroupRef.where('groupId', '==', groupId).where('uid', '==', decoded.uid).get()

        if (userGroupSnap.empty) {
            res.writeHead(401, {});
            res.end(
            JSON.stringify({
                msgCode: 12704,
                msgReps: "You Are\'t not Member of This Group !",
            })
            );
            return;
        }
 
        var userGroupSnap = await userGroupRef.where('groupId', '==', groupId).get()
 
        if (userGroupSnap.empty) {
            res.writeHead(401, {});
            res.end(
            JSON.stringify({
                msgCode: 12705,
                msgReps: "Not Member Yet !",
            })
            );
            return;
        }

        let userGroups = []

        for (let i = 0; i < userGroupSnap.size; i++) {
            let userGroup = userGroupSnap.docs[i].data()
            userGroup.id = userGroupSnap.docs[i].id
            userGroups.push(userGroup)
        }

        res.writeHead(200, {})
        res.end(JSON.stringify({
            msgCode: 12700,
            msgReps:userGroups
        }))
        responsed = true
        return
    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 12700,
                msgReps: 'Unknown'
            }))
            return
        }
    }
}
