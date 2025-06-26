import  { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { createPost, deletePost, updatePost,getUserPosts } from '../controllers/communityPost.controller.js';
const router=Router()

router.use(verifyJWT)

router.route("/getuserposts").get(getUserPosts)
router.route("/createpost").post(createPost)
router.route("/updatepost/:postId").patch(updatePost)
router.route("/deletepost/:postId").delete(deletePost)

export default router;
