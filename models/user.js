const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

const userSchema = new mongoose.Schema({
  admin: Boolean,
  username: {
    type: String,
    required: true,
    unique: true,
    validate: /^[A-Za-z0-9_\-.]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: /^[\w-.]+@([\w-]+\.)+[\w-]+$/
  },
  name: String,
  passwordHash: String,
  blogs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog',
    }
  ],
  board: [
    {
      start: Date,
      end: Date
    }
  ],
  positions: [
    {
      start: Date,
      end: Date,
      position: String,
      executive: Boolean
    }
  ],
  socials: {
    qwale: String,
    linkedin: String,
    twitter: String,
    github: String,
  },
  description: String,
  img: Boolean,
  resetToken: String,
})

userSchema.plugin(uniqueValidator)

userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
    delete returnedObject.resetToken
    //the passwordHash should not be revealed
    delete returnedObject.passwordHash
  }
})

const User = mongoose.model('User', userSchema)

module.exports = User