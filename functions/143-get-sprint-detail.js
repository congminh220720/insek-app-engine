const fs = require("fs");
const jwt = require("jsonwebtoken");
const {groupRef,userGroupRef,userRef,sprintRef} = require("@database/collections");
const validation = require("@utils/validation")

const { ADMIN, ASSISTANT, MEMBER } = require('@utils/constant');

exports.getSprintDetail = async (req,res) => {
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
                msgCode: 14301,
                msgReps: "Unauthorized",
              })
            );
            return;
          }

        let sprintId = req.query.id
        if (!validation.id(sprintId),false) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14302,
                msgReps: "Invalid Sprint Id",
                })
            )
            return
        }

        let sprintDoc = await sprintRef.doc(sprintId).get()
        if (!sprintDoc.exists) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14303,
                msgReps: "Sprint Not Found",
                })
            );
            return;
        }

        let sprint = sprintDoc.data()
        sprint.id = sprintDoc.id

        let userGroupSnap = await userGroupRef.where('groupId','==',sprint.groupId).where('uid','==', decoded.uid).where('role','in', [ADMIN, ASSISTANT,MEMBER]).get()

        if (userGroupSnap.empty) {
            res.writeHead(401, {});
            res.end(
                JSON.stringify({
                msgCode: 14304,
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
                msgCode: 14305,
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
                msgCode: 14306,
                msgReps: "User Is Inactive",
                })
            );
            return;
        }
    
        res.writeHead(201,{})
        res.end(JSON.stringify({
            msgCode: 14300,
            msgReps: sprint,
        }))
        responsed = true
        return 
    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 14399,
                msgReps: 'Unknown'
            }))
        }
        return
    }
}