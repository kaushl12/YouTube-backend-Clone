import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { deleteVideo, getVideoById, publishVideo,togglePublishStatus,updateVideo,getAllVideos } from "../controllers/video.controller.js";

const router=Router();

router.route("/publishVideo").post(verifyJWT,
    upload.fields([
			{
				name: "videoFile",
				maxCount: 1,
			},
			{
				name: "thumbnail",
				maxCount: 1,
			},
		]),
        publishVideo
);

router.route("/getvideobyid/:videoId").get(verifyJWT,getVideoById)
router.route("/").get(verifyJWT,getAllVideos)
router.route("/updatevideo/:videoId").put(verifyJWT,
  upload.fields(verifyJWT,[
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }
  ]),
  updateVideo)
  router.route("/deletevideobyid/:videoId").delete(verifyJWT,deleteVideo);
  router.route("/togglepublishstatus/:videoId").post(verifyJWT,togglePublishStatus);

export default router;
    



