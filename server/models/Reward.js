import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  amount: Number,
  description: String,
  date: {
    type: Date,
    default: Date.now
  }
})

const redeemedRewardSchema = new mongoose.Schema({
  rewardName: { type: String, required: true },
  pointsUsed: { type: Number, required: true },
  redeemedAt: { type: Date, default: Date.now },
  transactions: [transactionSchema],
  description: String
})

const rewardSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref:'User', required: true},
    redeemedRewards: [redeemedRewardSchema]
},{timestamps:true})

export default mongoose.model('Reward',rewardSchema);
