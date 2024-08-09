const moment = require('moment')
const fs = require('fs')
const jwt = require('jsonwebtoken')

const validation = require('@utils/validation')
const { userRef, tasksRef, userGroupRef, db } = require('@database/collections')

function updateUserBundle(userDoc, user) {
    return new Promise(async (succeed, fail) => {
        try {
            const batch = db.batch()

            try {
                await batch.update(userRef.doc(user.id), userDoc)
            } catch (e) {
                fail({
                    message: 'can\'t update user',
                    detail: e
                })
            }

            let taskSnap = await tasksRef.where('createdUserId', '==', user.id).get()
            let taskAssignedSnap = await tasksRef.where('assignUserId', '==', user.id).get()
            let userGroupSnap = await userGroupRef.where('uid', '==', user.id).get()

            if (taskSnap.size) {
                let taskUpdateDoc = {}
                userDoc.name ? taskUpdateDoc['createdUserName'] = userDoc.name : null
                userDoc.phone ? taskUpdateDoc['createdUserPhone'] = userDoc.phone : null
                userDoc.photoUrl ? taskUpdateDoc['createdUserPhotoUrl'] = userDoc.photoUrl : null

                for (let i = 0; i < taskSnap.size; i++) {
                    try {
                        let id = taskSnap.docs[i].id
                        await batch.update(tasksRef.doc(id),taskUpdateDoc)
                    } catch (e) {
                        fail({
                            message: 'can\'t user\'s task',
                            detail: e
                        })
                        return
                    }
                } 
            }

            if (userGroupSnap.size) {
                let userGroupUpdateDoc = {}
                userDoc.name ? userGroupUpdateDoc['uName'] = userDoc.name : null

                for (let i = 0; i < taskSnap.size; i++) {
                    try {
                        let id = userGroupSnap.docs[i].id
                        await batch.update(userGroupRef.doc(id),userGroupUpdateDoc)
                    } catch (e) {
                        fail({
                            message: 'can\'t user\'s group',
                            detail: e
                        })
                        return
                    }
                } 
            }

            if (taskAssignedSnap.size) {
                let taskAssignedUpdateDoc = {}
                userDoc.name ? taskAssignedUpdateDoc['assignUserName'] = userDoc.name : null
                userDoc.phone ? taskAssignedUpdateDoc['assignUserPhone'] = userDoc.phone : null
                userDoc.photoUrl ? taskAssignedUpdateDoc['assignUserPhotoUrl'] = userDoc.photoUrl : null

                for (let i = 0; i < taskSnap.size; i++) {
                    try {
                        let id = taskAssignedSnap.docs[i].id
                        await batch.update(tasksRef.doc(id),taskAssignedUpdateDoc)
                    } catch (e) {
                        fail({
                            message: 'can\'t user\'s assigned task',
                            detail: e
                        })
                        return
                    }
                } 
            }

            try {
                await batch.commit()
            } catch (e) {
                fail({
                    message: 'can\'t update user',
                    detail: e
                })
            }

            succeed()

        } catch (e) {
            fail({
                message: 'can\'t update user',
                detail: e
            })
        }
    })
}

exports.updateUser = async (req, res) => {
    try {
        if (req.method !== 'PATCH') {
            res.status(403).send('Forbidden')
            return
        }

        let token = req.header('Authorization')

        if (token) {
            token = token.replace('Bearer','').trim()
        }

        let publicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH, 'utf8');
        let decoded = {}
        try {
            decoded = jwt.verify(token,publicKey)
        } catch (e) {
            console.log(e)
            res.writeHead(401, {});
            res.end(JSON.stringify({msgCode: 10101,msgResp: 'Unauthorized'}))
            return
        }

        const payload = req.body
        
        let userUpdateDoc = {}

        let name = payload.name;
        if (name !== undefined) {
            if (!validation.string(name, 1, 256, false)) {
                res.writeHead(400, {});
                res.end(JSON.stringify({ msgCode: 10102, msgResp: 'Name is mandatory' }));
                return
            }
            userUpdateDoc['name'] = name
        }
        

        let phone = payload.phone;
        if (phone !== undefined) {
            if (!validation.phone(phone, false)) {
                res.writeHead(400, {});
                res.end(JSON.stringify({ msgCode: 10103, msgResp: 'Phone is mandatory' }));
                return
            }
            userUpdateDoc['phone'] = phone
        }
      

        let photoUrl = payload.photoUrl;
        if (photoUrl !== undefined) {
            if (!validation.url(photoUrl, true)) {
                res.writeHead(400, {});
                res.end(JSON.stringify({ msgCode: 10104, msgResp: 'Invalid photo url' }));
                return
            }
            userUpdateDoc['photoUrl'] = photoUrl
        }
       

        let userDoc = await userRef.doc(decoded.uid).get();
        if (!userDoc.exists) {
            res.writeHead(400, {});
            res.end(JSON.stringify({msgCode: 10105, msgResp: 'User not found'}))
            return;
        }

        let user = userDoc.data()
        user.id = userDoc.id

        var diff = moment().unix() - user.lastModifiedAt;
        if (diff < 20) {
        res.writeHead(400, {});
        res.end(JSON.stringify({msgCode: 10106, msgResp: 'Update will be allowed after '+(20 - diff)+'s'}))
        return;
        }

        try {
            await updateUserBundle(userUpdateDoc, user)
        } catch (e) {
            res.writeHead(400, {});
            res.end(JSON.stringify({msgCode: 10107, msgResp: 'Can\'t update user'}))
            return;
        }

        res.writeHead(200, {});
        res.end(JSON.stringify({msgCode: 10100,msgResp: 'Success'}))
        return
    } catch (e) {
        console.log(e)
        res.writeHead(400, {});
        res.end(JSON.stringify({msgCode: 10199, msgResp: 'Unknown'}))
    }
}