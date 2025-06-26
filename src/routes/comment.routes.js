import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addComment, updateComment,deleteComment,getVideoComments} from "../controllers/comment.controller.js";

const router=Router();
router.use(verifyJWT)

router.route("/addcomment/:videoId").post(addComment)
router.route("/updatecomment/:commentId").patch(updateComment)
router.route("/deletecomment/:commentId").delete(deleteComment)

router.get("/getvideocomments/:videoId/comments", getVideoComments);

export default router;
