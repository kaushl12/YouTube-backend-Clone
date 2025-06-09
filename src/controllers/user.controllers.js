import { asyncHandler } from "../utils/asyncHandler.js";
import z from "zod";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  // Zod schema
  const requiredBody = z.object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be at most 20 characters")
      .regex(/^[a-zA-Z_]+$/, "Username must only contain letters and underscores"),
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
      .regex(/[$&+,:;=?@#|'<>.^*()%!-]/, "Must contain at least one special character")
  });

  const validatedData = requiredBody.safeParse(req.body);
  if (!validatedData.success) {
    return res.status(400).json({
      message: "Invalid Data format",
      error: validatedData.error.issues,
    });
  }

  try {
    const { email, fullName, username, password } = validatedData.data;

    const existedUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existedUser) {
      throw new ApiError(409, "User with email or username already exists");
    }

    // ✅ Access files
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
      coverImageLocalPath=req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is required");
    }

    // ✅ Upload to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

    if (!avatar || !avatar.url) {
      throw new ApiError(400, "Failed to upload avatar");
    }

    // ✅ Save user to DB
    const user = await User.create({
      email,
      fullName,
      username: username.toLowerCase(), 
      password,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering user");
    }

    return res.status(201).json(
      new ApiResponse(200, createdUser, "User Registered Successfully")
    );
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Internal Server Error",
      ...(error.error && { error: error.error })
    });
  }
});

export { registerUser };
