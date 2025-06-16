import { asyncHandler } from "../utils/asyncHandler.js";
import z from "zod";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { act, use } from "react";
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
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, [], "User with email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  let coverImageLocalPath;
  if (req.files?.coverImage?.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, [], "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  if (!avatar || !avatar.url) {
    throw new ApiError(400, [], "Failed to upload avatar");
  }

  const user = await User.create({
    email,
    fullName,
    username: username.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, [], "Something went wrong while registering user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
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

const refreshAccessToken = (asyncHandler = async (req, res) => {
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
  // 🛡️ Zod validation schema
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

  // ✅ Validate incoming data
  const validatedData = passwordChangeSchema.safeParse(req.body);

  if (!validatedData.success) {
    return res.status(400).json({
      message: "Invalid password format",
      error: validatedData.error.issues,
    });
  }

  const { oldPassword, newPassword } = validatedData.data;

  // 🔐 Verify user and password
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect");
  }

  // 🔄 Update password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User fetched Successfully"));
});

const updateAccountDetails=asyncHandler(async(req,res)=>{
  const {email,fullName}=req.body;
  if(!(email || fullName)){
    throw new ApiError(400,"All fields are required")
  }
  const user=await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullName:fullName,
        email:email
      }
    },
    {new: true}
    .select("-password")
  )
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated Successfully"));
})

const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
      throw new ApiError(400,"Avatar file is missing")
    }
    const avatar= await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
      throw new ApiError(400,"Error while uploading on Avatar")
    }
     const user=await User.findByIdAndUpdate(
      req.user?._id,
      {
          $set:{
            avatar:avatar.url
          }
      },
      {new:true}
     ).select("-password")

     return res
     .status(200)
     .json(
      new ApiResponse(200,user,"Avatar Updated Successfully")
     )
})
const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path
    if(!coverImageLocalPath){
      throw new ApiError(400,"Cover Image file is missing")
    }
    const coverImage= await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
      throw new ApiError(400,"Error while uploading on Cover Image")
    }
    const  user= await User.findByIdAndUpdate(
      req.user?._id,
      {
          $set:{
            coverImage:coverImage.url
          }
      },
      {new:true}
     ).select("-password")
      return res
     .status(200)
     .json(
      new ApiResponse(200,user,"Cover Image Updated Successfully")
     )
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage
};
