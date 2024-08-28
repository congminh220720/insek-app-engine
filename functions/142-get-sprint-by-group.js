const fs = require("fs");
const jwt = require("jsonwebtoken");
const {groupRef,userGroupRef,userRef,sprintRef} = require("@database/collections");
const validation = require("@utils/validation")

const { ADMIN, ASSISTANT, MEMBER } = require('@utils/constant');

exports.getSprintByGroup = async (req,res) => {
    let responsed = false
    try {
        if (req.method !== "GET") {
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
                msgCode: 14201,
                msgReps: "Unauthorized",
              })
            );
            return;
          }

        let groupId = req.query.groupId
        if (!validation.id(groupId),false) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14202,
                msgReps: "Invalid Group Id",
                })
            )
            return
        }

        let groupDoc = await groupRef.doc(groupId).get()

        if (!groupDoc.exists) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14203,
                msgReps: "Group Not Found",
                })
            );
            return;
        }

        let group = groupDoc.data()
        group.id = groupDoc.id

        let userGroupSnap = await userGroupRef.where('groupId','==',group.id).where('uid','==', decoded.uid).where('role','in', [ADMIN, ASSISTANT,MEMBER]).get()

        if (userGroupSnap.empty) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14204,
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
                msgCode: 14205,
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
                msgCode: 14206,
                msgReps: "User Is Inactive",
                })
            );
            return;
        }

        let sprints = []
        let sprintSnap = await sprintRef.where('groupId', '==', group.id).get()

        for (let i = 0; i < sprintSnap.size; i++) {
            const sprint = sprintSnap.docs[0].data()
            sprint.id = sprintSnap.docs[0].id
            sprints.push(sprint)
        }

        sprints.sort((a,b) => b.createdAt - a.createdAt)

        res.writeHead(200,{})
        res.end(JSON.stringify({
            msgCode: 14200,
            msgReps: sprints,
        }))
        responsed = true
        return 

    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 14299,
                msgReps: 'Unknown'
            }))
        }
        return
    }
}