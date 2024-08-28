const moment = require("moment");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const validation = require("@utils/validation");
const {userRef,tasksRef, userGroupRef, admin, db} = require("@database/collections");
const {
  TASK_PENDING_STATUS,
  TASK_TODO_STATUS,
  TASK_PROCESS_STATUS,
  TASK_DONE_STATUS,
  TASK_NOT_COMPLETE_STATUS,
  TASK_COMPLETE_STATUS,
  ADMIN,ASSISTANT
} = require("@utils/constant");


exports.updateStatusTasks = async (req, res) => {
    let responsed = false
    try {
        if (req.method !== 'PATCH') {
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
                msgCode: 11101,
                msgReps: 'Unauthorized'
            }))
            return
        }

        let payload = req.body

        let listId = payload.listId
        if (!Array.isArray(listId)) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 11102,
                msgReps: 'Invalid List Task ID'
            }))
            return
        }

        for (let i = 0; i < listId.length; i++) {
            if (!validation.id(listId[i])) {
                res.writeHead(400, {})
                res.end(JSON.stringify({
                    msgCode: 11103,
                    msgReps: 'Invalid Task ID'
                }))
                return
            }
        }
        
        let taskSnaps = await tasksRef.where(admin.firestore.FieldPath.documentId(), 'in', listId).get()

        if (taskSnaps.empty) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 11104,
                msgReps: 'Can\'t Find Any Task Yet'
            }))
            return
        }

        let listTask = []
        let generalStatus = taskSnaps.docs[0].data().status

        for (let k = 0; k < taskSnaps.size; k++) {
            let task = taskSnaps.docs[k].data()
            task.id = taskSnaps.docs[k].id
            if (task.status !== generalStatus ) {
                res.writeHead(400, {})
                res.end(JSON.stringify({
                    msgCode: 11105,
                    msgReps: 'The Status Between Tasks Does not Match !'
                }))
                return
            }

            if (task.groupId) {
                if (task.groupId !== taskSnaps.docs[0].data().groupId) {
                    res.writeHead(400, {})
                    res.end(JSON.stringify({
                        msgCode: 11106,
                        msgReps: 'The Tasks Not Same Group !'
                    }))
                    return
                }
            } else {
                if (task.createdUserId !== taskSnaps.docs[0].data().createdUserId) {
                    res.writeHead(400, {})
                    res.end(JSON.stringify({
                        msgCode: 11106,
                        msgReps: 'The Tasks Not Same Owner'
                    }))
                    return
                }
            } {

            }

            listTask.push(task)
        }


        let status = payload.status;
        if (
        ![
            TASK_PENDING_STATUS,
            TASK_TODO_STATUS,
            TASK_PROCESS_STATUS,
            TASK_DONE_STATUS,
            TASK_NOT_COMPLETE_STATUS,
        ].includes(status)
        ) {
        res.writeHead(400, {});
        res.end(
            JSON.stringify({
            msgCode: 11106,
            msgReps: "Invalid Task Status",
            })
        );
        return;
        } 

        let taskUpdateDoc = {
            status,
            lastModifiedAt: moment().unix(),
        }

        let userDoc = await userRef.doc(decoded.uid).get()

        if (!userDoc.exists) {
            res.writeHead(400, {});
            res.end(
                JSON.stringify({
                msgCode: 11107,
                msgReps: "User Not Found",
                })
            );
            return;
        }

        let user = userDoc.data()
        user.id = userDoc.id

        if (status === TASK_COMPLETE_STATUS) {
            if (listTask[0].groupId) {
                let userGroupSnap = await userGroupRef.where('uid', '==', decoded.uid).where('groupId','==',listTask[0].groupId).get()

                if (userGroupSnap.size) {
                    res.writeHead(400, {});
                    res.end(
                        JSON.stringify({
                        msgCode: 11108,
                        msgReps: "you Are\'t Admin Or Assistant or This Group",
                        })
                    );
                    return;
                }

                let userGroup = userGroupSnap.docs[0].data()
                userGroup.id = userGroupSnap.docs[0].id

                if (![ADMIN,ASSISTANT].includes(userGroup.role)) {
                    res.writeHead(400, {});
                    res.end(
                        JSON.stringify({
                        msgCode: 11109,
                        msgReps: "you Are\'t Admin Or Assistant or This Group",
                        })
                    );
                    return;
                }

                taskUpdateDoc['completeAt'] = moment().unix()

            } else {
                if (listTask[0].createdUserId !== decoded.uid) {
                    res.writeHead(400, {});
                    res.end(
                        JSON.stringify({
                        msgCode: 11110,
                        msgReps: "You Can't Update This Status",
                        })
                    );
                    return;
                }
            }

            if (decoded.uid !== listTask[0].createdUserId) {
                res.writeHead(400, {});
                res.end(
                    JSON.stringify({
                    msgCode: 11111,
                    msgReps: "User Not Found",
                    })
                );
                return;
            }
        }

        // check permission (created/assign)
        console.log(listTask[0].createdUserId)
        console.log(user.id)
        if (listTask[0].createdUserId !== user.id) {
            if (listTask[0].assignUserId !== user.id) {
                res.writeHead(400, {});
                res.end(
                    JSON.stringify({
                    msgCode: 11112,
                    msgReps: "Not Allow",
                    })
                );
                return;
            }
        }

        try {
            const batch = db.batch()
            for (let j = 0 ; j < listTask.length; j++) {
                await batch.update(tasksRef.doc(listTask[j].id), taskUpdateDoc)
            }

            await batch.commit()
        } catch (e) {
            console.log(e)
            res.writeHead(400, {});
            res.end(
                JSON.stringify({
                msgCode: 11111,
                msgReps: "Can\'t Update status",
                })
            );
            return
        }

        res.writeHead(200, {})
        res.end(JSON.stringify({
            msgCoe: 11100,
            msgReps: 'success'
        }))
        return
        // update report user

        // if ([TASK_NOT_COMPLETE_STATUS,TASK_DONE_STATUS].includes(status)) {
        //     if (task.assignUserId) {
        //         try {
        //             await userRef.doc(user.id).update({
        //                 taskComplete: status === TASK_DONE_STATUS ? user.taskComplete + 1 : user.taskComplete,
        //                 taskNotComplete: status === TASK_NOT_COMPLETE_STATUS ? user.taskNotComplete + 1 : user.taskNotComplete,
        //             })
        //         } catch (e) {
                    
        //         }
        //     }
        // }

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