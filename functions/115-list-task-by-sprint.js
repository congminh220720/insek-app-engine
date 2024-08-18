const moment = require("moment");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const validation = require("@utils/validation");
const {userRef,tasksRef,db,sprintRef,groupRef, userGroupRef} = require("@database/collections");
const {
  TASK_PENDING_STATUS,
  TASK_TODO_STATUS,
  TASK_PROCESS_STATUS,
  TASK_DONE_STATUS,
  TASK_NOT_COMPLETE_STATUS,
  TASK_COMPLETE_STATUS
} = require("@utils/constant")

exports.listTaskBySprint = async (req,res) => {
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
                msgCode: 11501,
                msgReps: 'Unauthorized'
            }))
            return
        }

        let sprintId = req.query.id
        if (!validation.id(sprintId)) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 11502,
                msgReps: 'Invalid Sprint Id'
            }))
            return
        }

        let sprintDoc = await sprintRef.doc(sprintId).get()

        if (!sprintDoc.exists) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 11503,
                msgReps: 'Sprint Not Found'
            }))
            return
        }

        let sprint = sprintDoc.data()
        sprint.id = sprintDoc.id

        let userDoc = await userRef.doc(decoded.uid).get()

        if (!userDoc.exists) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 11504,
                msgReps: 'User Not Found'
            }))
            return
        }
        

        let tasks = []
        let user = userDoc.data()
        user.id = userDoc.id 
        let taskSnaps = await tasksRef.where('sprintId', '==', sprintId).limit(1).get()

        let sampleSprint = taskSnaps.docs[0].data()

        let userGroupSnaps = await userGroupSnaps.where('uid','==', user.id).where('groupId','==',sampleSprint.groupId).get()

        if (userGroupSnaps.empty) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 11505,
                msgReps: 'You Are\'t Member This Group'
            }))
            return
        }

        taskSnaps =  await tasksRef.where('sprintId', '==', sprintId).get()
    

        for (let i = 0; i < taskSnaps.size; i++) {
            const task = taskSnaps.docs[i].data()
            task.id = taskSnaps.docs[i].id
            tasks.push(task)
        }

        res.writeHead(200, {})
        res.end(JSON.stringify({
            msgCode: 11500,
            msgReps:tasks
        }))
        responsed = true
        return
    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 11599,
                msgReps: 'Unknown'
            }))
            return
        }
    }
}
