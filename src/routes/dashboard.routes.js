import express from "express";
import { getChannelStats,getChannelVideos } from "../controllers/dashboard.controller.js";
import { verifyJWT } from './../middlewares/auth.middleware.js';

const router = express.Router();
router.use(verifyJWT)
router.get("/channelstats", getChannelStats);
router.get("/channelvideos/:channelId", getChannelVideos);

export default router;
