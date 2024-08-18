const moment = require("moment");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const validation = require("@utils/validation");
const {userRef,tasksRef,db,sprintRef,groupRef} = require("@database/collections");
const {
  FLAG_SERIOUS,
  FLAG_NECESSARY,
  FLAG_OPTIONAL,
  FLAG_NONE,
  TASK_PENDING_STATUS,
  TASK_TODO_STATUS,
  TASK_PROCESS_STATUS,
  TASK_DONE_STATUS,
  TASK_NOT_COMPLETE_STATUS,
  TASK_COMPLETE_STATUS
} = require("@utils/constant");

exports.UpdateTask = async (req,res) => {
    let responsed = false
    try {
        if (req.method !== 'PATCH') {
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
                msgCode: 11201,
                msgReps: 'Unauthorized'
            }))
            return
        }

        let taskUpdateDoc = {}
        const payload = req.body
        const params = req.query

        let taskId = params.id 
        if (!validation.id(taskId, false)) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 11202,
                msgReps: 'Invalid Task ID'
            }))
            return
        }

        let title = payload.title;
        if (title !== undefined) {
            if (!validation.string(title, 3, 1024, false)) {
                res.writeHead(400, {});
                res.end(
                    JSON.stringify({
                    msgCode: 11203,
                    msgReps: "Invalid Title",
                    })
                );
                return;
            }
            taskUpdateDoc['title'] = title
        }

        let description = payload.description;
        if (description !== undefined) {
            if (!validation.string(description, 10, 1024, false)) {
                res.writeHead(400, {});
                res.end(
                    JSON.stringify({
                    msgCode: 11204,
                    msgReps: "Invalid description",
                    })
                );
                return;
            }
            taskUpdateDoc['description'] = description
        }

        let flag = payload.flag;
        if (flag !== undefined) {
            if (![FLAG_NONE, FLAG_OPTIONAL, FLAG_NECESSARY, FLAG_SERIOUS].includes(flag)) {
                res.writeHead(400, {});
                res.end(
                    JSON.stringify({
                    msgCode: 11205,
                    msgReps: "Invalid Flag",
                    })
                );
                return;
            }
            taskUpdateDoc['flag'] = flag
        }

        let externalLink = payload.externalLink;
        if (externalLink !== undefined) {
            if (!validation.url(externalLink, true)) {
                res.writeHead(400, {});
                res.end(
                    JSON.stringify({
                    msgCode: 11206,
                    msgReps: "Invalid ExternalLink",
                    })
                );
                return;
            }
            taskUpdateDoc['externalLink'] = externalLink
        }


        let status = payload.status;
        if (status !== undefined) {
            if (![TASK_PENDING_STATUS,TASK_TODO_STATUS,TASK_PROCESS_STATUS,TASK_DONE_STATUS,TASK_NOT_COMPLETE_STATUS].includes(status)) {
                res.writeHead(400, {});
                res.end(
                    JSON.stringify({
                    msgCode: 11207,
                    msgReps: "Invalid Task Status",
                    })
                );
                return;
            }

            if (status === TASK_COMPLETE_STATUS) {
                res.writeHead(400, {});
                res.end(
                    JSON.stringify({
                    msgCode: 11208,
                    msgReps: "This Task Is Complete !",
                    })
                );
                return;
            }

            taskUpdateDoc['status'] = status
        }

        let photoUrls = payload.photoUrls;
        if (photoUrls !== undefined) {
            if (!validation.array(photoUrls, 0, 20)) {
                res.writeHead(400, {});
                res.end(
                  JSON.stringify({
                    msgCode: 11209,
                    msgReps: "Invalid Image",
                  })
                );
                return;
              }
          
              if (photoUrls.length) {
                for (let i = 0; i < photoUrls.length; i++) {
                  let photo = photoUrls[i];
                  if (!validation.url(photo, false)) {
                    res.writeHead(400, {});
                    res.end(
                      JSON.stringify({
                        msgCode: 11210,
                        msgReps: "Invalid Image",
                      })
                    );
                    return;
                  }
                }
              }
            taskUpdateDoc['photoUrls'] = photoUrls
        }

        let taskDoc = await tasksRef.doc(taskId).get()
        if (!taskDoc.exists) {
            res.writeHead(400, {});
            res.end(
              JSON.stringify({
                msgCode: 11211,
                msgReps: "Task Not Found",
              })
            );
            return;
        }

       let task = taskDoc.data()
       task.id = taskDoc.id

       let userDoc = await userRef.doc(decoded.uid).get()
       
       if (!userDoc.exists) {
            res.writeHead(400, {});
            res.end(
            JSON.stringify({
                msgCode: 11212,
                msgReps: "User Not Found",
            })
            );
            return;
        }

        let user = userDoc.data()
        user.id = userDoc.id
       
       if (task.createdUserId !== user.id) {
            res.writeHead(400, {});
            res.end(
            JSON.stringify({
                msgCode: 11213,
                msgReps: "Not Allow",
            })
            );
            return;
       }

       if (task.groupId) {
            let groupDoc = await groupRef.doc(groupId).get();
    
            if (!groupDoc.exists) {
            res.writeHead(400, {});
            res.end(
                JSON.stringify({
                msgCode: 11018,
                msgReps: "Group Not Found",
                })
            );
            return;
            }

            group = groupDoc.data()
            group.id = groupDoc.id

            if (!group.active) {
                es.writeHead(400, {});
                res.end(
                  JSON.stringify({
                    msgCode: 11214,
                    msgReps: "Group Is Inactive",
                  })
                );
                return;
            }

            var point = payload.point;
            if (point !== undefined) {
                if (!validation.float(point, 0, 2**32, true)) {
                    res.writeHead(400, {});
                    res.end(
                        JSON.stringify({
                        msgCode: 11215,
                        msgReps: "Invalid Point",
                        })
                    );
                    return;
                }
                taskUpdateDoc['point'] = point
            }

            let publicAt = payload.publicAt;
            if (publicAt !== undefined) {
                if (!validation.timestamp(publicAt, true)) {
                    res.writeHead(400, {});
                    res.end(
                        JSON.stringify({
                        msgCode: 11208,
                        msgReps: "Invalid Public Date",
                        })
                    );
                    return;
                }
                taskUpdateDoc['publicAt'] = publicAt
            }
        }

        let assignUserId = payload.assignUserId
        if (assignUserId !== undefined) {
            let userAssignDoc = await userRef.doc(assignUserId).get();
            
            if (!userAssignDoc.exists) {
              res.writeHead(400, {});
              res.end(
                JSON.stringify({
                  msgCode: 11216,
                  msgReps: "user assign not found",
                })
              );
              return;
            }
      
            let userAssign = userAssignDoc.data();
            userAssign.id = userAssignDoc.id;

            taskUpdateDoc['assignUserName'] = userAssign.name
            taskUpdateDoc['assignUserPhotoUrl'] = userAssign.photoUrl
            taskUpdateDoc['assignUserEmail'] = userAssign.email
            taskUpdateDoc['assignUserPhone'] = userAssign.phone
            taskUpdateDoc['assignUserId'] = assignUserId
        }
       
        
        taskUpdateDoc['lastModifiedAt'] = moment().unix() 

        try {
            await tasksRef.doc(taskId).update(taskUpdateDoc)
        } catch (e) {
            res.writeHead(400, {});
            res.end(
            JSON.stringify({
                msgCode: 11217,
                msgReps: "Can't Update Task",
            })
            );
            return;
        }

        res.writeHead(200, {});
        res.end(
        JSON.stringify(({
            msgCode: 11200,
            msgReps: 'Update Success',
            })
        )
        );
        responsed = true;
        return
    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 11299,
                msgReps: 'Unknown'
            }))
            return
        }
    }
}