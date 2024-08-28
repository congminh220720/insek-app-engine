const fs = require("fs");
const moment = require('moment')
const jwt = require("jsonwebtoken");
const {groupRef,userGroupRef,userRef,sprintRef, db, groupNotificationRef} = require("@database/collections");
const validation = require("@utils/validation")

const { ADMIN, ASSISTANT, OPENING } = require('@utils/constant');

const now = moment().unix()

async function createBundle(sprintDoc, group) {
    return new Promise (async (succeed, fail) => {
        try {
            const batch = db.batch()
            const id = sprintRef.doc().id 
            console.log(sprintDoc)
            try {
                await batch.set(sprintRef.doc(id), sprintDoc)
            } catch (e) {
                console.log(e)
                fail('Can\'t Create Sprint')
                return
            }

            // update total sprint group

            try {
                await batch.update(groupRef.doc(group.id), {
                    totalSprint: group.totalSprint + 1
                })
            } catch (e) {
                console.log(e)
                fail('Can\'t Update Total Sprint Group')
            }

            await batch.commit()
            succeed(id)

        } catch (e) {
            console.log(e)
            fail('Can\'t Create Sprint')
            return
        }
    })
}

exports.createSprintGroup = async (req,res) => {
    let responsed = false
    try {
        if (req.method !== "POST") {
            res.status(403).send("Forbidden");
            return;
          }
      
          var token = req.header("Authorization");
      
          if (token) {
            token = token.replace("Bearer", "").trim();
          }
      
          let publicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH, "utf8");
      
          let decoded = {};
      
          try {
            decoded = await jwt.verify(token, publicKey);
          } catch (e) {
            res.writeHead(401, {});
            res.end(
              JSON.stringify({
                msgCode: 14001,
                msgReps: "Unauthorized",
              })
            );
            return;
          }

        let payload = req.body

        let name = payload.name;
        if (!validation.string(name, 3, 280)) {
          res.writeHead(401, {});
          res.end(
            JSON.stringify({
              msgCode: 14002,
              msgReps: "Invalid Sprint Name",
            })
          );
          return;
        }

        let target = payload.target;
        if (!validation.string(target, 3, 1024, false)) {
          res.writeHead(401, {});
          res.end(
            JSON.stringify({
              msgCode: 14003,
              msgReps: "Invalid Target",
            })
          );
          return;
        }

        let closingAt = payload.closingAt
        if (!validation.timestamp(closingAt,false)) {
            if (closingAt <  now) {
                res.writeHead(401, {});
                res.end(
                    JSON.stringify({
                    msgCode: 14004,
                    msgReps: "Invalid Closing Date",
                    })
                );
                return;
            }
        }

        let groupId = payload.groupId
        if (!validation.id(groupId),false) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14005,
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
                msgCode: 14006,
                msgReps: "Group Not Found",
                })
            );
            return;
        }

        let group = groupDoc.data()
        group.id = groupDoc.id

        if (!group.active) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14007,
                msgReps: "Group Is Inactive",
                })
            );
            return;
        }

        let userGroupSnap = await userGroupRef.where('groupId','==',group.id).where('uid','==', decoded.uid).where('role','in', [ADMIN, ASSISTANT]).get()

        if (userGroupSnap.empty) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14008,
                msgReps: "Not Allow",
                })
            );
            return;
        }

        let userDoc = await userRef.doc(decoded.uid).get()

        if (!userDoc.exists) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14009,
                msgReps: "User Not Found",
                })
            );
            return;
        }

        let user = userDoc.data()
        user.id = userDoc.id

        if (!user.active) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14010,
                msgReps: "User Is Inactive",
                })
            );
            return;
        }

        let sprintSnap = await sprintRef.where('groupId', '==', group.id).where('status', '==', OPENING).get()

        if (!sprintSnap.empty) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14011,
                msgReps: "There Is A Sprint Running",
                })
            );
            return;
        }

        var sprintDoc = {
            name,
            target,
            closingAt,
            closingDate: moment.unix(closingAt).format('DD-MM-YYYY'),
            status:OPENING, 
            isDelete: false,
            deleteTime: null,
            totalTask: 0,
            taskComplete: 0,
            groupId: group.id,
            createdUserId: user.id,
            createdUserEmail: user.email,
            createdUserPhoto: user.photoUrl,
            createdUserEmail: user.email,
            createdUserPhone: user.phone,
        }

        try {
           var sprintId = await createBundle(sprintDoc, group)
        } catch (e) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14012,
                msgReps: "Can't Create Sprint",
                })
            );
            return;
        }

        sprintDoc.id = sprintId

        let groupNotificationDoc = {
            createdAt: moment().unix(),
            message: `${sprintDoc.name} just been created`,
            new: true,
            groupId: group.id,
            groupName: group.name,
            senderId: 'Insek System',
            senderName: 'Insek System',
            title: 'a sprint has just been created'
        }
  
        try {
            await groupNotificationRef.doc().create(groupNotificationDoc)
        } catch (e) {
            console.log({ msgCode: 14013, msgResp: 'Can\'t Send Notification', detail: e })
        }

        res.writeHead(201,{})
        res.end(JSON.stringify({
            msgCode: 14000,
            msgReps: sprintDoc,
        }))
        responsed = true
        return 

    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 14099,
                msgReps: 'Unknown'
            }))
        }
        return
    }
}