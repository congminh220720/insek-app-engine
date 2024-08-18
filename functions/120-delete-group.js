const moment = require("moment")
const fs = require("fs")
const jwt = require("jsonwebtoken")

const validation = require("@utils/validation")
const {userRef,groupRef, userGroupRef, sprintRef, tasksRef, db} = require("@database/collections")
const {
   ADMIN,
} = require("@utils/constant")

async function deleteGroupBundle (groupId, tasks, sprints, userGroups) {
    return new Promise(async (succeed, fail) => {
        try {
            const batch = db.batch()

            await batch.delete(groupRef.doc(groupId))

            try {
               const deleteTaskPromise = tasks.map( async task => {
                try {
                    await batch.delete(tasksRef.doc(task.id))
                } catch (e) {
                    console.log(e)
                    fail('Can\'t Delete Task')
                    return
                }
               })

               const deleteSprintPromise = sprints.map( async sprint => {
                try {
                    await batch.delete(sprintRef.doc(sprint.id))
                } catch (e) {
                    console.log(e)
                    fail('Can\'t Delete Sprint')
                    return
                }
               })

               const deleteUserGroupPromise = userGroups.map( async userGroup => {
                try {
                    await batch.delete(userGroupRef.doc(userGroup.id))
                } catch (e) {
                    console.log(e)
                    fail('Can\'t Delete User Group')
                    return
                }
               })

               await Promise.all([...deleteTaskPromise, ...deleteSprintPromise, ...deleteUserGroupPromise ])
            } catch (e) {
                console.log(e)
                fail('Can\'t Delete Group')
                return
            }

            await batch.commit()
            succeed()

        } catch (e) {
            console.log(e)
            fail('Can\'t Delete Group')
            return
        }
    })
}

exports.deleteGroup = async (req,res) => {
    let responsed = false
    try {
        if (req.method !== 'DELETE') {
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
                msgCode: 12001,
                msgReps: 'Unauthorized'
            }))
            return
        }

        let  userDoc = await userRef.doc(decoded.uid).get()

        if (!userDoc.exists) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 12002,
                msgReps: 'User Not Found'
            }))
            return
        }

        let user = userDoc.data()
        user.id = userDoc.id

        if (!user.active) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 12003,
                msgReps: 'User is inactive'
            }))
            return
        }

        let groupId = req.query.groupId
        if (!validation.id(groupId, false)) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 12004,
                msgReps: 'Invalid Group Id'
            }))
            return
        }

        let groupDoc = await groupRef.doc(groupId).get()


        if (!groupDoc.exists) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 12005,
                msgReps: 'Group Not Found'
            }))
            return
        }

        let group = groupDoc.data()
        group.id = groupDoc.id

        let userGroupSnap = await userGroupRef.where('uid', '==', user.id).where('groupId','==', groupId).where('role', '==', ADMIN).get()

        if (userGroupSnap.empty) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 12006,
                msgReps: 'You Are\'t Admin of This Group !'
            }))
            return
        }

        let tasks = []
        let sprints = []
        let userGroups = []

        let taskSnaps = await tasksRef.where('groupId', '==', groupId).get()
        let sprintSnaps = await sprintRef.where('groupId', '==', groupId).get()
        userGroupSnap = await userGroupRef.where('groupId', '==', groupId).get()

        for (let k = 0; k < taskSnaps.size; k++) {
            let task = taskSnaps.docs[k].data()
            task.id =  taskSnaps.docs[k].id
            tasks.push(task)
        }

        for (let j = 0; j < sprintSnaps.size; j++) {
            let sprint = sprintSnaps.docs[j].data()
            sprint.id =  sprintSnaps.docs[j].id
            sprints.push(sprint)
        }

        for (let t = 0; t < userGroupSnap.size; t++) {
            let userGroup = userGroupSnap.docs[t].data()
            userGroup.id =  userGroupSnap.docs[t].id
            userGroups.push(userGroup)
        }
        
        try {
           await deleteGroupBundle(groupId, tasks, sprints, userGroups)
        } catch (e) {
            console.log(e)
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 12013,
                msgReps: 'Can\'t Update Group'
            }))
            return
        }

        res.writeHead(200, {})
        res.end(JSON.stringify({
            msgCode: 12000,
            msgReps: 'success'
        }))
        responsed = true
        return

    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 12099,
                msgReps: 'Unknown'
            }))
            return
        }
    }
}