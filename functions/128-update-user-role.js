const fs = require("fs");
const jwt = require("jsonwebtoken");
const {userRef,groupRef,userGroupRef} = require("@database/collections");
const validation = require("@utils/validation")

const { ACTIVE, ADMIN} = require("@utils/constant");

exports.UpdateRoleUser = async (req,res) => {
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
                msgCode: 12801,
                msgReps: 'Unauthorized'
            }))
            return
        }

        let groupId = req.body.groupId
        if (!validation.id(groupId, false)) {
             res.writeHead(401, {});
             res.end(
               JSON.stringify({
                 msgCode: 12802,
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
                msgCode: 12803,
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
                msgCode: 12804,
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
                 msgCode: 12805,
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
                 msgCode: 12806,
                 msgReps: "Can\'t Find This User In Group !",
               })
             );
             return;
         }
 
         let userGroup = userGroupDoc.data()
         userGroup = userGroupDoc.id
 
         if (userGroup.approve == false) {
             res.writeHead(401, {});
             res.end(
               JSON.stringify({
                 msgCode: 12807,
                 msgReps: "This User Hasn\'t Approve Yet",
               })
             );
             return;
        }

        let userDoc = await userRef.doc(userGroup.uid).get();
        if (!userDoc.exists) {
            res.writeHead(401, {});
            res.end(
              JSON.stringify({
                msgCode: 12808,
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
                msgCode: 12809,
                msgReps: "This Account Is Inactive",
              })
            );
            return;
        }

        let userGroupSnap = await userGroupRef.where('uid', '==', decoded.uid).where('groupId','==', groupId).where('role', '==', ADMIN).get()

        if (userGroupSnap.empty) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 12810,
                msgReps: 'You Are\'t Admin of This Group !'
            }))
            return
        }

        let role = req.body.role
        if (![ADMIN,ASSISTANT,MEMBER].includes(role)) {
            res.end(JSON.stringify({
                msgCode: 12811,
                msgReps: 'This Role Not Approve Yet'
            }))
            return
        }

        if (![])
        try {
            await userGroupRef.doc(userGroup.id).update({
                role: role,
                lastModifiedAt: moment().unix()
            })
        } catch (e) {
            res.writeHead(401, {});
            res.end(
            JSON.stringify({
                msgCode: 12812,
                msgReps: "Can\'t Approve This Request",
            })
            );
            return;
        }

        res.writeHead(200, {})
        res.end(JSON.stringify({
            msgCode: 12800,
            msgReps:'Send Request Join Group Success'
        }))
        responsed = true
        return
    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 12899,
                msgReps: 'Unknown'
            }))
            return
        }
    }
}
