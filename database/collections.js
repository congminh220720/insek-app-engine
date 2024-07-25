
const admin = require('firebase-admin')
const serviceAccount =  require(process.env.FIRESTORE_CRED_PATH)
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

module.exports = {
    userRef,
    tasksRef
}