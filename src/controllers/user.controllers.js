import { asyncHandler } from "../utils/asyncHandler.js";
import z from "zod";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

import mongoose from "mongoose";
// Utility to generate tokens
const generateRefreshAndAccessToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      [],
      "Something went wrong while generating refresh and access token"
    );
  }
};

// REGISTER USER
const registerUser = asyncHandler(async (req, res) => {
  // Zod validation
  const requiredBody = z.object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be at most 20 characters")
      .regex(
        /^[a-zA-Z_]+$/,
        "Username must only contain letters and underscores"
      ),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(8)
      .max(70)
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"),

    fullName: z
      .string()
      .trim()
      .min(4)
      .max(30)
      .regex(/^[a-zA-Z\s]+$/, "Fullname must only contain letters and spaces"),

    password: z
      .string()
      .min(6)
      .max(100)
      .regex(/[0-9]/, "Must contain at least one digit")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(
        /[$&+,:;=?@#|'<>.^*()%!-]/,
        "Must contain at least one special character"
      ),
  });

  const validatedData = requiredBody.safeParse(req.body);
  if (!validatedData.success) {
    return res.status(400).json({
      message: "Invalid registration data format",
      error: validatedData.error.issues,
    });
  }

  const { email, fullName, username, password } = validatedData.data;

  const existedUser = await User.findOne({
    $or: [{ username: username.toLowerCase() }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, [], "User with email or username already exists");
  }

  // Handle file paths
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, [], "Avatar file is required");
  }

  // Upload to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  if (!avatar || !avatar.secure_url || !avatar.public_id) {
    throw new ApiError(400, [], "Failed to upload avatar to cloud");
  }

  // Create user
  const user = await User.create({
    email,
    fullName,
    username: username.toLowerCase(),
    password,
    avatar: {
      url: avatar.secure_url,
      public_id: avatar.public_id,
    },
    coverImage: coverImage
      ? {
          url: coverImage.secure_url,
          public_id: coverImage.public_id,
        }
      : undefined,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, [], "Something went wrong while registering user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User Registered Successfully"));
});

// LOGIN USER
const loginUser = asyncHandler(async (req, res) => {
  const requiredBodyLogin = z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(8)
      .max(70)
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"),
    password: z
      .string()
      .min(6)
      .max(100)
      .regex(/[0-9]/, "Must contain at least one digit")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(
        /[$&+,:;=?@#|'<>.^*()%!-]/,
        "Must contain at least one special character"
      ),
  });

  const validatedData = requiredBodyLogin.safeParse(req.body);
  if (!validatedData.success) {
    return res.status(400).json({
      message: "Invalid login data format",
      error: validatedData.error.issues,
    });
  }

  const { email, password } = validatedData.data;

  const userExists = await User.findOne({ email });

  if (!userExists) {
    throw new ApiError(404, [], "User does not exist");
  }

  const isPassValid = await userExists.isPasswordCorrect(password);
  if (!isPassValid) {
    throw new ApiError(401, [], "Invalid email or password");
  }

  const { refreshToken, accessToken } = await generateRefreshAndAccessToken(
    userExists._id
  );

  const loggedInUser = await User.findById(userExists._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged In Successfully"
      )
    );
});

// LOGOUT USER
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $unset: { refreshToken: 1 },
  });

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});
//////////////////Refreshing Access Token

const refreshAccessToken = asyncHandler (async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateRefreshAndAccessToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  //zod
  const passwordChangeSchema = z.object({
    oldPassword: z
      .string()
      .min(6, "Old password must be at least 6 characters")
      .max(100, "Old password must be at most 100 characters"),

    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .max(100, "New password must be at most 100 characters")
      .regex(/[0-9]/, "New password must contain at least one digit")
      .regex(/[A-Z]/, "New password must contain at least one uppercase letter")
      .regex(
        /[$&+,:;=?@#|'<>.^*()%!-]/,
        "New password must contain at least one special character"
      ),
  });

  // Validate incoming data
  const validatedData = passwordChangeSchema.safeParse(req.body);

  if (!validatedData.success) {
    return res.status(400).json({
      message: "Invalid password format",
      error: validatedData.error.issues,
    });
  }

  const { oldPassword, newPassword } = validatedData.data;

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect");
  }

  // Update password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});
//---
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User fetched Successfully"));
});


const updateAccountDetails = asyncHandler(async (req, res) => {
  // Zod schema
  const updateUserSchema = z.object({
    email: z
      .string()
      .email("Invalid email format")
      .optional()
      .or(z.literal("")), // allow empty string if frontend sends it
    fullName: z
      .string()
      .min(1, "Full name must be at least 1 character")
      .max(100, "Full name must be less than 100 characters")
      .optional()
      .or(z.literal("")), // allow empty string if frontend sends it
  });

  // Validate request body
  const validated = updateUserSchema.safeParse(req.body);

  if (!validated.success) {
    return res.status(400).json({
      message: "Invalid data format",
      error: validated.error.issues,
    });
  }

  const { email, fullName } = validated.data;

  // Check if both are missing or empty
  if (!email && !fullName) {
    throw new ApiError(400, "At least one field (email or full name) is required");
  }

  // Construct dynamic update object
  const updateData = {};
  if (email) updateData.email = email;
  if (fullName) updateData.fullName = fullName;

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select("-password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, user, "Account details updated successfully")
  );
});


const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatarUpload = await uploadOnCloudinary(avatarLocalPath);
  if (!avatarUpload?.secure_url || !avatarUpload?.public_id) {
    throw new ApiError(400, "Error while uploading new avatar");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.avatar?.public_id) {
    await deleteFromCloudinary(user.avatar.public_id);
  }

  user.avatar = {
    url: avatarUpload.secure_url,
    public_id: avatarUpload.public_id,
  };

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated Successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image file is missing");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage?.secure_url || !coverImage?.public_id) {
    throw new ApiError(400, "Error while uploading on Cover Image");
  }
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.coverImage?.public_id) {
    await deleteFromCloudinary(user.coverImage.public_id);
  }

  user.coverImage = {
    url: coverImage.secure_url,
    public_id: coverImage.public_id,
  };

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image Updated Successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Username is Missing");
  }
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        //Yeh user ke subscribers dhoondta hai — jinhone is user ko subscribe kiya hai.
        from: "subscriptions", // collection to join (subscriptions collection)
        localField: "_id", // field from the User collection (User._id)
        foreignField: "channel", // field from the Subscriptions collection that matches User._id
        as: "subscribers", // optional: name for the resulting joined array
      },
    },
    {
      $lookup: {
        //Yeh batata hai ki user ne kin-kin channels ko subscribe kiya hai
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscribers",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          //Kitne logon ne is user ko subscribe kiya hai, uska count nikalta hai.
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          //Yeh user kitne doosre channels ko follow karta hai, uska count.
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        isSubscribed: 1,
        channelsSubscribedToCount: 1,
        subscribersCount: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  if (!channel || channel.length === 0) {
    throw new ApiError(404, "Channel not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "Channel Profile Fetched Successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {

  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline:[ // pipeline only for viewing some data of owner
                {
                  $project:{
                    fullName:1,
                    username:1,
                    avatar:1,
                    coverImage:1  
                  }
                }
              ]
            },
          },
          {
              $addFields:{
                owner:{
                  $first:"$owner"
                }
              }
          },
        ],
      },
    },
   
  ]);
  
  return res
  .status(200)
  .json(new ApiResponse(200, user[0].watchHistory,"Watch history fetched Successfully"))
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
};
