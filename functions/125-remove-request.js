const fs = require("fs");
const jwt = require("jsonwebtoken");
const {groupRef,userGroupRef} = require("@database/collections");
const validation = require("@utils/validation")

const { ACTIVE, ADMIN} = require("@utils/constant");

exports.removeRequest = async (req,res) => {
    let responsed = false
    try {
        if (req.method !== 'DELETE') {
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
                msgCode: 12501,
                msgReps: 'Unauthorized'
            }))
            return
        }

        let groupId = req.body.groupId
        if (!validation.id(groupId, false)) {
             res.writeHead(401, {});
             res.end(
               JSON.stringify({
                 msgCode: 12502,
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
                msgCode: 12503,
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
                msgCode: 12504,
                msgReps: "Group Is Inactive",
            })
            );
            return;
        }

        let userGroupId = req.query.userGroupId
        if (!validation.id(userGroupId, false)) {
             res.writeHead(401, {});
             res.end(
               JSON.stringify({
                 msgCode: 12505,
                 msgReps: "Invalid Group Id",
               })
             );
             return;
         }
 
         let userGroupDoc = await userGroupRef.doc(userGroupId).get()
 
         if (!userGroupDoc.exists) {
             res.writeHead(401, {});
             res.end(
               JSON.stringify({
                 msgCode: 12506,
                 msgReps: "User Group Not Found",
               })
             );
             return;
         }
 
         let userGroup = userGroupDoc.data()
         userGroup = userGroupDoc.id
 
        if (userGroup.approve == true) {
             res.writeHead(401, {});
             res.end(
               JSON.stringify({
                 msgCode: 12507,
                 msgReps: "This User have Approved",
               })
             );
             return;
        }

        let userGroupSnap = await userGroupRef.where('uid', '==', decoded.uid).where('groupId','==', groupId).where('role', '==', ADMIN).get()

        if (userGroupSnap.empty) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 12508,
                msgReps: 'You Are\'t Admin of This Group !'
            }))
            return
        }

        try {
            await userGroupRef.doc(userGroup.id).delete()
        } catch (e) {
            res.writeHead(401, {});
            res.end(
            JSON.stringify({
                msgCode: 12510,
                msgReps: "Can\'t Delete Request",
            })
            );
            return;
        }

        res.writeHead(200, {})
        res.end(JSON.stringify({
            msgCode: 12500,
            msgReps:'Send Request Join Group Success'
        }))
        responsed = true
        return

    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 12599,
                msgReps: 'Unknown'
            }))
            return
        }
    }
}
