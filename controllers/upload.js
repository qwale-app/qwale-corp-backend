const uploadRouter = require('express').Router()
var imgSchema = require('../models/image')
var User = require('../models/user')
var fs = require('fs')
var path = require('path')
const jwt = require('jsonwebtoken')
var im = require('sharp')
require('dotenv').config()

const clearDirectory = () => {
  fs.readdir(path.dirname(__dirname) + '/uploads', (err, files) => {
    if (err) console.log(err && (err.code || err.statusCode || err))

    for (const file of files.filter(f => f !== '.gitignore')) {
      fs.rm(path.join(path.dirname(__dirname) + '/uploads', file), { force: true, maxRetries: 3, recursive: true }, (err) => {
        if (err) console.log(`Error: ${err && (err.code || err.statusCode || err)}`)
      })
    }
  })
}
clearDirectory()

var multer = require('multer')

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads')
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + '.temp')
  }
})

var upload = multer({ storage: storage, limits: { fileSize: 8e6 } })

const getTokenFrom = request => {
  const authorization = request.get('authorization')
  if(authorization && authorization.startsWith('Bearer ')) {
    return authorization.replace('Bearer ', '')
  }
  return null
}

uploadRouter.get('/:userId', (req, res) => {
  imgSchema.findOne({ username: req.params.userId })
    .then((data, err) => {
      if(err){
        console.log(err)
      }
      if(!(data && data.img && data.img.contentType && data.img.data && true)) return res.status(500).end()
      res.type(data.img.contentType).send(data.img.data).end()
    }).catch(() => {
      return res.status(404).end()
    })
})

const resizeImage = async(inFile, outFile) => {
  await im(inFile)
    .resize(320, 320)
    .timeout({ seconds: 20 })
    .jpeg({ mozjpeg: true })
    .timeout({ seconds: 20 })
    .toFile(outFile)
}

uploadRouter.put('/:userId', upload.single('image'), async(req, res) => {
  const decodedToken = jwt.verify(getTokenFrom(req), process.env.SECRET)
  if(!decodedToken.id) {
    return res.status(401).json({ error: 'token invalid' })
  }
  const admin = await User.findById(decodedToken.id)
  if(!(admin.admin || admin.username === req.params.userId)) return res.status(401).end()

  const filePath = path.join(path.dirname(__dirname) + '/uploads/' + req.file.filename)
  const filePathResized = path.join(path.dirname(__dirname) + '/uploads/' + req.file.filename + '-resized')

  await resizeImage(filePath, filePathResized)

  var obj = {
    username: req.params.userId,
    img: {
      data: fs.readFileSync(filePathResized),
      contentType: 'image/jpg'
    }
  }

  let image = await imgSchema.findOne({ username: req.params.userId })

  if(image) {
    image.img = obj.img
    image.username = obj.username
    image.save()
  } else {
    await imgSchema.create(obj)
  }
  await User.findOneAndUpdate({ username: req.params.userId }, { img: true }, { new: true })
  clearDirectory()
  return res.status(200).end()
})

module.exports = uploadRouter