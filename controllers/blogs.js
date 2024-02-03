const jwt = require('jsonwebtoken')
const blogRouter = require('express').Router()
const Blog = require('../models/blog')
const User = require('../models/user')

const getTokenFrom = request => {
  const authorization = request.get('authorization')
  if(authorization && authorization.startsWith('Bearer ')) {
    return authorization.replace('Bearer ', '')
  }
  return null
}
const numResults = 8
blogRouter.get('/page/:page', async(request, response) => {
  const pageNum = Number(request.params.page) || 1
  const blogs = await Blog.find({ approved: true }).sort('-publishDate').skip((pageNum - 1) * numResults).limit(numResults).select({ title: 1, approved: 1, publishDate: 1, user: 1 }).populate('user', { username: 1, name: 1, img: 1 })
  response.json(blogs)
})

blogRouter.get('/drafts', async(request, response) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
  if(!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }
  const user = await User.findById(decodedToken.id)

  if(user.admin) {
    Blog.find({ approved: false }).sort('-publishDate').select({ title: 1, user: 1 }).populate('user', { username: 1, name: 1, img: 1 }).then(b => response.json(b))
  } else {
    Blog.find({ user: user.id, approved: false }).sort('-publishDate').select({ title: 1, user: 1 }).populate('user', { username: 1, name: 1, img: 1 }).then(b => response.json(b))
  }
})

blogRouter.get('/b/:id', async(request, response) => {
  const blog = await Blog.findById(request.params.id).populate('user', { username: 1, name: 1, img: 1, approved: 1 })
  if(!blog) return response.status(404).end()

  jwt.verify(getTokenFrom(request), process.env.SECRET, async(err, decodedToken) => {
    if((!blog.approved) && (((!decodedToken) || err) || (!decodedToken.id))) {
      return response.status(401).json({ error: 'token invalid' })
    }
    const user = (decodedToken && !err) ? await User.findById(decodedToken.id) : null

    if(blog.approved || (user && (blog.user.username === user.username || user.admin))) {
      response.json(blog)
    }
  })
})

blogRouter.get('/count', async(request, response) => {
  const count = await Blog.countDocuments({ approved: true })
  response.json({ count, pages: Math.ceil(count / numResults) })
})

blogRouter.post('/', async(request, response) => {
  const body = request.body
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
  if(!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }
  const user = await User.findById(decodedToken.id)
  if(!(user.positions.some(p => !p.end) || user.board.some(p => !p.end))) return response.status(401).end()

  const blog = new Blog({
    title: body.title,
    content: body.content || '',
    user: user.id,
    updateDate: new Date(),
    approved: false
  })

  const savedBlog = await blog.save()
  user.blogs = user.blogs.concat(savedBlog._id)
  await user.save()

  response.status(201).json(savedBlog)
})

blogRouter.delete('/:id', async(request, response) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
  if(!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }
  const user = await User.findById(decodedToken.id)
  const blog = await Blog.findById(request.params.id)

  if(!(user && (user.username === blog.user.username || user.admin) && (user.positions.some(p => !p.end) || user.board.some(p => !p.end)))) return response.status(401).end()
  await Blog.findByIdAndDelete(request.params.id)
  response.status(204).end()
})

blogRouter.put('/:id', async(request, response) => {
  const body = request.body
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
  if(!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }
  const blog = await Blog.findById(request.params.id)
  if(!blog) return response.status(404).end()

  const user = await User.findById(decodedToken.id)
  if(!(user && (user.username === blog.user.username || user.admin) && (user.positions.some(p => !p.end) || user.board.some(p => !p.end)))) return response.status(401).end()

  if(body.content) blog.content = body.content
  if(body.title) blog.title = body.title
  blog.updateDate = new Date()
  if(!user.admin) blog.approved = false

  const updatedBlog = await blog.save()
  response.json(updatedBlog)
})

blogRouter.put('/:id/force', async(request, response) => {
  const body = request.body
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
  if(!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }
  const blog = await Blog.findById(request.params.id)
  if(!blog) return response.status(404).end()

  const user = await User.findById(decodedToken.id)
  if(!(user && user.admin)) return response.status(401).end()

  blog.approved = body.approved
  if(body.approved) blog.publishDate = new Date()

  const updatedBlog = await blog.save()
  response.json(updatedBlog)
})

module.exports = blogRouter