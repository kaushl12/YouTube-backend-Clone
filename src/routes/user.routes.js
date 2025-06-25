import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controllers.js";


import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(loginUser);  //testing done working successfully.

router.route("/logout").post(verifyJWT, logoutUser); //testing done
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword); //testing done working successfully.
router.route("/current-user").get(verifyJWT, getCurrentUser); //testing done working successfully.
router.route("/update-account").patch(verifyJWT, updateAccountDetails); //testing done working successfully.
router
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage); //testing done working successfully.
router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar); //tesing done working successfully.
router.route("/c/:username").get(verifyJWT, getUserChannelProfile); //testing done working successfully.
router.route("/history").get(verifyJWT, getWatchHistory); // testing done working successfully.

export default router;
    