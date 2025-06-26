import express from 'express'
import { withAuth } from '@clerk/clerk-sdk-node';
import { redeemRewards, getUserRewardHistory } from '../controllers/rewardController.js';

const router = express.Router();
router.post('/redeem',withAuth(redeemRewards))
router.get('/history', withAuth(getUserRewardHistory))

export default router 
