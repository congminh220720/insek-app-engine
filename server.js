const app = require('./app')

const PORT = process.env.PORT || 8081

const server = app.listen(PORT, () => console.log('App engine is running on port', PORT))
process.on('SIGINT', () => {
    server.close()
    console.log('App engine has closed')
})

