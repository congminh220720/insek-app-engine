const fs = require("fs");
const moment = require('moment')
const jwt = require("jsonwebtoken");
const {userRef,groupRef,userGroupRef, groupNotificationRef} = require("@database/collections");
const validation = require("@utils/validation")

const { ACTIVE, ADMIN } = require("@utils/constant");

exports.banMember = async (req,res) => {
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
                msgCode: 12601,
                msgReps: 'Unauthorized'
            }))
            return
        }

        let groupId = req.query.groupId
        if (!validation.id(groupId, false)) {
             res.writeHead(401, {});
             res.end(
               JSON.stringify({
                 msgCode: 12602,
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
                msgCode: 12603,
                msgReps: "Group Not Found",
            })
            );
            return;
        }

        let group = groupDoc.data()
        group.id = groupDoc.id

        if (group.active !== ACTIVE) {
            res.writeHead(401, {});
            res.end(
            JSON.stringify({
                msgCode: 12604,
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
                 msgCode: 12605,
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
                 msgCode: 12606,
                 msgReps: "This User Out Side Group",
               })
             );
             return;
         }
 
         let userGroup = userGroupDoc.data()
         userGroup.id = userGroupDoc.id
 

        let userDoc = await userRef.doc(userGroup.uid).get();
        if (!userDoc.exists) {
            res.writeHead(401, {});
            res.end(
              JSON.stringify({
                msgCode: 12607,
                msgReps: "User Not Found",
              })
            );
            return;
          }
      
        let user = userDoc.data();       
        user.id = userDoc.id;


        let userGroupSnap = await userGroupRef.where('uid', '==', decoded.uid).where('groupId','==', groupId).where('role', '==', ADMIN).get()

        if (userGroupSnap.empty) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 12608,
                msgReps: 'You Are\'t Admin of This Group !'
            }))
            return
        }

        try {
            await userGroupRef.doc(userGroup.id).update({
                baned: true,
                lastModifiedAt: moment().unix()
            })
        } catch (e) {
            console.log(e)
            res.writeHead(401, {});
            res.end(
            JSON.stringify({
                msgCode: 12609,
                msgReps: "Can\'t Ban This Member",
            })
            );
            return;
        }

        let groupNotificationDoc = {
            createdAt: moment().unix(),
            message: `${user.name} just baned on group`,
            new: true,
            groupId: group.id,
            groupName: group.name,
            senderId: 'Insek System',
            senderName: 'Insek System',
            title: 'ban member'
        }
  
        try {
            await groupNotificationRef.doc().create(groupNotificationDoc)
        } catch (e) {
            console.log({ msgCode: 12610, msgResp: 'Can\'t Send Notification', detail: e })
        }

        res.writeHead(200, {})
        res.end(JSON.stringify({
            msgCode: 12600,
            msgReps:'success'
        }))
        responsed = true
        return
    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 12699,
                msgReps: 'Unknown'
            }))
            return
        }
    }
}
