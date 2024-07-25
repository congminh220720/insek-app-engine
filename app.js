require('module-alias/register');
const express = require('express')
const helmet = require('helmet')
const morgan = require('morgan')
const crypto = require('crypto');
const compression = require('compression')
const endpointMap = require('@utils/endPointMap')

const {verifyAndAuthorize, applyRateLimiting, checkIp} = require('@security/middleware-cus')

// create server
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

for ( endpoint in endpointMap ) {
    let method = endpointMap[endpoint]
    let methods = require(`./functions/${endpoint}.js`)
    endpoint = endpoint.substring(4)

    app.get(`/${endpoint}`,methods[method])
    app.post(`/${endpoint}`,methods[method])
    app.put(`/${endpoint}`,methods[method])
    app.patch(`/${endpoint}`,methods[method])
}

module.exports = app


