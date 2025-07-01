import mongoose, {  Schema } from "mongoose";
import mongooseAggreagtePaginate from "mongoose-aggregate-paginate-v2"
const videoSchema = new Schema(
  {
     title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    videoFile: {
       url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    thumbnail: {
       url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
   
    duration: {
      type: Number,
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
