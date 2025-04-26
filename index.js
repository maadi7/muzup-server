const express = require("express");
const app = express();
const http = require("http");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const server = http.createServer(app);
const SocketManager = require("./socketManager");
const { redis } = require("./config/redis");

// Import routes
const authRoute = require("./routes/auth");
const userRoute = require("./routes/user");
const postRoute = require("./routes/post");
const storyRoute = require("./routes/story");
const conversationRoute = require("./routes/conversation");
const messageRoute = require("./routes/message");
const matchMakerRoute = require("./routes/matchmaker");
const notificationRoute = require("./routes/notification"); // We'll create this
const {
  updateRecentlyPlayed,
  updateTopArtistsAndTracks,
} = require("./utils/spotifyUpdate");

dotenv.config();

// Initialize the Socket Manager
const socketManager = new SocketManager(server);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected To MongoDB");
    server.listen(5555, () => {
      console.log(`BACKEND PORT START on 5555`);
      updateRecentlyPlayed();
      updateTopArtistsAndTracks();
    });
  })
  .catch((error) => {
    console.log("MongoDB Connection Error:", error);
  });

// Middleware
app.use(express.json());
app.use(cors({ credentials: true }));
app.use(bodyParser.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Routes
app.use("/api/auth/", authRoute);
app.use("/api/user/", userRoute);
app.use("/api/post/", postRoute);
app.use("/api/story/", storyRoute);
app.use("/api/conversation", conversationRoute);
app.use("/api/messages", messageRoute);
app.use("/api/match", matchMakerRoute);
app.use("/api/notifications", notificationRoute);

// Make socket manager available to routes
app.use((req, res, next) => {
  req.socketManager = socketManager;
  req.redisClient = redis;
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// Handle process termination
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  try {
    await mongoose.connection.close();
    await redis.quit();
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
});

module.exports = { app, server };
