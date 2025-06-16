import mongoose,{Schema, Types} from "mongoose";

const subscriptionScehma=new Schema({
    subscriber:{
        type: Schema.Types.ObjectId, //one who is subscribing
        ref: "User"
    },
    channel:{
        type: Schema.Types.ObjectId, //to whom subscriber is subscribing.
        ref: "User"
    }
},{
    timestamps:true 
})

export const Subscription=mongoose.model("Subscription",subscriptionScehma)