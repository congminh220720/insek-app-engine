const fs = require('fs');
const path = require('path');
const moment = require('moment');

const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKE = process.env.DEV_TELEGRAM_TOKEN
const TELEGRAM_CHAT_ID = process.env.DEV_TELEGRAM_CHAT_ID

// const telegramBot = new TelegramBot(TELEGRAM_TOKE, { polling: true });
const lockedIpFilePath = path.join(__dirname, '..', 'fs-cus', 'lockedIp.txt')

const appendIpToFile = (ip) => {
    fs.appendFile(lockedIpFilePath, ip + '\n', async (err) => {
        if (err) {
            let notifyErrorMessage = `error when write file in to locked IP with id is ${ip}`
            // await telegramBot.sendMessage(TELEGRAM_CHAT_ID,notifyErrorMessage)
            console.log(notifyErrorMessage)
            console.log(err)
        }
    })  
}

module.exports.isLockedIp = (ip, callback) => {
    fs.readFile(lockedIpFilePath, 'utf8', async (err, data) => {
        if (err) {
            let notifyErrorMessage = 'error when process read lockedIp file'
            // await telegramBot.sendMessage(TELEGRAM_CHAT_ID,notifyErrorMessage)
            callback(false);
            console.log(notifyErrorMessage)
            return
        }

        console.log(data)
        if (!data || data === '') {
            callback(false);
            return;
        }
      
        const lockedIps = data.split('\n').filter(Boolean)
        callback(lockedIps.includes(ip))
    })
}

module.exports.lockIp = (ip) => {
    appendIpToFile(ip);
}

module.exports.checkPreAuth = (req) => {
    let error = 'No preauth';
    let preauth = req.headers['keep-aiive'];
    if (preauth) {
      let timeAndCode = preauth.split(',');
      if (timeAndCode[0] && timeAndCode[1]) {
        let time = parseInt(timeAndCode[0].trim());
        let code = parseInt(timeAndCode[1].trim());
        if (time % 199998 == code) {
          if (moment().unix() - time < 24*3600) {
            error = null;
          }
          else {
            error = 'Preauth expired';
          }
        }
        else {
          error = 'Incorrect preauth';
        }
      }
      else {
        error = 'Invalid preauth';
      }
    }
  
    return error;
}
