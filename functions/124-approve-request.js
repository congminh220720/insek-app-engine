const fs = require("fs");
const jwt = require("jsonwebtoken");
const {userRef,groupRef,userGroupRef} = require("@database/collections");
const validation = require("@utils/validation")

const { ACTIVE, ADMIN } = require("@utils/constant");

exports.approveRequest = async (req,res) => {
    let responsed = false
    try {
        if (req.method !== 'PATCH') {
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
                msgCode: 12401,
                msgReps: 'Unauthorized'
            }))
            return
        }

        let groupId = req.body.groupId
        if (!validation.id(groupId, false)) {
             res.writeHead(401, {});
             res.end(
               JSON.stringify({
                 msgCode: 12402,
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
                msgCode: 12403,
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
                msgCode: 12404,
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
                 msgCode: 12405,
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
                 msgCode: 12406,
                 msgReps: "Can\'t Find This User In Group !",
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
                 msgCode: 12407,
                 msgReps: "This User Has Approved",
               })
             );
             return;
        }

        let userDoc = await userRef.doc(userGroup.uid).get();
        if (!userDoc.exists) {
            res.writeHead(401, {});
            res.end(
              JSON.stringify({
                msgCode: 12408,
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
                msgCode: 12409,
                msgReps: "This Account Is Inactive",
              })
            );
            return;
        }

        let userGroupSnap = await userGroupRef.where('uid', '==', decoded.uid).where('groupId','==', groupId).where('role', '==', ADMIN).get()

        if (userGroupSnap.empty) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 12410,
                msgReps: 'You Are\'t Admin of This Group !'
            }))
            return
        }

        try {
            await userGroupRef.doc(userGroup.id).update({
                approve: true,
                lastModifiedAt: moment().unix()
            })
        } catch (e) {
            res.writeHead(401, {});
            res.end(
            JSON.stringify({
                msgCode: 12411,
                msgReps: "Can\'t Approve This Request",
            })
            );
            return;
        }

        res.writeHead(200, {})
        res.end(JSON.stringify({
            msgCode: 12400,
            msgReps:'Send Request Join Group Success'
        }))
        responsed = true
        return
    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 12499,
                msgReps: 'Unknown'
            }))
            return
        }
    }
}
