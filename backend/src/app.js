import express from "express";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]
  })
);

app.get("/", (req, res) => {
  res.send("Backend is running");
});

export default app;
