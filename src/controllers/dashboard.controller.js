import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like=total video views, total subscribers, total videos, total likes etc.
  const channelObjectId  = req.user._id;
  
  
  
  const totalSubscribers = await Subscription.countDocuments({
    channel: channelObjectId,
  });

  const videos = await Video.find({ owner: channelObjectId }).select(
    "_id views"
  );
  const channel = await User.findById(channelObjectId).select(
    "username fullName avatar coverImage"
  );
  const totalVideos = videos.length;
  const totalViews = videos.reduce((acc, video) => acc + video.views, 0);
  const videoIds = videos.map((video) => video._id);
  
  const totalLikes = await Like.countDocuments({
    video: { $in: videoIds },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        channel: {
          _id: channel._id,
          username: channel.username,
          fullName: channel.fullName,
          avatar: channel.avatar,
          coverImage: channel.coverImage,
        },
        totalSubscribers,
        totalVideos,
        totalViews,
        totalLikes,
      },
      "Channel stats fetched successfully"
    )
  );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const { channelId } = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid Channel ID format");
  }

  const videos = await Video.find({
    owner: channelId,
  })
    .select("title videoFile thumbnail views createdAt")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
