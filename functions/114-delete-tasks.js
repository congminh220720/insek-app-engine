const moment = require("moment");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const validation = require("@utils/validation");
const {userRef,tasksRef, groupRef, userGroupRef, admin, db} = require("@database/collections");
const { ADMIN } = require("@utils/constant");

exports.deleteTasks = async (req, res) => {
    let responsed = false
    try {
        if (req.method !== 'POST') {
            res.status(403).send('Forbidden')
            return
        }

        var token = req.header('Authorization')

        if (token) {
            token = token.replace('Bearer','').trim()
        }

        let decoded = {}
        var publicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH, 'utf8')
        try {
            decoded = jwt.verify(token, publicKey)
        } catch (e) {
            res.writeHead(401, {})
            res.end(JSON.stringify({
                msgCode: 11401,
                msgReps: 'Unauthorized'
            }))
            return
        }

        let payload = req.body

        let listId = payload.listId
        if (!Array.isArray(listId)) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 11402,
                msgReps: 'Invalid List Task ID'
            }))
            return
        }

        for (let i = 0; i < listId.length; i++) {
            if (!validation.id(listId[i])) {
                res.writeHead(400, {})
                res.end(JSON.stringify({
                    msgCode: 11403,
                    msgReps: 'Invalid Task ID'
                }))
                return
            }
        }
        
        let taskSnaps = await tasksRef.where(admin.firestore.FieldPath.documentId(), 'in', listId).get()

        if (taskSnaps.empty) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 11404,
                msgReps: 'Can\'t Find Any Task Yet'
            }))
            return
        }

        let listTask = []

        for (let k = 0; k < taskSnaps.size; k++) {
            let task = taskSnaps.docs[k].data()
            task.id = taskSnaps.docs[k].id

            if (task.groupId) {
                let groupDoc = await groupRef.doc(task.groupId).get()

                if (!groupDoc.exists) {
                    res.writeHead(400, {})
                    res.end(JSON.stringify({
                        msgCode: 11405,
                        msgReps: 'Group Not Found'
                    }))
                    return
                }

                let group = groupDoc.data()
                group.id = groupDoc.id

                let userGroupSnaps = await userGroupRef.where('uid','==', decoded.uid).where('groupId','==', group.id).where('role', '==', ADMIN).get()

                if (userGroupSnaps.empty) {
                    res.writeHead(400, {})
                    res.end(JSON.stringify({
                        msgCode: 11406,
                        msgReps: 'Not Allow'
                    }))
                    return
                }
                listTask.push(task)
            } else {
                if (task.createdUserId !== decoded.uid) {
                    res.writeHead(400, {})
                    res.end(JSON.stringify({
                        msgCode: 11407,
                        msgReps: 'Not Allow'
                    }))
                    return
                }
                listTask.push(task)
            }
        }

        let userDoc = await userRef.doc(decoded.uid).get()

        if (!userDoc.exists) {
            res.writeHead(400, {});
            res.end(
                JSON.stringify({
                msgCode: 11408,
                msgReps: "User Not Found",
                })
            );
            return;
        }

        let user = userDoc.data()
        user.id = userDoc.id

        try {
            const batch = db.batch()
            for (let j = 0 ; j < listId.length; j++) {
                await batch.update(tasksRef.doc(listId[j]), {
                    isDelete: true,
                    deleteTime: moment().add(1, "M").unix(),
                })
            }
            await batch.commit()
        } catch (e) {
             console.log(e)
            res.writeHead(400, {});
            res.end(
                JSON.stringify({
                msgCode: 11409,
                msgReps: "Can\'t Delete Tasks",
                })
            );
            return
        }

        res.writeHead(200, {})
        res.end(JSON.stringify({
            msgCoe: 11400,
            msgReps: 'success'
        }))
        return
    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 11199,
                msgReps: 'Unknown'
            }))
            return  
        }
    }
}