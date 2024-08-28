const moment = require("moment");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const geoip = require("geoip-lite");

const validation = require("@utils/validation");
const { userRef, db, groupRef,userGroupRef, notificationRef } = require("@database/collections");
const {
  ADMIN,
  ASSISTANT,
  MEMBER,
  GROUP_PUBLIC,
  GROUP_PRIVATE,
  ACTIVE,
} = require("@utils/constant");

exports.createGroup = async (req, res) => {
  let responsed = false;
  try {
    if (req.method !== "POST") {
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
          msgCode: 11801,
          msgReps: "Unauthorized",
        })
      );
      return;
    }

    let payload = req.body;

    let userDoc = await userRef.doc(decoded.uid).get();

    if (!userDoc.exists) {
      res.writeHead(401, {});
      res.end(
        JSON.stringify({
          msgCode: 11802,
          msgReps: "User Not Found",
        })
      );
      return;
    }

    let user = userDoc.data();
    user.id = userDoc.id;

    if (!user.active) {
      res.writeHead(401, {});
      res.end(
        JSON.stringify({
          msgCode: 11803,
          msgReps: "User Is Inactive",
        })
      );
      return;
    }

    let name = payload.name;
    if (!validation.string(name, 3, 280)) {
      res.writeHead(401, {});
      res.end(
        JSON.stringify({
          msgCode: 11804,
          msgReps: "Invalid Group Name",
        })
      );
      return;
    }

    let description = payload.description;
    if (!validation.string(description, 3, 1024)) {
      res.writeHead(401, {});
      res.end(
        JSON.stringify({
          msgCode: 11805,
          msgReps: "Invalid Description",
        })
      );
      return;
    }

    let public = payload.public;
    if (![GROUP_PUBLIC, GROUP_PRIVATE].includes(public)) {
      res.writeHead(401, {});
      res.end(
        JSON.stringify({
          msgCode: 11806,
          msgReps: "Invalid group public status",
        })
      );
      return;
    }

    let photoUrl = payload.photoUrl || null;
    if (!validation.url(photoUrl, true)) {
      res.writeHead(401, {});
      res.end(
        JSON.stringify({
          msgCode: 11807,
          msgReps: "Invalid Photo Url",
        })
      );
      return;
    }

    let defaultRole = payload.defaultRole;
    if (![ASSISTANT, MEMBER].includes(defaultRole)) {
      res.writeHead(401, {});
      res.end(
        JSON.stringify({
          msgCode: 11808,
          msgReps: "Invalid Default Role",
        })
      );
      return;
    }

    let autoApproval = payload.autoApproval;
    if (typeof autoApproval !== "boolean") {
      res.writeHead(401, {});
      res.end(
        JSON.stringify({
          msgCode: 11809,
          msgReps: "Invalid Auto Approval Mode",
        })
      );
      return;
    }

    let zaloGroupId = payload.zaloGroupId || null;
    if (!validation.string(zaloGroupId, 3, 60, true)) {
      res.writeHead(401, {});
      res.end(
        JSON.stringify({
          msgCode: 11810,
          msgReps: "Invalid Zalo Group Id",
        })
      );
      return;
    }

    var ip =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null);
    ip = ip.split(",")[0];
    var geo = geoip.lookup(ip);
    var coordinates = geo && geo.ll ? geo.ll : null;

    var groupDoc = {
      zaloGroupId,
      autoApproval,
      defaultRole,
      photoUrl,
      description,
      name,
      public,
      lastModifiedAt: 0,
      createdAt: moment().unix(),
      totalMember: 1,
      totalSprint: 0,
      currentSprint: null,
      coordinates: coordinates,
      active: ACTIVE,
    };

    let groupId = await groupRef.doc().id;

    var userGroupDoc = {
      groupId: groupId,
      uid: user.id,
      role: ADMIN,
      uName: user.name,
      baned: false,
      approve: true,
      createdAt: moment().unix(),
      lastModifiedAt: 0,
      totalTaskAssigned: 0,
      totalTaskAssignDone: 0,
      totalTaskAssignProcess: 0,
    }

    let notificationDoc = {
      createdAt: moment().unix(),
      message: `${groupDoc.name} group just created`,
      new: true,
      receiverId: user.id,
      receiverName: user.name,
      senderId: 'Insek System',
      senderName: 'Insek System',
      title: 'Welcome new members'
    }

    try {
      const batch = db.batch();

      await batch.set(groupRef.doc(groupId), groupDoc);
      await batch.set(notificationRef.doc(), notificationDoc);
      await batch.set(userGroupRef.doc(), userGroupDoc);
      
      await batch.commit()
    } catch (e) {
      res.writeHead(401, {});
      res.end(
        JSON.stringify({
          msgCode: 11811,
          msgReps: "Can't Create Group",
        })
      );
      return;
    }

    groupDoc.id = groupId;

    res.writeHead(201, {});
    res.end(
      JSON.stringify({
        msgCode: 11800,
        msgReps: groupDoc,
      })
    );
    responsed = true;
    return;

  } catch (e) {
    console.log(e);
    if (!responsed) {
      res.writeHead(400, {});
      res.end(
        JSON.stringify({
          msgCode: 11899,
          msgReps: "Unknown",
        })
      );
      return;
    }
  }
};
