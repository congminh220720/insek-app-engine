
const admin = require('firebase-admin')
const serviceAccount =  require(process.env.FIRESTORE_CRED_PATH)
// const serviceAccount =  require('../service-accounts/insek-service.json')
try { 
    admin.initializeApp({credential: admin.credential.cert(serviceAccount)})
} catch (e) { 
    // additional telegram message later ! 
    console.log('connect fail') 
}

const db = admin.firestore()

// declare collection
const COLLECTION_PREFIX = process.env.COLLECTION_PREFIX

const userRef = db.collection(COLLECTION_PREFIX+'Users')
const tasksRef = db.collection(COLLECTION_PREFIX+'Tasks')
const groupRef = db.collection(COLLECTION_PREFIX+'Group')
const userGroupRef = db.collection(COLLECTION_PREFIX+'userGroup')

module.exports = {
    userRef,
    tasksRef,
    groupRef,
    userGroupRef
}