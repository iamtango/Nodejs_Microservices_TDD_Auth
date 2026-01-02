import {Schema, model} from "mongoose";

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    notificationPreference: {
        type: String,
        enum: ['email', 'sms'],
        default: 'email'
    },
    phoneNumber: {
        type: String,
        required: false
    },
    referralCode: {
        type: String,
        unique: true,
        required: true
    },
    walletBalance: {
        type: Number,
        default: 0
    }
},{
    timestamps: true
});

export default model("User", userSchema);
