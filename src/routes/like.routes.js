import { Router } from 'express';
import { verifyJWT } from './../middlewares/auth.middleware.js';
import { togglePostLike,toggleVideoLike,toggleCommentLike, getLikedVideos ,getLikeCount,getLikeWithUser} from '../controllers/like.controller.js';


const router=Router()
router.use(verifyJWT)
router.route("/video/:videoId/toggle").post(toggleVideoLike)
router.route("/comment/:commentId/toggle").post(toggleCommentLike)
router.route("/post/:postId/toggle").post(togglePostLike)
router.route("/liked-videos").get(getLikedVideos)
router.get("/count", getLikeCount);
router.get("/users", getLikeWithUser);


export default router;