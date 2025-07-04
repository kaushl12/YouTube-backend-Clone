import express from "express";
import { getChannelStats,getChannelVideos } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/channelstats/:channelId", getChannelStats);
router.get("/channelvideos/:channelId", getChannelVideos);

export default router;
