const fs = require("fs");
const moment = require('moment')
const jwt = require("jsonwebtoken");
const {groupRef,userGroupRef,userRef,sprintRef, db} = require("@database/collections");
const validation = require("@utils/validation")

const { ADMIN, ASSISTANT, OPENING, CLOSED } = require('@utils/constant');

const now = moment().unix()

exports.updateSprintGroup = async (req,res) => {
    let responsed = false
    try {
        if (req.method !== "PATCH") {
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
                msgCode: 14101,
                msgReps: "Unauthorized",
              })
            );
            return;
          }

        let payload = req.body
        let sprintUpdateDoc = {}

        let name = payload.name;
        if (name !== undefined) {
            if (!validation.string(name, 3, 280)) {
                res.writeHead(401, {});
                res.end(
                  JSON.stringify({
                    msgCode: 14102,
                    msgReps: "Invalid Sprint Name",
                  })
                );
                return;
            }
            sprintUpdateDoc['name'] = name
        }
       

        let target = payload.target;
        if (target !== undefined) {
            if (!validation.string(target, 3, 1024, false)) {
                res.writeHead(401, {});
                res.end(
                  JSON.stringify({
                    msgCode: 14103,
                    msgReps: "Invalid Target",
                  })
                );
                return;
            }
            sprintUpdateDoc['target'] = target
        }


        let closingAt = payload.closingAt
        if (closingAt !== undefined) {
            if (!validation.timestamp(closingAt,false)) {
                if (closingAt < now) {
                    res.writeHead(401, {});
                    res.end(
                        JSON.stringify({
                        msgCode: 14104,
                        msgReps: "Invalid Closing Date",
                        })
                    );
                    return;
                }
            }
            sprintUpdateDoc['closingAt'] = closingAt
            sprintUpdateDoc['closingDate'] = moment.unix(closingAt).format('DD-MM-YYYY')
        }

        let status = payload.status
        if (status !== undefined) {
            if (![OPENING,CLOSED].includes(status)) {
                if (closingAt < now) {
                    res.writeHead(401, {});
                    res.end(
                        JSON.stringify({
                        msgCode: 14105,
                        msgReps: "Invalid Status",
                        })
                    );
                    return;
                }
            }
            sprintUpdateDoc['status'] = status
        }


        let groupId = payload.groupId
        if (!validation.id(groupId),false) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14106,
                msgReps: "Invalid Group Id",
                })
            );
            return;
        }

        let sprintId = req.query.id
        if (!validation.id(sprintId), false) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14107,
                msgReps: "Invalid Sprint Id",
                })
            );
            return;
        }

        let groupDoc = await groupRef.doc(groupId).get()

        if (!groupDoc.exists) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14108,
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
                msgCode: 14109,
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
                msgCode: 14110,
                msgReps: "Not Allow",
                })
            );
            return;
        }

        let sprintDoc = await sprintRef.doc(sprintId).get()

        if (!sprintDoc.exists) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14111,
                msgReps: "Sprint Not Found",
                })
            );
            return;
        }

        let sprint = sprintDoc.data()
        sprint.id = sprintDoc.id

        if (status == OPENING) {
            if (sprint.closingAt < now) {
                res.writeHead(401, {});
                res.end(
                    JSON.stringify({
                    msgCode: 14112,
                    msgReps: "Sprint IS Closed",
                    })
                );
                return;
            }
        }

        let userDoc = await userRef.doc(decoded.uid).get()

        if (!userDoc.exists) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14113,
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
                msgCode: 14114,
                msgReps: "User Is Inactive",
                })
            );
            return;
        }

        try {
            sprintUpdateDoc['lastModifiedAt'] = moment().unix()
            await sprintRef.doc(sprintId).update(sprintUpdateDoc)
        } catch (e) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14115,
                msgReps: "Can't Update Sprint",
                })
            );
            return;
        }

        res.writeHead(201,{})
        res.end(JSON.stringify({
            msgCode: 14100,
            msgReps: 'success',
        }))
        responsed = true
        return 

    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 14199,
                msgReps: 'Unknown'
            }))
        }
        return
    }
}