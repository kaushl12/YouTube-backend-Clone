import mongoose, { model, Schema, Types } from "mongoose";
import mongooseAggreagtePaginate from "mongoose-aggreagte-paginate-v2"
const videoSchema = new Schema(
  {
    videoFile: {
      type: String, //Cloudinary
      required: true,
    },
    thumbnail: {
      type: String, //Cloudinary
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: number,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);
videoSchema.plugin(mongooseAggreagtePaginate)
export const Video = mongoose.model("Video", videoSchema);
