import { Router } from "express";
import { toggleSubscription,getUserChannelSubscribers,getSubscribedChannels } from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router=Router()
router.use(verifyJWT)

router.route("/toggle/:channelId").post(toggleSubscription);
router.route("/channel/:channelId/subscribers").get(getUserChannelSubscribers);

router.get("/:subscriberId/subscribed-channels", verifyJWT, getSubscribedChannels);


export default router