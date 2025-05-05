// routes/notification.js
const router = require("express").Router();
const Notification = require("../models/Notification");
const { redisHelpers } = require("../config/redis");

// Get all notifications for a user
router.get("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Try getting from Redis first (faster)
    const cachedNotifications = await redisHelpers.getRecentNotifications(
      userId
    );

    if (cachedNotifications.length > 0) {
      return res.status(200).json(cachedNotifications);
    }

    // Fall back to database if not in cache
    const notifications = await Notification.find({
      recipient: userId,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("sender", "username profilePic")
      .exec();

    // Cache the results
    const pipeline = req.redisClient.pipeline();
    notifications.forEach((notification) => {
      pipeline.lpush(
        `user:${userId}:notifications`,
        JSON.stringify(notification)
      );
    });
    pipeline.ltrim(`user:${userId}:notifications`, 0, 49);
    await pipeline.exec();

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Failed to get notifications" });
  }
});

// Get unread notification count
router.get("/unread/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Try Redis first
    let count = null;
    count = await redisHelpers.getUnreadNotificationCount(userId);
    if (count !== null) {
      return res.status(200).json({ count });
    }

    // Fall back to database
    count = await Notification.countDocuments({
      recipient: userId,
      read: false,
    });

    res.status(200).json({ count });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ message: "Failed to get unread count" });
  }
});

// Mark notifications as read
router.put("/read", async (req, res) => {
  try {
    const { userId, notificationIds } = req.body;

    if (!userId || !notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ message: "Invalid request parameters" });
    }

    // Update in database
    await Notification.updateMany(
      { _id: { $in: notificationIds }, recipient: userId },
      { $set: { read: true } }
    );

    // Update in Redis
    req.socketManager.markNotificationsRead(userId, notificationIds);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ message: "Failed to mark notifications as read" });
  }
});

module.exports = router;
