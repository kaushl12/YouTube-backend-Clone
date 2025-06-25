import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/ApiError.js"; // Optional if you want to handle known errors
const app = express();

// Middlewares
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const errors = err.errors || [];

  res.status(err.statusCode || 500).json({
  success: false,
  message: err.message || "Internal Server Error",
  errors: err.errors || [],
  statusCode: err.statusCode || 500,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export { app };
