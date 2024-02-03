const config = require('./utils/config')
const express = require('express')
require('express-async-errors')
const app = express()
const cors = require('cors')
const blogsRouter = require('./controllers/blogs')
const usersRouter = require('./controllers/users')
const loginRouter = require('./controllers/login')
const uploadRouter = require('./controllers/upload')
const middleware = require('./utils/middleware')
const logger = require('./utils/logger')
const mongoose = require('mongoose')
var bodyParser = require('body-parser')
const path = require('path')

mongoose.set('strictQuery', false)

logger.info('connecting to', config.MONGODB_URI)

mongoose.connect(config.MONGODB_URI)
  .then(() => {
    logger.info('connected to MongoDB')
  })
  .catch((error) => {
    logger.error('error connecting to MongoDB:', error.message)
  })

app.use(cors())
app.use(express.static('dist'))
app.use(express.json())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use('/api/corporate/blog', blogsRouter)
app.use('/api/corporate/team', usersRouter)
app.use('/api/corporate/login', loginRouter)
app.use('/api/corporate/img', uploadRouter)

app.get('/api/*', (req, res) => {
  res.sendStatus(404)
})
app.get('/assets/:id', (req, res) => {
  res.sendFile(path.resolve(process.cwd(), `frontend/assets/${req.params.id}`))
})
app.get('*', (req, res) => {
  res.sendFile(path.resolve(process.cwd(), 'frontend/index.html'))
})

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app