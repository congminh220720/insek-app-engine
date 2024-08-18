
const fs = require("fs");
const jwt = require("jsonwebtoken");
const validation = require("@utils/validation");

const {userRef,tasksRef,groupRef,userGroupRef} = require("@database/collections");
const {
  TASK_PENDING_STATUS,
  TASK_TODO_STATUS,
  TASK_PROCESS_STATUS,
  TASK_DONE_STATUS,
  TASK_NOT_COMPLETE_STATUS,
  TASK_COMPLETE_STATUS
} = require("@utils/constant")

exports.listTaskByGroupStatus = async (req,res) => {
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
                msgCode: 11701,
                msgReps: 'Unauthorized'
            }))
            return
        }

        let groupId = req.query.groupId
        let status = req.query.status

        if (!validation.id(groupId, false)) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 11702,
                msgReps: 'Invliad Group Id'
            }))
            return
        }

        let userDoc = await userRef.doc(decoded.id).get()

        if (!userDoc.exists) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 11703,
                msgReps: 'User Not Found'
            }))
            return
        }

        let user = userDoc.data()
        user.id = userDoc.id 

        let userGroupSnaps = await userGroupSnaps.where('uid','==', user.id).where('groupId','==',groupId).get()

        if (userGroupSnaps.empty) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 11704,
                msgReps: 'You Are\'t Member This Group'
            }))
            return
        }


        if (status !== undefined)  {
            if (![TASK_PENDING_STATUS,TASK_TODO_STATUS,TASK_PROCESS_STATUS,TASK_DONE_STATUS,TASK_NOT_COMPLETE_STATUS,TASK_COMPLETE_STATUS].includes(status)) {
                res.writeHead(401,{})
                res.end(JSON.stringify({
                    msgCode: 11705,
                    msgReps: 'Invalid Status'
                }))
                return
            }
        }
        
        let tasks = []

        let taskSnaps
        if (status !== undefined) {
            taskSnaps = await tasksRef.where('groupId', '==', groupId).where('status', '==', status).get()
        } else {
            taskSnaps = await tasksRef.where('groupId', '==', groupId).where('createdUserId', '==', user.id).get()
        }

        for (let i = 0; i < taskSnaps.size; i++) {
            const task = taskSnaps.docs[i].data()
            task.id = taskSnaps.docs[i].id
            tasks.push(task)
        }

        res.writeHead(200, {})
        res.end(JSON.stringify({
            msgCode: 11700,
            msgReps:tasks
        }))
        responsed = true
        return
    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 11799,
                msgReps: 'Unknown'
            }))
            return
        }
    }
}
