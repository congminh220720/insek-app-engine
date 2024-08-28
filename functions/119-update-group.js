const moment = require("moment");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const geoip = require('geoip-lite');

const validation = require("@utils/validation");
const {userRef,groupRef, userGroupRef, groupNotificationRef} = require("@database/collections");
const {
   ADMIN,
   ASSISTANT,
   MEMBER,
  GROUP_PUBLIC,
  GROUP_PRIVATE
} = require("@utils/constant");

exports.updateGroup = async (req,res) => {
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
                msgCode: 11901,
                msgReps: 'Unauthorized'
            }))
            return
        }

        let payload = req.body

        let  userDoc = await userRef.doc(decoded.uid).get()

        if (!userDoc.exists) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 11902,
                msgReps: 'User Not Found'
            }))
            return
        }

        let user = userDoc.data()
        user.id = userDoc.id

        if (!user.active) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 11903,
                msgReps: 'User is inactive'
            }))
            return
        }

        let groupId = req.query.groupId
        if (!validation.id(groupId, false)) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 11911,
                msgReps: 'Invalid Group Id'
            }))
            return
        }

        let groupDoc = await groupRef.doc(groupId).get()


        if (!groupDoc.exists) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 11912,
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
                msgCode: 11912,
                msgReps: 'You Are\'t Admin of This Group !'
            }))
            return
        }

        let groupUpdateDoc = {}

        let name = payload.name
        if (name !== undefined) {
            if (!validation.string(name, 3, 280)) {
                res.writeHead(401,{})
                res.end(JSON.stringify({
                    msgCode: 11904,
                    msgReps: 'Invalid Group Name'
                }))
                return
            }
            groupUpdateDoc['name'] = name
        }
        

        let description = payload.description 
        if (description !== undefined) {
            if (!validation.string(description,3,1024)) {
                res.writeHead(401,{})
                res.end(JSON.stringify({
                    msgCode: 11905,
                    msgReps: 'Invalid Description'
                }))
                return
            }
            groupUpdateDoc['description'] = description
        }
       

        let public = payload.public
        if (description !== undefined) { 
            if (![GROUP_PUBLIC,GROUP_PRIVATE].includes(public)) {
                res.writeHead(401,{})
                res.end(JSON.stringify({
                    msgCode: 11906,
                    msgReps: 'Invalid group public status'
                }))
                return
            }
            groupUpdateDoc['public'] = public
        }
      

        let photoUrl = payload.photoUrl
        if (photoUrl !== undefined) { 
            if (!validation.url(photoUrl, true)) {
                res.writeHead(401,{})
                res.end(JSON.stringify({
                    msgCode: 11907,
                    msgReps: 'Invalid Photo Url'
                }))
                return
            }
            groupUpdateDoc['photoUrl'] = photoUrl
        }
       

        let defaultRole = payload.defaultRole
        if (defaultRole !== undefined) { 
            if (![ ADMIN,ASSISTANT,MEMBER].includes(defaultRole)) {
                res.writeHead(401,{})
                res.end(JSON.stringify({
                    msgCode: 11908,
                    msgReps: 'Invalid Default Role'
                }))
                return
            }
            groupUpdateDoc['defaultRole'] = defaultRole
        }

        let autoApproval = payload.autoApproval 
        if (autoApproval !== undefined) {
            if (typeof autoApproval !== 'boolean') {
                res.writeHead(401,{})
                res.end(JSON.stringify({
                    msgCode: 11909,
                    msgReps: 'Invalid Auto Approval Mode'
                }))
                return
            }
            groupUpdateDoc['autoApproval'] = autoApproval
        }
       

        let zaloGroupId = payload.zaloGroupId || null
        if (zaloGroupId !== undefined) {
            if (!validation.string(zaloGroupId, 3, 60, true)) {
                res.writeHead(401,{})
                res.end(JSON.stringify({
                    msgCode: 11910,
                    msgReps: 'Invalid Zalo Group Id'
                }))
                return
            }
            groupUpdateDoc['zaloGroupId'] = zaloGroupId
        }
       
        var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null);
        ip = ip.split(',')[0];
        var geo = geoip.lookup(ip);
        var coordinates = geo && geo.ll ? geo.ll : null;
        groupUpdateDoc['coordinates'] = coordinates
        groupUpdateDoc['lastModifiedAt'] = moment().unix()

        try {
           await groupRef.doc(group.id).update(groupUpdateDoc)
        } catch (e) {
            res.writeHead(401,{})
            res.end(JSON.stringify({
                msgCode: 11913,
                msgReps: 'Can\'t Update Group'
            }))
            return
        }   

       

        if (groupUpdateDoc.name) {
            let groupNotificationDoc = {
                createdAt: moment().unix(),
                message: `group has been change renamed to ${name}`,
                new: true,
                groupId: group.id,
                groupName: groupUpdateDoc.name || group.name,
                senderId: 'Insek System',
                senderName: 'Insek System',
                title: 'change group name success'
            }

            try {
                await groupNotificationRef.doc().create(groupNotificationDoc)
              } catch (e) {
                console.log({ msgCode: 11914, msgResp: 'Can\'t Send Notification', detail: e })
              }
        }

        res.writeHead(200, {})
        res.end(JSON.stringify({
            msgCode: 11900,
            msgReps: 'success'
        }))
        responsed = true
        return

    } catch (e) {
        console.log(e)
        if (!responsed) {
            res.writeHead(400, {})
            res.end(JSON.stringify({
                msgCode: 11999,
                msgReps: 'Unknown'
            }))
            return
        }
    }
}