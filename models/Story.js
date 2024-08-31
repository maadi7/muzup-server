const mongoose = require("mongoose");

const storiesSchema = new mongoose.Schema({
  img: { 
      type: String
   },
   songId: { 
      type: String
  },
}, {
  timestamps: true
});

const StorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username:{
    type: String
  },
  stories:[storiesSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {expires: '24h'});

module.exports = mongoose.model("Story", StorySchema);