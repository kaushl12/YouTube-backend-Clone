import { asyncHandler } from "../utils/asyncHandler.js";
import z from "zod"
import { CommunityPost } from './../models/communitypost.model.js';
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";


const getUserPosts = asyncHandler(async (req, res) => {
   const userId=req.user._id;
   console.log(userId);
   
    const { page = 1, limit = 10 } = req.query;
     const user = await User.findById(userId);
      if (!user) {
        throw new ApiError(404, "User Posts not found");
      }
       const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const skip = (pageNumber - 1) * limitNumber;
  const posts=await CommunityPost.find({
    owner: userId,
  })
  .populate("owner", "username fullName avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNumber);

  const totalCommunityPost = await CommunityPost.countDocuments({ owner: userId });
  const totalPages = Math.ceil(totalCommunityPost / limitNumber);
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        posts,
        currentPage: pageNumber,
        totalPages,
        totalCommunityPost,
      },
      "Community Post fetched successfully"
    )
  );
})

const createPost = asyncHandler(async (req, res) => {
  const requiredBody = z.object({
    content: z.string().trim().min(1).max(1000),
  });

  const validatedData = requiredBody.safeParse(req.body);

  if (!validatedData.success) {
    throw new ApiError(
      400,
      validatedData.error.issues,
      "Invalid Community Post format"
    );
  }

  const { content } = validatedData.data;

  const communityPost = await CommunityPost.create({
    content,
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, communityPost, "Post added successfully"));
});
const updatePost = asyncHandler(async (req, res) => {

    const { postId }=req.params;
    
    if(!mongoose.Types.ObjectId.isValid(postId)){
        throw new ApiError(400, "Invalid Post ID format");
    }

    const communityPost=await CommunityPost.findById(postId);
    if(!communityPost){
        throw new ApiError(404,"Community Post not found")
    }

    const requiredBody = z.object({
    content: z.string().trim().min(1).max(1000),
  });

  const validatedData = requiredBody.safeParse(req.body);

  if (!validatedData.success) {
    throw new ApiError(
      400,
      validatedData.error.issues,
      "Invalid Community Post format"
    );
  }

  const { content } = validatedData.data;
  communityPost.content=content;
  await communityPost.save({ validateBeforeSave: false })
   return res
    .status(200)
    .json(new ApiResponse(200, communityPost, "Community Post updated successfully"));
})

const deletePost=asyncHandler(async(req,res)=>{
    const { postId }=req.params;

    if(!mongoose.Types.ObjectId.isValid(postId)){
        throw new ApiError(400, "Invalid Post ID format");
    }

    const communityPost=await CommunityPost.findById(postId);
    if(!communityPost){
        throw new ApiError(404,"Community Post not found")
    }

    await CommunityPost.deleteOne({
        _id: postId
    })
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Community Post deleted successfully"));
})
 export {
    createPost,
    updatePost,
    deletePost,
    getUserPosts
 }