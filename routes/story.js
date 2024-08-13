const express = require('express');
const router = express.Router();
const Story = require('../models/Story');

// Create a new story
router.post('/', async (req, res) => {
  try {
    const newStory = new Story(req.body);
    await newStory.save();
    res.status(201).json(newStory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all stories from users that the current user is following
router.get('/following/:userId', async (req, res) => {
    try {
      const user = await User.findById(req.params.userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
  
      // Get the list of followed user IDs
      const followedUserIds = user.followings;
  
      // Fetch stories from followed users
      const stories = await Story.find({ userId: { $in: followedUserIds } }).sort({ createdAt: -1 });
  
      res.status(200).json(stories);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  
// Get all stories
router.get('/', async (req, res) => {
  try {
    const stories = await Story.find();
    res.status(200).json(stories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single story by ID
router.get('/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    res.status(200).json(story);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a story by ID
router.delete('/:id', async (req, res) => {
  try {
    const story = await Story.findByIdAndDelete(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    res.status(200).json({ message: 'Story deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
