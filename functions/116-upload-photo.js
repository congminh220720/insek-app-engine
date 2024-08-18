const path = require('path');
const os = require('os');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const Busboy = require('busboy');
// const liveTracker = require('../utils/live-tracker');
const { admin } = require("@database/collections");

const bucket = admin.storage().bucket(process.env.STORAGE_BUCKET);

exports.uploadPhoto = async (req, res) => {
  try {
    if (req.method != 'POST') {
      res.status(403).send('Forbidden');
      return;
    }

    let userId = '';
    let userEmail = '';

    var token = req.header('Authorization');
    if (token) {
      token = token.replace('Bearer ', '');
    }
    
    var cert = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH,'utf8');
    try {
      var decoded = jwt.verify(token, cert);
      if (decoded) {
        userId = decoded.uid;
        userEmail  = decoded.email;
      }
    } catch (e) {}

    const busboy = Busboy({headers: req.headers});
    const tmpdir = os.tmpdir();

    const fields = {};
    const uploads = {};

    // This code will process each non-file field in the form.
    busboy.on('field', (name, value) => {
      // console.log(`Processed field ${name}: ${value}.`);
      fields[name] = value;
    });

    const fileWrites = [];

    // This code will process each file uploaded.
    busboy.on('file', (fieldName, file, fileName) => {
      // Note: os.tmpdir() points to an in-memory file system on GCF
      // Thus, any files in it must fit in the instance's memory.
      // console.log(`Processed file ${fileName}`);
      const filePath = path.join(tmpdir, fileName);
      uploads[fieldName] = filePath;

      const writeStream = fs.createWriteStream(filePath);
      file.pipe(writeStream);

      // File was processed by Busboy; wait for it to be written.
      // Note: GCF may not persist saved files across invocations.
      // Persistent files must be kept in other locations
      // (such as Cloud Storage buckets).
      const promise = new Promise((resolve, reject) => {
        file.on('end', () => {
          writeStream.end();
        });
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      fileWrites.push(promise);
    });

    // Triggered once all uploaded files are processed by Busboy.
    // We still need to wait for the disk writes (saves) to complete.
    busboy.on('finish', async () => {
      await Promise.all(fileWrites);

      var type = fields['type']; // 1: user, 2: group, 3: event, 4: product, 5: payment-screenshot, 6: misc
      if (![1, 2, 3, 4, 5, 6].includes(parseInt(type))) {
        res.writeHead(400, {});
        res.write(JSON.stringify({
          msgCode: 11601,
          msgResp: 'Invalid type'
        }));
        res.end();
        return;
      }

      var filePath = uploads.file;
      if (!filePath) {
        res.writeHead(400, {});
        res.write(JSON.stringify({
          msgCode: 11602,
          msgResp: 'Invalid request'
        }));
        res.end();
        return;
      }

      var today = new Date();
      var todayStr = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();

      // Put it on the bucket
      var result = await bucket.upload(filePath, {
        destination: 'upload/images/'+todayStr+'/'+type.toString()+userId+moment().valueOf()+'.jpg',
        public: true,
      });

      // Remove temp uploaded files
      for (const file in uploads) {
        fs.unlinkSync(uploads[file]);
      }

      res.writeHead(200, {});
      res.write(JSON.stringify({
        msgCode: 11600,
        msgResp: {
          url: result[0].metadata.mediaLink
        }
      }));
      res.end();

      var ip = req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null);
      ip = ip.split(',')[0];

      liveTracker.trackRemarkableUserActivities('User '+userEmail+' ('+ip+') has just uploaded a photo '+result[0].metadata.mediaLink);
    });

    req.pipe(busboy);
  }
  catch (e) {
    console.log(e);
    res.writeHead(400, {});
    res.write(JSON.stringify({
      msgCode: 11699,
      msgResp: 'Unknown'
    }));
    res.end();
  }
};