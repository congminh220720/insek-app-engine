
const rateLimit = require('express-rate-limit');
const {allowedOrigins} = require('@utils/constant')
const secChk = require('@security/sec-chk')

const LIMIT_REQUEST_TIME = process.env.LIMIT_REQUEST_TIME
const LIMIT_REQUEST_COUNT = process.env.LIMIT_REQUEST_COUNT

// defense by ddos
const limiter = rateLimit({
    windowMs: LIMIT_REQUEST_TIME, 
    max: LIMIT_REQUEST_COUNT, // limit request for each ip on LIMIT_REQUEST_TIME
    message: 'Too many requests from this IP, please try again after 15 minutes',
    headers: true,
});

const verifyAndAuthorize = (req, res, next) => {
    // notify though http
    res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, PATCH')
    res.setHeader('x-powered-by','Django') // Purposely misleading
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Keep-Alive, sentry-trace')
    res.setHeader('Content-Type', 'application/json')

    // defined the allow origins
    const origin = req.headers.origin
    if (allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }
    next()
}

const checkIp = (req, res, next) => {
    let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : null);
    ip = ip.split(",")[0]
    
    //chk black list 
    secChk.isLockedIp(ip, (isLocked) => {
        if (isLocked) {
            return res.status(400).json({ name: 'John Doe', age: 30 })
        } else {
            next()
        }
    })
}


const applyRateLimiting = (req, res, next) => {
    limiter(req, res, next)
}

module.exports = {verifyAndAuthorize, applyRateLimiting, checkIp}