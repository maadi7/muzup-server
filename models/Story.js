const mongoose = require("mongoose");
const StorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  img: {
    type: String,
    required: true
  },
  song:{
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {expires: '24h'});

module.exports = mongoose.model("Story", StorySchema);