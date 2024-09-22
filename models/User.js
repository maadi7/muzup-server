const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String },
  followers: { type: Number },
  genres: [String],
  images:[String],
  popularity: { type: Number },
  type: { type: String },
}, {
  timestamps: true
});



// Album Schema
const albumSchema = new mongoose.Schema({
  album_type: { type: String },
  id: { type: String },
  name: { type: String },
  images: [String], // Array of image URLs
}, { _id: false });

const artist = new mongoose.Schema({
  id: { type: String },
  name: { type: String },
  type: { type: String },
}, { _id: false });

// Track Schema
const trackSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  popularity: { type: Number },
  is_local: { type: Boolean },
  preview_url: { type: String },
  type: { type: String },
  track_number: { type: Number },
  album: albumSchema, // Embedded Album Schema
  artists: [artist], // Array of Artist Schemas
}, { _id: false });


// Track Schema
const recentlyPlayedSchema = new mongoose.Schema({
  played_at: {type: Date},
  id: { type: String, required: true },
  name: { type: String, required: true },
  popularity: { type: Number },
  is_local: { type: Boolean },
  preview_url: { type: String },
  type: { type: String },
  track_number: { type: Number },
  album: albumSchema, // Embedded Album Schema
  artists: [artist], // Array of Artist Schemas
}, { _id: false });


const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
  },
  birthdate: {
    type: Date,
    required: true
  },
  profilePic: {
    type: String, 
    required: false
  },
  topArtists: [artistSchema], // Store entire artist objects
  topTracks: [trackSchema],
  recentlyPlayed: [recentlyPlayedSchema],
  followers: {
    type: Array,
    default: []
  },
  followings: {
    type: Array,
    default: []
  },
  pendingRequests: {
    type: Array,
    default: []
  },
  requestedTo: {
    type: Array,
    default: []
  },
  blockedByMe:{
    type:Array,
    default:[]
  },
  isPrivate:{
    type: Boolean,
    default: true
  },
  bio: {
    type: String,
    required: false
  },
  spotifyAccessToken:{
    type: String
  },
  spotifyRefreshToken:{
    type: String
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;
