import mongoose from "mongoose";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid Channel Id");
  }
  if (subscriberId.toString() === channelId) {
    throw new ApiError(400, "You cannot subscribe to your own channel");
  }

  const channelUser = await User.findById(channelId);
  if (!channelUser) {
    throw new ApiError(404, "Channel user not found");
  }

  const existingSubscription = await Subscription.findOne({
    subscriber: subscriberId,
    channel: channelId,
  });

  if (existingSubscription) {
    // unsubscribing
    await existingSubscription.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Unsubscribed successfully"));
  } else {
    //subscribe

    const subscription = await Subscription.create({
      subscriber: subscriberId,
      channel: channelId,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, subscription, "Subscribed Successfully"));
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const loggedInUserId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid Channel Id");
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId), // its matches
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberInfo",
      },
    },

    { $unwind: "$subscriberInfo" },

    {
      $addFields: {
        isSubscribed: {
          $eq: ["$subscriber", new mongoose.Types.ObjectId(loggedInUserId)],
        },
      },
    },

    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: ["$subscriberInfo", { isSubscribed: "$isSubscribed" }],
        },
      },
    },

    {
      $project: {
        _id: 1,
        username: 1,
        fullName: 1,
        avatar: 1,
        isSubscribed: 1,
      },
    },

    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalSubscribers: subscribers.length,
        subscribers,
      },
      "Subscribers fetched successfully"
    )
  );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  const userId = req.user._id;
  if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
    throw new ApiError(400, "Invalid Subscriber Id");
  }

  const subscriber = await User.findById(subscriberId);

  if (!subscriber) {
    throw new ApiError(400, "Subscriber not found");
  }

  const subscriptions = await Subscription.find({ subscriber: subscriberId })
    .populate("channel", "username fullName avatar")
    .sort({ createdAt: -1 });

  // Step 4: Extract channel data
  const channels = subscriptions.map((sub) => sub.channel);
console.log(JSON.stringify(channels, null, 2)); // See if any circular error

  // Step 5: Return response
 return res.status(200).json(
  new ApiResponse(
    200,
    {
      channels,
    },
    "Subscribed channels fetched successfully"
  )
);

});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
