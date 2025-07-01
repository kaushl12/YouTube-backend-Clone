import morgan from "morgan";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/ApiError.js"; // Optional if you want to handle known errors
const app = express();
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev")); 
}
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
import commentRouter from "./routes/comment.routes.js";
import communityPostRouter from "./routes/communityPost.routes.js";
import likeRouter from "./routes/like.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/communityPost", communityPostRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/playlists", playlistRouter);

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
  success: false,
  message: err.message || "Internal Server Error",
  errors: err.errors || [],
  statusCode: err.statusCode || 500,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export { app };
