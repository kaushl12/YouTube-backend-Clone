import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { CommunityPost } from "../models/communitypost.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "./../models/user.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: userId,
  });
  if (existingLike) {
    await existingLike.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Video unliked successfully"));
  } else {
    const likeVideo = await Like.create({
      video: videoId,
      likedBy: userId,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, likeVideo, "Video liked successfully"));
  }
});
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid Comment ID format");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });

  if (existingLike) {
    await existingLike.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Comment unliked successfully"));
  } else {
    const likeComment = await Like.create({
      comment: commentId,
      likedBy: userId,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, likeComment, "Comment liked successfully"));
  }
});
const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Invalid Community Post ID format");
  }

  const communityPost = await CommunityPost.findById(postId);
  if (!communityPost) {
    throw new ApiError(404, "Community Post not found");
  }
  const existingLike = await Like.findOne({
    communityPost: postId,
    likedBy: userId,
  });

  if (existingLike) {
    await existingLike.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Community Post unliked successfully"));
  } else {
    const likePost = await Like.create({
      communityPost: postId,
      likedBy: userId,
    });
    return res
      .status(201)
      .json(
        new ApiResponse(201, likePost, "Community Post liked successfully")
      );
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid User ID format");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

 const likes = await Like.find({ likedBy: userId, video: { $exists: true } })
    .populate({
      path: "video",
      populate: {
        path: "owner",
        select: "username fullName avatar"
      }
    });

  // ✅ Extract actual videos from like documents
  const likedVideos = likes.map((like) => like.video).filter((video) => video != null);
  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});

const getLikeCount = asyncHandler(async (req, res) => {
  const { type, id } = req.query;

  if (!["video", "comment", "communityPost"].includes(type)) {
    throw new ApiError(400, "Invalid Like type");
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid ID");
  }
  const filter = {};
  filter[type] = id;
  const count = await Like.countDocuments(filter);
  return res
    .status(200)
    .json(new ApiResponse(200, { count }, `Total likes on this ${type}`));
});

const getLikeWithUser=asyncHandler(async (req,res) => {
    const {type,id}=req.query;
    if(!["video","comment","communityPost"].includes(type)){
          throw new ApiError(400, "Invalid like type");
    }
    if(!mongoose.Types.ObjectId.isValid(id)){
        throw new ApiError(400, "Invalid ID");
    }

    const filter={}
    filter[type]=id

    const likes=await Like.find(filter).populate("likedBy","username fullName avatar");

    res.status(200)
    .json(
        new ApiResponse(
            200,
            {
                totalLikes:likes.length,
                users:likes.map((like)=> like.likedBy)
            },
            `Users who liked this ${type}`
        )
    )
})

export {
  toggleVideoLike,
  toggleCommentLike,
  togglePostLike,
  getLikedVideos,
  getLikeCount,
  getLikeWithUser
};
