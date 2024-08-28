const fs = require("fs");
const moment = require('moment')
const jwt = require("jsonwebtoken");
const {userRef,groupRef,userGroupRef,db, groupNotificationRef} = require("@database/collections");
const validation = require("@utils/validation")

const { ACTIVE, ADMIN } = require("@utils/constant");

async function leaveGroupBundle(userGroupId, authorization) {
    return new Promise(async (succeed, fail) => {
        const batch = db.batch()
        try {
             // authorization
            if (authorization.authorizedPersonId) {
                try {
                    await batch.update(userGroupRef.doc(authorization.userGroupId), {
                        role: 3,
                        lastModifiedAt: moment().unix()
                    })
                } catch (e) {
                    console.log(e)
                    fail('Can\'t empowerment')
                    return
                }
            }

            try {
                await batch.delete(userGroupRef.doc(userGroupId))
            } catch (e) {
                console.log(e)
                fail('Can\'t leave group')
                return
            }

            succeed('ok')
        } catch (e) {
            console.log(e)
                fail('Can\'t leave group')
                return
        }
    }) 
}

exports.leaveGroup = async (req,res) => {
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
                msgCode: 12901,
                msgReps: 'Unauthorized'
            }))
            return
        }

        let groupId = req.body.groupId
        if (!validation.id(groupId, false)) {
             res.writeHead(401, {});
             res.end(
               JSON.stringify({
                 msgCode: 12902,
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
                msgCode: 12903,
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
                msgCode: 12904,
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
                 msgCode: 12905,
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
                 msgCode: 12906,
                 msgReps: "Can\'t Find This User In Group !",
               })
             );
             return;
         }
 
         let userGroup = userGroupDoc.data()
         userGroup.id = userGroupDoc.id
 
         if (userGroup.approve == false) {
             res.writeHead(401, {});
             res.end(
               JSON.stringify({
                 msgCode: 12907,
                 msgReps: "You Are\'t Member Of This Group",
               })
             );
             return;
        }

        let userDoc = await userRef.doc(userGroup.uid).get();
        if (!userDoc.exists) {
            res.writeHead(401, {});
            res.end(
              JSON.stringify({
                msgCode: 12908,
                msgReps: "User Not Found",
              })
            );
            return;
          }
      
        let user = userDoc.data();       
        user.id = userDoc.id;

        let userGroupSnap = await userGroupRef.where('uid', '==', decoded.uid).where('groupId','==', groupId).where('role', '==', ADMIN).get()

        let authorization = {}

        if (userGroupSnap.size) {
           let authorizedPersonId = req.body.authorizedPersonId

           if (!validation.id(authorizedPersonId,false)) {
            res.writeHead(401, {});
                res.end(
                JSON.stringify({
                    msgCode: 12910,
                    msgReps: "Invalid Authorized User Id",
                })
                );
                return;
           }

           let userDoc = await userRef.doc(authorizedPersonId).get();
            if (!userDoc.exists) {
                res.writeHead(401, {});
                res.end(
                JSON.stringify({
                    msgCode: 12911,
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
                    msgCode: 12912,
                    msgReps: "User Is InActive",
                })
                );
                return;
            }

            let userGroupSnap = await userGroupRef.where('uid', '==', user.id).where('groupId','==', groupId).get()

            if (userGroupSnap.empty) {
                res.writeHead(401, {});
                res.end(
                JSON.stringify({
                    msgCode: 12913,
                    msgReps: "Not A Member Of This Group",
                })
                );
                return;
            }

            authorization['authorizedPersonId'] = authorizedPersonId
            authorization['userGroupId'] = userGroupSnap.docs[0].id
        }

        try {
            await leaveGroupBundle(userGroup.id,authorization)
        } catch (e) {
            console.log(e)
            res.writeHead(401, {});
            res.end(
            JSON.stringify({
                msgCode: 12914,
                msgReps: "Can\'t Approve This Request",
            })
            );
            return;
        }

        let groupNotificationDoc = {
            createdAt: moment().unix(),
            message: `${user.name} just leaved the group`,
            new: true,
            groupId: group.id,
            groupName: groupUpdateDoc.name || group.name,
            senderId: 'Insek System',
            senderName: 'Insek System',
            title: 'leave the group'
        }

        try {
            await groupNotificationRef.doc().create(groupNotificationDoc)
        } catch (e) {
            console.log({ msgCode: 12915, msgResp: 'Can\'t Send Notification', detail: e })
        }

        res.writeHead(200, {})
        res.end(JSON.stringify({
            msgCode: 12900,
            msgReps:'Leave Group Success'
        }))
        responsed = true
        return
    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 12999,
                msgReps: 'Unknown'
            }))
            return
        }
    }
}
