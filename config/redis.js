// config/redis.js
const Redis = require("ioredis");
const dotenv = require("dotenv");

dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => {
    // Reconnection strategy
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Create Redis client
const redisClient = new Redis(redisConfig);

// Handle connection events
redisClient.on("connect", () => {
  console.log("Redis client connected");
});

redisClient.on("error", (err) => {
  console.error("Redis connection error:", err);
});

// Helper functions for common Redis operations
const redisHelpers = {
  // Set key with expiry
  async setWithExpiry(key, value, seconds) {
    return await redisClient.set(key, value, "EX", seconds);
  },

  // Get online status for a list of user IDs
  async getOnlineStatuses(userIds) {
    const pipeline = redisClient.pipeline();
    userIds.forEach((userId) => {
      pipeline.exists(`user:${userId}:online`);
    });

    const results = await pipeline.exec();
    return userIds.reduce((acc, userId, index) => {
      acc[userId] = results[index][1] === 1;
      return acc;
    }, {});
  },

  // Get recent notifications for a user
  async getRecentNotifications(userId, limit = 20) {
    const notifications = await redisClient.lrange(
      `user:${userId}:notifications`,
      0,
      limit - 1
    );
    return notifications.map((item) => JSON.parse(item));
  },

  // Get unread notification count for a user
  async getUnreadNotificationCount(userId) {
    const notifications = await this.getRecentNotifications(userId);
    return notifications.filter((notification) => !notification.read).length;
  },
};

module.exports = {
  redis: redisClient,
  redisHelpers,
};
