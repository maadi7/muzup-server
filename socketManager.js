// socketManager.js
const socketIO = require("socket.io");
const Message = require("./models/Message");
const Notification = require("./models/Notification"); // We'll create this
const { redis: redisClient } = require("./config/redis");

class SocketManager {
  constructor(server) {
    this.io = socketIO(server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    this.users = new Map(); // userId -> socketId
    this.initialize();
  }

  initialize() {
    this.io.on("connection", (socket) => {
      console.log(`New connection: ${socket.id}`);

      // User authentication and tracking
      socket.on("addUser", async (userId) => {
        this.addUser(userId, socket.id);
        await redisClient.set(`user:${userId}:online`, "true");
        await redisClient.expire(`user:${userId}:online`, 3600); // 1 hour expiry
        this.io.emit("getUsers", [...this.users.entries()]);
      });

      // Handle messaging
      socket.on("sendMessage", async (data) => {
        const { sender, receiverId, text, conversationId, messageId } = data;
        await this.handleMessageSend(
          socket,
          sender,
          receiverId,
          text,
          conversationId,
          messageId
        );
      });

      // Handle message status
      socket.on(
        "messageDelivered",
        async ({ messageId, senderId, receiverId }) => {
          await this.updateMessageStatus(messageId, "delivered");
          const senderSocket = this.getUser(senderId);
          if (senderSocket) {
            this.io.to(senderSocket).emit("messageStatus", {
              messageId,
              status: "delivered",
            });
          }
        }
      );

      socket.on(
        "messageSeen",
        async ({ sender, receiverId, conversationId, messageId }) => {
          await this.updateMessageStatus(messageId, "seen");
          const senderSocket = this.getUser(sender);
          if (senderSocket) {
            this.io.to(senderSocket).emit("messageStatus", {
              messageId,
              status: "seen",
              conversationId,
            });
          }
        }
      );

      // Handle typing indicators
      socket.on("typing", ({ senderId, receiverId, conversationId }) => {
        const receiverSocket = this.getUser(receiverId);
        if (receiverSocket) {
          this.io
            .to(receiverSocket)
            .emit("userTyping", { senderId, conversationId });
        }
      });

      socket.on("stopTyping", ({ senderId, receiverId, conversationId }) => {
        const receiverSocket = this.getUser(receiverId);
        if (receiverSocket) {
          this.io
            .to(receiverSocket)
            .emit("userStoppedTyping", { senderId, conversationId });
        }
      });

      // Handle notifications
      socket.on(
        "markNotificationsRead",
        async ({ userId, notificationIds }) => {
          await this.markNotificationsRead(userId, notificationIds);
        }
      );

      // Disconnect handling
      socket.on("disconnect", async () => {
        const userId = this.getUserIdBySocketId(socket.id);
        if (userId) {
          await redisClient.set(
            `user:${userId}:lastSeen`,
            Date.now().toString()
          );
          await redisClient.del(`user:${userId}:online`);
          this.removeUser(socket.id);
          this.io.emit("getUsers", [...this.users.entries()]);
        }
      });
    });
  }

  addUser(userId, socketId) {
    this.users.set(userId, socketId);
  }

  removeUser(socketId) {
    for (const [userId, id] of this.users.entries()) {
      if (id === socketId) {
        this.users.delete(userId);
        return userId;
      }
    }
    return null;
  }

  getUser(userId) {
    return this.users.get(userId);
  }

  getUserIdBySocketId(socketId) {
    for (const [userId, id] of this.users.entries()) {
      if (id === socketId) return userId;
    }
    return null;
  }

  async handleMessageSend(
    socket,
    sender,
    receiverId,
    text,
    conversationId,
    messageId
  ) {
    try {
      // First update the message status to 'sent'
      await this.updateMessageStatus(messageId, "sent");

      // Notify sender of sent status
      const senderSocket = this.getUser(sender);
      if (senderSocket) {
        this.io.to(senderSocket).emit("messageStatus", {
          messageId,
          status: "sent",
        });
      }

      // Check if recipient is online
      const receiverSocket = this.getUser(receiverId);
      if (receiverSocket) {
        // Send message to receiver
        this.io.to(receiverSocket).emit("getMessage", {
          sender,
          text,
          conversationId,
          messageId,
        });

        // Update message to delivered status
        await this.updateMessageStatus(messageId, "delivered");

        // Notify sender of delivery
        if (senderSocket) {
          this.io.to(senderSocket).emit("messageStatus", {
            messageId,
            status: "delivered",
          });
        }
      } else {
        // User is offline, create notification
        await this.createNotification({
          type: "message",
          recipient: receiverId,
          sender,
          content: text,
          reference: messageId,
          conversationId,
        });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      socket.emit("messageError", {
        messageId,
        error: "Failed to process message",
      });
    }
  }

  async updateMessageStatus(messageId, status) {
    try {
      await Message.findByIdAndUpdate(messageId, { status });
      // Cache the status in Redis for quick retrieval
      await redisClient.set(`message:${messageId}:status`, status);
      return true;
    } catch (error) {
      console.error("Error updating message status:", error);
      return false;
    }
  }

  async createNotification(notificationData) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();

      // Store in Redis for quick access
      await redisClient.lpush(
        `user:${notificationData.recipient}:notifications`,
        JSON.stringify(notificationData)
      );

      // Keep only recent notifications in cache (limit to 50)
      await redisClient.ltrim(
        `user:${notificationData.recipient}:notifications`,
        0,
        49
      );

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  }

  async markNotificationsRead(userId, notificationIds) {
    try {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, recipient: userId },
        { $set: { read: true } }
      );

      // Update Redis cache
      const notifications = await redisClient.lrange(
        `user:${userId}:notifications`,
        0,
        -1
      );
      for (const notificationStr of notifications) {
        const notification = JSON.parse(notificationStr);
        if (notificationIds.includes(notification._id)) {
          notification.read = true;
          await redisClient.lrem(
            `user:${userId}:notifications`,
            1,
            notificationStr
          );
          await redisClient.lpush(
            `user:${userId}:notifications`,
            JSON.stringify(notification)
          );
        }
      }

      return true;
    } catch (error) {
      console.error("Error marking notifications read:", error);
      return false;
    }
  }

  // Send notification to a user if they're online
  async sendNotification(userId, notification) {
    const userSocket = this.getUser(userId);
    if (userSocket) {
      this.io.to(userSocket).emit("newNotification", notification);
      return true;
    }
    return false;
  }
}

module.exports = SocketManager;
