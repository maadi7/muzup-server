// routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Route for handling form submission and saving user data
router.post('/form-sumbit', async (req, res) => {
  try {
    const {
      username,
      email,
      birthdate,
      profilePic,
      topArtists,
      topTracks,
      recentlyPlayed
    } = req.body;

    const Useremail = await User.findOne({email: email })
    if(Useremail) return res.status(401).json("Your email is already registerd with muzup");
    const Username = await User.findOne({username: username })
    if(Username) return res.status(401).json("username already exist");



    // Create a new user instance
    const newUser = new User({
      username,
      email,
      birthdate,
      profilePic,
      topArtists,
      topTracks,
      recentlyPlayed
    });


    // Save user to database
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
