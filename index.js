const express = require("express");
const app = express();
const http = require('http');
const mongoose = require("mongoose");
const bodyParser = require('body-parser');
const cors = require("cors");
const dotenv = require("dotenv");
const server = http.createServer(app); // Create HTTP server
const io = require("socket.io")(server, { // Pass the server instance to socket.io
  cors: {
    origin: "http://localhost:3000",
  },
});
const authRoute = require("./routes/auth");
const userRoute = require("./routes/user");
const postRoute = require("./routes/post");
const storyRoute = require("./routes/story");
const conversationRoute = require("./routes/conversation");
const messageRoute = require("./routes/message");
const matchMakerRoute = require("./routes/matchmaker");
const {  updateRecentlyPlayed, updateTopArtistsAndTracks } = require("./utils/spotifyUpdate");


dotenv.config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected To DB");
    server.listen(5555, () => { // Use server instance here
      console.log(`BACKEND PORT START`);
      updateRecentlyPlayed();
      updateTopArtistsAndTracks()
    });
  })
  .catch((error) => {
    console.log(error);
  });

// Middleware
app.use(express.json());
app.use(cors({ credentials: true }));
app.use(bodyParser.json());

// Routes
app.use("/api/auth/", authRoute);
app.use("/api/user/", userRoute);
app.use("/api/post/", postRoute);
app.use("/api/story/", storyRoute);
app.use("/api/conversation", conversationRoute);
app.use("/api/messages", messageRoute);
app.use("/api/match", matchMakerRoute);

// Socket.io setup
let users = [];

const addUser = (userId, socketId) => {
  if (!users.some((user) => user.userId === userId)) {
    users.push({ userId, socketId });
    console.log(`User added: ${userId} with socketId: ${socketId}`);
  }
};


const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

io.on("connection", (socket) => {
  // On user connection
  console.log("a user connected");

  // Add user
  socket.on("addUser", (userId) => {
    addUser(userId, socket.id);
    io.emit("getUsers", users);
    console.log(users);
  });

  // Send and get message
  socket.on("sendMessage", ({ senderId, receiverId, text, conversationId }) => {
    const user = getUser(receiverId);
    if (user) {
      io.to(user.socketId).emit("getMessage", { senderId, text, conversationId });
      console.log(`Message sent to ${receiverId}: ${text}`);
    } else {
      console.log(`User ${receiverId} not found`);
    }
  });

  socket.on("typing", ({ senderId, receiverId, conversationId }) => {
    const user = getUser(receiverId);
    if (user) {
      io.to(user.socketId).emit("userTyping", { senderId, conversationId });
    }
  });

  socket.on("stopTyping", ({ senderId, receiverId, conversationId }) => {
    const user = getUser(receiverId);
    if (user) {
      io.to(user.socketId).emit("userStoppedTyping", { senderId, conversationId });
    }
  });

  // Handle message seen status
  socket.on("messageSeen", ({ senderId, receiverId, conversationId, messageId }) => {
    const user = getUser(senderId);
    if (user) {
      io.to(user.socketId).emit("messageSeenUpdate", { receiverId, conversationId, messageId });
    }
  });


  // On user disconnection
  socket.on("disconnect", () => {
    console.log("a user disconnected");
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});
