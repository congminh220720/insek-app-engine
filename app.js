require('module-alias/register');
const express = require('express')
const helmet = require('helmet')
const morgan = require('morgan')
const compression = require('compression')
const {verifyAndAuthorize, applyRateLimiting, checkIp} = require('@security/middleware-cus')
const checkConnectDB= require('@database/checkConnect')

const app = express() 

// init middleware
app.use(morgan('dev'))
app.use(helmet())
app.use(compression())
app.use(express.urlencoded({ extended : true}))
app.use(express.json())
app.use(verifyAndAuthorize)
app.use(applyRateLimiting)
app.use(checkIp)

// init database
app.use(checkConnectDB)


app.get('/', (req,res) => {
    res.status(200).send('Hello')
    res.end()
})

module.exports = app


