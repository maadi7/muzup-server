const router = require("express").Router();
const Post = require("../models/Post");
const User = require("../models/User");

// Create a post
router.post("/", async (req, res) => {
  const newPost = new Post(req.body);
  try {
    const post = await newPost.save();
    res.status(200).json(post);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update a post
router.put("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post.userId === req.body.userId) {
      await post.updateOne({ $set: req.body });
      res.status(200).json("Your post has been updated");
    } else {
      res.status(403).json("You can only update your post");
    }
  } catch (error) {
    return res.status(500).json(error);
  }
});

// Delete a post
router.delete("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post.userId === req.body.userId) {
      await post.deleteOne();
      res.status(200).json("Post has been deleted");
    } else {
      res.status(403).json("You can only delete your post");
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

// Like/Dislike a post
router.put("/:id/like", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post.likes.includes(req.body.userId)) {
      await post.updateOne({ $push: { likes: req.body.userId } });
      res.status(200).json("The post has been liked");
    } else {
      await post.updateOne({ $pull: { likes: req.body.userId } });
      res.status(200).json("The post has been disliked");
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

// Get a post
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json(error);
  }
});

// Get timeline posts
router.get("/timeline/:userId", async (req, res) => {
  try {
    const currentUser = await User.findById(req.params.userId);
    const userPosts = await Post.find({ userId: currentUser._id });
    const friendPosts = await Promise.all(
      currentUser.followings.map((friendId) => {
        return Post.find({ userId: friendId });
      })
    );
    res.status(200).json(userPosts.concat(...friendPosts));
  } catch (error) {
    res.status(500).json(error);
  }
});

// Get all posts of a user
router.get("/profile/:username", async (req, res) => {
  try {
    const currentUser = await User.findOne({ username: req.params.username });
    const userPosts = await Post.find({ userId: currentUser._id });
    res.status(200).json(userPosts);
  } catch (error) {
    res.status(500).json(error);
  }
});

// Add a comment to a post
router.post("/:id/comment", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json("Post not found");
    }

    const comment = {
      id: req.body.userId,  
      name: req.body.name,  
      text: req.body.text,
    };

    post.comments.push(comment);

    const updatedPost = await post.save();
    res.status(200).json(updatedPost);
  } catch (error) {
    res.status(500).json(error);
  }
});

// Delete a comment from a post
router.delete("/:postId/comment/:commentId", async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json("Post not found");
    }

    // Find the comment index
    const commentIndex = post.comments.findIndex(
      (comment) => comment._id.toString() === req.params.commentId
    );

    if (commentIndex === -1) {
      return res.status(404).json("Comment not found");
    }

    // Check if the user requesting the delete owns the comment
    if (post.comments[commentIndex].id.toString() !== req.body.userId) {
      return res.status(403).json("You can only delete your own comment");
    }

    // Remove the comment
    post.comments.splice(commentIndex, 1);

    // Save the post after the comment has been removed
    await post.save();

    res.status(200).json("Comment has been deleted");
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;
