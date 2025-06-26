import User from "../models/User.js"
import Reward from "../models/Reward.js"

export const redeemRewards =  async(req, res) => {
    console.log(req.body)
    try {
        const {clerkId} = req.body;
        const { rewardName, pointsRequired, description } = req.body

        const user = await User.findOne({clerkId})
        if(!user) return res.status(404).json({error: "User not found"})

        if (user.totalPoints < pointsRequired) return res.status(400).json({ error: 'Not enough points to redeem' })

        // Deduct points
        user.totalPoints -= pointsRequired
        await user.save()

        // Log transaction
        const transaction = {
        amount: pointsRequired,
        description: `Redeemed: ${rewardName}`
    }

    // Add reward to reward document
    let rewardDoc = await Reward.findOne({ user: user._id })

    const redeemedReward = {
      rewardName,
      pointsUsed: pointsRequired,
      description,
      transactions: [transaction]
    }

    if (!rewardDoc) { //Creating a new record

      rewardDoc = new Reward({
        user: user._id,
        redeemedRewards: [redeemedReward]
      })

    } else {
      rewardDoc.redeemedRewards.push(redeemedReward)
    }

    await rewardDoc.save()

    return res.status(200).json({
      message: 'Reward redeemed successfully',
      updatedPoints: user.totalPoints,
      rewardHistory: rewardDoc.redeemedRewards
    })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: 'Server error' })
    }
}

export const getUserRewardHistory = async (req, res) => {
  try {
    const { clerkId } = req.query

    const user = await User.findOne({ clerkId })
    if (!user) return res.status(404).json({ error: "User not found" })

    const rewardDoc = await Reward.findOne({ user: user._id })
    if (!rewardDoc) return res.json({ redeemedRewards: [] })

    res.json({ redeemedRewards: rewardDoc.redeemedRewards })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Failed to fetch reward history" })
  }
}
