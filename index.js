const express = require("express");
const app = express();
const http = require('http');
const mongoose = require("mongoose");
const bodyParser = require('body-parser');
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require('socket.io');
const server = http.createServer(app);
const authRoute = require("./routes/auth")
const userRoute = require("./routes/user")
const io = new Server(server, { cors: { origin: 'http://localhost:3000' } }); // Replace with your frontend URL


dotenv.config();




mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected To DB");
    app.listen(5555, () => {
      console.log(`BACKEND PORT START`);
    });
  })
  .catch((error) => {
    console.log(error);
  });

//middleware
app.use(express.json());
app.use(cors({
  credentials:true
}));
app.use(bodyParser.json());

//routes
app.use("/api/auth/", authRoute);
app.use("/api/user/", userRoute);

server.listen(3001, () => {
  console.log("SERVER RUNNING ........");
});