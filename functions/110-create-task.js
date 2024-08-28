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
  CLOSED
} = require("@utils/constant")

const now = moment().unix()

async function createTaskBundle(taskDoc, userDoc, sprint = null) {
  return new Promise(async (succeed, fail) => {
    try {
      const batch = db.batch();
      let taskId;

      try {
        taskId = tasksRef.doc().id;
        console.log(taskDoc)
        await batch.set(tasksRef.doc(taskId), taskDoc);
      } catch (e) {
        fail({
          message: "can't create task",
          detail: e,
        });
        return;
      }

      await batch.commit();

      // update user created task count
      try {
        await userRef
          .doc(userDoc.id)
          .update({ taskCreated: userDoc.taskCreated + 1 });
      } catch (e) {
        console.log(e);
        succeed(taskId);
      }

      if (taskDoc.groupId) {
        try {
          await sprintRef.doc(taskDoc.sprintId).update({
            totalTask: sprint.totalTask + 1
          })
        } catch (e) {
          console.log(e)
          succeed(taskId);
        }
      }
      succeed(taskId);
    } catch (e) {
      fail({
        message: "can't create task",
        detail: e,
      });
    }
  });
}

exports.createTask = async (req, res) => {
  let responsed = false;
  try {
    if (req.method !== "POST") {
      res.status(403).send("Forbidden");
    }

    var token = req.header("Authorization");

    if (token) {
      token = token.replace("Bearer", "").trim();
    }

    let publicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH, "utf8");
    let decoded = {};
    try {
      decoded = jwt.verify(token, publicKey);
    } catch (e) {
      console.log(e);
      res.writeHead(401, {});
      res.end(JSON.stringify({ msgCode: 11001, msgResp: "Unauthorized" }));
      return;
    }

    const payload = req.body;

    let title = payload.title;
    if (!validation.string(title, 3, 1024, false)) {
      res.writeHead(400, {});
      res.end(
        JSON.stringify({
          msgCode: 11002,
          msgReps: "Invalid Title",
        })
      );
      return;
    }

    let description = payload.description;
    if (!validation.string(description, 10, 1024, true)) {
      res.writeHead(400, {});
      res.end(
        JSON.stringify({
          msgCode: 11003,
          msgReps: "Invalid Description",
        })
      );
      return;
    }

    let flag = payload.flag;
    if (
      ![FLAG_NONE, FLAG_OPTIONAL, FLAG_NECESSARY, FLAG_SERIOUS].includes(flag)
    ) {
      res.writeHead(400, {});
      res.end(
        JSON.stringify({
          msgCode: 11004,
          msgReps: "Invalid Flag",
        })
      );
      return;
    }

    let externalLink = payload.externalLink;
    if (!validation.url(externalLink, true)) {
      res.writeHead(400, {});
      res.end(
        JSON.stringify({
          msgCode: 11005,
          msgReps: "Invalid ExternalLink",
        })
      );
      return;
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
          msgCode: 11007,
          msgReps: "Invalid Task Status",
        })
      );
      return;
    }

    let photoUrls = payload.photoUrls;
    if (!validation.array(photoUrls, 0, 20)) {
      res.writeHead(400, {});
      res.end(
        JSON.stringify({
          msgCode: 11010,
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
              msgCode: 11011,
              msgReps: "Invalid Image",
            })
          );
          return;
        }
      }
    }

    let assignUserId = payload.assignUserId;
    if (!validation.id(assignUserId, true)) {
      res.writeHead(400, {});
      res.end(
        JSON.stringify({
          msgCode: 11012,
          msgReps: "Invalid Assign User Id",
        })
      );
      return;
    }

    let groupId = payload.groupId;
    if (!validation.id(groupId, true)) {
      res.writeHead(400, {});
      res.end(
        JSON.stringify({
          msgCode: 11013,
          msgReps: "Invalid Group Id",
        })
      );

      var sprintId = payload.sprintId;
      if (!validation.id(sprintId, false)) {
        res.writeHead(400, {});
        res.end(
          JSON.stringify({
            msgCode: 11014,
            msgReps: "Invalid Sprint Id",
          })
        );
        return;
      }
    }

    let userDoc = await userRef.doc(decoded.uid).get();

    if (!userDoc.exists) {
      res.writeHead(400, {});
      res.end(
        JSON.stringify({
          msgCode: 11015,
          msgReps: "User Not Found",
        })
      );
      return;
    }

    let user = userDoc.data();
    user.id = userDoc.id;

    let userAssign;
    let sprint 
    if (assignUserId) {
      let userAssignDoc = await userRef.doc(assignUserId).get();

      if (!userAssignDoc.exists) {
        res.writeHead(400, {});
        res.end(
          JSON.stringify({
            msgCode: 11016,
            msgReps: "user assign not found",
          })
        );
        return;
      }

      userAssign = userAssignDoc.data();
      userAssign.id = userAssignDoc.id;
    }

    if (sprintId) {
        let sprintDoc = await sprintRef.doc(sprintId).get();
        if (!sprintDoc.exists) {
          res.writeHead(400, {});
          res.end(
            JSON.stringify({
              msgCode: 11017,
              msgReps: "Sprint Not Found",
            })
          );
          return
        }

        sprint = sprintDoc.data()
        sprint.id = sprintDoc.id

        if (sprint.closingAt < now || sprint.status === CLOSED) {
          res.writeHead(400, {});
          res.end(
            JSON.stringify({
              msgCode: 11018,
              msgReps: "Sprint Is Closed",
            })
          );
          return
        }

    }

    let group
    if (groupId) {
        let groupDoc = await groupRef.doc(groupId).get();
  
        if (!groupDoc.exists) {
          res.writeHead(400, {});
          res.end(
            JSON.stringify({
              msgCode: 11019,
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
              msgCode: 11018,
              msgReps: "Group Inactive",
            })
          );
          return;
        }

        var point = payload.point || null
        if (!validation.float(point, 0, 2**32, true)) {
          res.writeHead(400, {});
          res.end(
            JSON.stringify({
              msgCode: 11009,
              msgReps: "Invalid Point",
            })
          );
          return;
        }
      }

    let publicAt = payload.publicAt;
      if (!validation.timestamp(publicAt, true)) {
        res.writeHead(400, {});
        res.end(
          JSON.stringify({
            msgCode: 11008,
            msgReps: "Invalid Public Date",
          })
        );
        return;
    }

    let taskDoc = {
      title,
      description,
      photoUrls,
      status,
      point: groupId ? point : null,
      publicAt: publicAt || null,
      flag,
      externalLink: externalLink || null,
      sprintId: sprintId || null,
      groupId: groupId || null,
      groupName: groupId ? group.name : null,
      assignUserId: assignUserId || null,
      createdAt: moment().unix(),
      lastModifiedAt: 0,
      remakeCount: 0,
      createdUserId: user.id,
      createdUserName: user.name,
      createdUserPhone: user.phone,
      createdUserEmail: user.email,
      createdUserPhotoUrl: user.photoUrl,
      assignUserName: assignUserId ? userAssign.name : null,
      assignUserPhotoUrl: assignUserId ? userAssign.photoUrl : null,
      assignUserEmail: assignUserId ? userAssign.email : null,
      assignUserPhone: assignUserId ? userAssign.phone : null,
      photoUrls,
      completeAt: 0
    };

    try {
      let taskId = await createTaskBundle(taskDoc, user,sprint);
      taskDoc.id = taskId;
    } catch (e) {
      console.log(e.detail);
      res.writeHead(400, {});
      res.end(
        JSON.stringify({
          msgCode: 11019,
          msgReps: e.message,
        })
      );
      return;
    }

    res.writeHead(200, {});
    res.end(
      JSON.stringify(({
          msgCode: 11000,
          msgReps: taskDoc,
        })
      )
    );
    responsed = true;
    return

  } catch (e) {
    console.log(e);
    if (!responsed) {
      res.writeHead(400, {});
      res.end(
        JSON.stringify({
          msgCode: 11099,
          msgReps: "unknown",
        })
      );
      return;
    }
  }
};
