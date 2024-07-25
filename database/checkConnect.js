// const admin = require('firebase-admin')
// const serviceAccount =  require(process.env.FIRESTORE_CRED_PATH)

// const checkConnectDB = (req,res,next) =>{
//     try { 
//         admin.initializeApp({credential: admin.credential.cert(serviceAccount)})
//     } catch (e) { 
//         res.status(500).send('System error: Unable to connect to the database');
//         console.error('Database connection failed:', e); // Log lỗi chi tiết
//     }
//     next()
//     return
// }

// module.exports = checkConnectDB 