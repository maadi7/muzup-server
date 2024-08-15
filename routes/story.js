const express = require('express');
const router = express.Router();
const Story = require('../models/Story');
const User = require('../models/User');

// Create or add a new story
router.post('/', async (req, res) => {
  try {
    const { userId, username, stories } = req.body;
    let story = await Story.findOne({ userId });
    if (story) {
      story.stories.push(...stories);
    } else {
      story = new Story({
        userId,
        username,
        stories
      });
    }
    const savedStory = await story.save();
    res.status(201).json(savedStory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all stories from users that the current user is following
router.get('/following/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const followedUserIds = user.followings;
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
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    if (story.userId.toString() === req.body.userId) {
      await story.deleteOne();
      res.status(200).json({ message: 'Story deleted successfully' });
    } else {
      res.status(403).json({ message: 'You can only delete your own stories' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
