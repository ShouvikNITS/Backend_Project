import mongoose, { Schema } from "mongoose";
import { User } from "./user.models";

const subscriptionsSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,            // one who is subscribing is also an user
        ref: User
    },
    channel: {
        type: Schema.Types.ObjectId,            // it is also a user
        ref: User
    }
}, {timestamps: true})

export const Subscriptions = mongoose.model("Subscriptions", subscriptionsSchema)