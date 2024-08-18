const moment = require("moment");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const {userRef,groupRef, userGroupRef, admin} = require("@database/collections");

exports.listMyGroup = async (req,res) => {
    let responsed = false
    try {
        if (req.method !== 'GET') {
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
                msgCode: 12101,
                msgReps: 'Unauthorized'
            }))
            return
        }

        let userDoc = await userRef.doc(decoded.uid).get();
        if (!userDoc.exists) {
            res.writeHead(401, {});
            res.end(
              JSON.stringify({
                msgCode: 12102,
                msgReps: "User Not Found",
              })
            );
            return;
          }
      
        let user = userDoc.data();       
        user.id = userDoc.id;
        
        let groups = []
        let userGroupSnap = await userGroupRef.where('uid', '==', decoded.uid).get()
        let groupIds = [] 

        for (let i = 0; i < userGroupSnap.size; i++) {
            let userGroup = userGroupSnap.docs[0].data()
            groupIds.push(userGroup.groupId)
        }

        let groupSnaps = await groupRef.where(admin.firestore.FieldPath.documentId(),'in',groupIds).get()

        if (groupSnaps.size) {
            for (let i = 0; i < groupSnaps.size; i++) {
                let group = groupSnaps.docs[i].data()
                group.id = groupSnaps.docs[i].id
                delete group.coordinates
                groups.push(group)
            }
        }

        res.writeHead(200, {})
        res.end(JSON.stringify({
            msgCode: 12100,
            msgReps:groups
        }))
        responsed = true
        return
    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 12199,
                msgReps: 'Unknown'
            }))
            return
        }
    }
}
