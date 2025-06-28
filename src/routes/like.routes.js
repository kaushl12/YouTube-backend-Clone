import { Router } from 'express';
import { verifyJWT } from './../middlewares/auth.middleware.js';
import { togglePostLike,toggleVideoLike,toggleCommentLike, getLikedVideos ,getLikeCount,getLikeWithUser} from '../controllers/like.controller.js';


const router=Router()
router.use(verifyJWT)
router.route("/video/:videoId/toggle").post(toggleVideoLike) //to like unlike videos
router.route("/comment/:commentId/toggle").post(toggleCommentLike)//to like unlike Comments
router.route("/post/:postId/toggle").post(togglePostLike)//to like unlike posts
router.route("/liked-videos").get(getLikedVideos) //to get userliked Videos
router.get("/count", getLikeCount); // to get like count on each comments,posts,Videos
router.get("/users", getLikeWithUser); // to get like count on each comments,posts,Videos with user Info


export default router;