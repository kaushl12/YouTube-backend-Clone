import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { deleteVideo, getVideoById, publishVideo,togglePublishStatus,updateVideo,getAllVideos } from "../controllers/video.controller.js";

const router=Router();
router.use(verifyJWT)
router.route("/publishVideo").post( 
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

router.route("/getvideobyid/:videoId").get( getVideoById)
router.route("/").get( getAllVideos)
router.route("/updatevideo/:videoId").put( 
  upload.fields( [
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }
  ]),
  updateVideo)
  router.route("/deletevideobyid/:videoId").delete( deleteVideo);
  router.route("/togglepublishstatus/:videoId").post( togglePublishStatus);

export default router;
    



