const fs = require("fs");
const moment = require('moment')
const jwt = require("jsonwebtoken");
const {userRef,groupRef,userGroupRef, db} = require("@database/collections");
const validation = require("@utils/validation")

const { ACTIVE, ADMIN, MEMBER } = require("@utils/constant");

exports.addMemberGroup = async (req,res) => {
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
                msgCode: 13001,
                msgReps: 'Unauthorized'
            }))
            return
        }

        let groupId = req.body.groupId
        if (!validation.id(groupId, false)) {
             res.writeHead(401, {});
             res.end(
               JSON.stringify({
                 msgCode: 13002,
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
                msgCode: 13003,
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
                msgCode: 13004,
                msgReps: "Group Is Inactive",
            })
            );
            return;
        }

        let userId = req.body.userId
        if (!validation.id(userId, false)) {
             res.writeHead(401, {});
             res.end(
               JSON.stringify({
                 msgCode: 13005,
                 msgReps: "Invalid User Id",
               })
             );
             return;
         }
 
         let userDoc = await userRef.doc(userId).get()
 
         if (!userDoc.exists) {
             res.writeHead(401, {});
             res.end(
               JSON.stringify({
                 msgCode: 13006,
                 msgReps: "Can\'t Find This User !",
               })
             );
             return;
         }
 
         let user = userDoc.data()
         user.id = userDoc.id
 
         if (user.active != ACTIVE) {
             res.writeHead(401, {});
             res.end(
               JSON.stringify({
                 msgCode: 13007,
                 msgReps: "This User Is Inactive",
               })
             );
             return;
        }

        let userGroupSnap = await userGroupRef.where('uid', '==', decoded.uid).where('groupId','==', groupId).where('role', '==', ADMIN).get()

        if (userGroupSnap.empty) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 13010,
                msgReps: 'You Are\'t Admin of This Group !'
            }))
            return
        }

        var userGroupDoc = {
            groupId: groupId,
            uid: user.id,
            role: MEMBER,
            photoUrl: user.photoUrl,
            uName: user.name,
            baned: false,
            approve: true,
            createdAt: moment().unix(),
            lastModifiedAt: 0,
            totalTaskAssigned: 0,
            totalTaskAssignDone: 0,
            totalTaskAssignProcess: 0,
        }

        try {
            await userGroupRef.doc().create(userGroupDoc)
        } catch (e) {
            console.log(e)
            res.writeHead(401, {});
            res.end(
            JSON.stringify({
                msgCode: 13011,
                msgReps: "Can\'t Add This User",
            })
            );
            return;
        }


        res.writeHead(200, {})
        res.end(JSON.stringify({
            msgCode: 13000,
            msgReps:'Add Member Success'
        }))
        responsed = true

        try {
            await groupRef.doc(group.id).update({
                totalMember: group.totalMember + 1
            })
        } catch (e) {
            console.log('Can\'t Update Total Member')
        }

        return
    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 13099,
                msgReps: 'Unknown'
            }))
            return
        }
    }
}
