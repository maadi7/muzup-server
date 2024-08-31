const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
     },
    name: { 
        type: String
     },
    text: { 
        type: String
    },
   
  }, {
    timestamps: true
  });


const PostSchema = new mongoose.Schema({
    userId:{
        type:String,
        required: true
    },
    caption:{
        type:String,
        max:50
    },
    img:{
      type:String
    },
    likes:{
        type: Array,
        default: []
    },
    songId:{
        type: String,
        required: false
    },
    comments: [commentSchema]
    
    
},
 {timestamps: true}

);

module.exports = mongoose.model("Post", PostSchema);