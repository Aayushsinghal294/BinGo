// routes/leaderboardRoute.js
import express from 'express'
import  {getLeaderboard} from '../controllers/leaderboard.js'

const router = express.Router()

router.get('/', getLeaderboard)

export default router
