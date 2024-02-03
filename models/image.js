var mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

var imageSchema = new mongoose.Schema({
  username: {
    unique: true,
    required: true,
    type: String,
  },
  img:
    {
      data: Buffer,
      contentType: String
    }
})

imageSchema.plugin(uniqueValidator)

module.exports = mongoose.model('Image', imageSchema)