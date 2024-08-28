const admin = require('firebase-admin')
const serviceAccount = require(process.env.FIRESTORE_CRED_PATH)
try { admin.initializeApp({credential: admin.credential.cert(serviceAccount)})
} catch (error) { console.log('connect fail') }

const db = admin.firestore()

// declare collection
const COLLECTION_PREFIX = process.env.COLLECTION_PREFIX

const userRef = db.collection(COLLECTION_PREFIX+'Users')
const tasksRef = db.collection(COLLECTION_PREFIX+'Tasks')
const groupRef = db.collection(COLLECTION_PREFIX+'Group')
const userGroupRef = db.collection(COLLECTION_PREFIX+'UserGroup')
const notificationRef = db.collection(COLLECTION_PREFIX+'Notification')
const sprintRef = db.collection(COLLECTION_PREFIX+'Sprint')
const notificationQueueRef = db.collection(COLLECTION_PREFIX+'NotificationQueue')
const groupNotificationRef = db.collection(COLLECTION_PREFIX+'GroupNotification')

module.exports = {
    admin,
    db,
    userRef,
    tasksRef,
    groupRef,
    userGroupRef,
    sprintRef,
    notificationQueueRef,
    notificationRef,
    groupNotificationRef
}