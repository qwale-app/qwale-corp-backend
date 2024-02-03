const bcrypt = require('bcrypt')
const usersRouter = require('express').Router()
const User = require('../models/user')
const Image = require('../models/image')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
require('dotenv').config()

const getTokenFrom = request => {
  const authorization = request.get('authorization')
  if(authorization && authorization.startsWith('Bearer ')) {
    return authorization.replace('Bearer ', '')
  }
  return null
}

usersRouter.post('/', async(request, response) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
  if(!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }
  const admin = await User.findById(decodedToken.id)
  if(!admin.admin) return response.status(401).end()

  const saltRounds = 10
  const passwordHash = await bcrypt.hash(crypto.randomBytes(20).toString('hex'), saltRounds)

  const user = new User({
    passwordHash,
    blogs: [],
    img: false
  })

  user.email = `${user.id}@blank.qwale.ca`
  user.username = `${user.id}`
  user.name = `${user.id}`

  const savedUser = await user.save()

  response.status(201).json(savedUser)
})

usersRouter.get('/', async(request, response) => {
  const users = await User
    .find({})
    .populate('blogs', { title: 1, approved: 1, publishDate: 1 })
  response.json(users)
})

usersRouter.put('/:id/name', async(request, response) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
  if(!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }
  const admin = await User.findById(decodedToken.id)
  if(!(admin.admin || admin.username===request.params.id)) return response.status(401).end()

  const body = request.body

  const updatedUser = await User.findOne({ username: request.params.id })
  updatedUser.name = body.name
  await updatedUser.save()

  response.json(updatedUser)
})

usersRouter.put('/:id/desc', async(request, response) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
  if(!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }
  const admin = await User.findById(decodedToken.id)
  if(!(admin.admin || admin.username===request.params.id)) return response.status(401).end()

  const body = request.body

  const updatedUser = await User.findOneAndUpdate({ username: request.params.id }, { description: body.description }, { new: true })
  response.json(updatedUser)
})

usersRouter.put('/:id/misc', async(request, response) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
  if(!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }
  const admin = await User.findById(decodedToken.id)
  if(!(admin.admin || admin.username===request.params.id)) return response.status(401).end()

  const body = request.body

  const updatedUser = await User.findOne({ username: request.params.id })
  if(body.email) updatedUser.email = body.email
  if(body.username) updatedUser.username = body.username
  if(updatedUser.img) await Image.findOneAndUpdate({ username: request.params.id }, { username: body.username }, { new: true })
  await updatedUser.save()

  response.json(updatedUser)
})

usersRouter.put('/:id/social', async(request, response) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
  if(!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }
  const admin = await User.findById(decodedToken.id)
  if(!(admin.admin || admin.username===request.params.id)) return response.status(401).end()

  const body = request.body
  if((!body.qwale) || body.qwale==='') delete body.qwale
  if((!body.linkedin) || body.linkedin==='') delete body.linkedin
  if((!body.twitter) || body.twitter==='') delete body.twitter
  if((!body.github) || body.github==='') delete body.github

  const updatedUser = await User.findOneAndUpdate({ username: request.params.id }, { socials: body }, { new: true })
  response.json(updatedUser)
})

usersRouter.put('/:id', async(request, response) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
  if(!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }
  const admin = await User.findById(decodedToken.id)
  if(!admin.admin) return response.status(401).end()

  const body = request.body

  const updatedUser = await User.findOneAndUpdate({ username: request.params.id }, body, { new: true })
  response.json(updatedUser)
})

usersRouter.put('/:id/positions', async(request, response) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
  if(!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }
  const admin = await User.findById(decodedToken.id)
  if(!admin.admin) return response.status(401).end()

  const body = request.body

  const updatedUser = await User.findOne({ username: request.params.id })

  if(body.type === 'bod') {
    updatedUser.board = updatedUser.board.filter(p => p._id.toString() !== body.id)
  } else {
    updatedUser.positions = updatedUser.positions.filter(p => p._id.toString() !== body.id)
  } await updatedUser.save()

  response.json(updatedUser)
})

usersRouter.delete('/:id', async(request, response) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
  if(!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }
  const admin = await User.findById(decodedToken.id)
  if(!admin.admin) return response.status(401).end()

  await User.findOneAndDelete({ username: request.params.id })
  Image.findOneAndDelete({ username: request.params.id })
    .then(() => response.status(204).end())
    .catch(() => response.status(204).end())
})





usersRouter.post('/:id/reset', async(request, response) => {
  const tokenToDecode = getTokenFrom(request)

  const decodedToken = jwt.verify(tokenToDecode, process.env.RESETSECRET)
  if(!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }
  const user = await User.findById(decodedToken.id)

  const compareToken = (tokenToDecode && user.resetToken && await bcrypt.compare(tokenToDecode, user.resetToken)) || false
  if(request.params.id !== decodedToken.id || !compareToken) return response.status(401).json({ error: 'token does not match' })

  const { newPassword } = request.body
  if(!(newPassword && /^(([a-z0-9A-Z]|[*.!@#$%^&(){}[\]:;<>,.?/~_+\-=|\\]){8,})$/.test(newPassword))) return response.status(400).json({ error: 'invalid password' })

  const saltRounds = 10
  const passwordHash = await bcrypt.hash(newPassword, saltRounds)

  user.passwordHash = passwordHash
  user.resetToken = null
  user
    .save()
    .then(() => response.sendStatus(201))
    .catch(() => response.sendStatus(201))
})

const mailjet = require('node-mailjet').apiConnect(
  process.env.MJ_APIKEY_PUBLIC,
  process.env.MJ_APIKEY_PRIVATE,
  {
    config: {},
    options: {}
  }
)

usersRouter.post('/:id/reset/send', async(request, response) => {
  const saltRounds = 10
  const user = await User.findOne({ username: request.params.id })

  const userForToken = {
    id: user._id,
  }

  const token = jwt.sign(userForToken, process.env.RESETSECRET, { expiresIn: 60*60*6 })
  user.resetToken = await bcrypt.hash(token, saltRounds)
  await user.save()

  const resetUrl = `https://qwale.ca/team/reset?token=${token}&user=${user._id}`

  mailjet
    .post('send', { version: 'v3.1' })
    .request({
      Messages: [
        {
          From: {
            Email: 'contact@qwale.ca',
            Name: 'Qwale Contact'
          },
          To: [
            {
              Email: user.email,
              Name: user.name
            }
          ],
          Subject: 'Qwale Corporate password reset',
          TextPart: `Hey ${user.name}! We have provided a link below for you to get back in to your Qwale Corporate account @${user.username}\n\n${resetUrl}`,
          HTMLPart: `<h3>Qwale Corporate password reset</h3><br/>Hey ${user.name}!<br/>We have provided a link below for you to get back in to your Qwale Corporate account @${user.username}<br/><br/>${resetUrl}`
        }
      ]
    })

  response.sendStatus(201)
})






module.exports = usersRouter