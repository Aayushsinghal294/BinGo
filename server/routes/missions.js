import express from 'express'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Mission, { DEFAULT_MISSIONS } from '../models/Mission.js'

const router = express.Router()

// Cache for active missions to avoid repeated DB queries
let cachedMissions = null
let cacheExpiry = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

const ensureDbConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    return true
  }

  if (!process.env.MONGO_URI) {
    return false
  }

  try {
    await mongoose.connect(process.env.MONGO_URI)
    return mongoose.connection.readyState === 1
  } catch {
    return false
  }
}

// Initialize default missions in database
const initializeMissions = async () => {
  const connected = await ensureDbConnection()
  if (!connected) {
    return
  }

  try {
    const count = await Mission.countDocuments()
    if (count === 0) {
      await Mission.insertMany(DEFAULT_MISSIONS)
      console.log('Default missions initialized')
    }
  } catch (error) {
    console.error('Error initializing missions:', error)
  }
}

// Get cached missions or fetch from DB
const getActiveMissions = async () => {
  const connected = await ensureDbConnection()
  if (!connected) {
    return DEFAULT_MISSIONS
  }

  const now = Date.now()
  
  if (cachedMissions && cacheExpiry && now < cacheExpiry) {
    return cachedMissions
  }
  
  cachedMissions = await Mission.find({ isActive: true }).lean()
  cacheExpiry = now + CACHE_DURATION
  
  return cachedMissions
}

// Create default user missions
const createDefaultMissions = (missions) => {
  return missions.map(mission => ({
    missionId: mission.id,
    completed: false,
    proofUrl: '',
    completedAt: null,
    pointsEarned: 0
  }))
}

// Validation middleware
const validateClerkId = (req, res, next) => {
  const { clerkId } = req.params
  if (!clerkId || typeof clerkId !== 'string') {
    return res.status(400).json({ error: 'Valid clerkId is required' })
  }
  next()
}

// Initialize missions when server starts
initializeMissions()

// Get user profile and missions
router.get('/user/:clerkId', validateClerkId, async (req, res) => {
  try {
    const connected = await ensureDbConnection()
    if (!connected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    const { clerkId } = req.params
    
    const [userData, missions] = await Promise.all([
      User.findOne({ clerkId }).lean(),
      getActiveMissions()
    ])
    
    if (!userData) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    res.json({
      user: {
        id: userData._id,
        clerkId: userData.clerkId,
        email: userData.email,
        name: userData.name,
        profileImage: userData.profileImage,
        totalPoints: userData.totalPoints || 0,
        level: userData.level || 1,
        currentStreak: userData.streakData?.currentStreak || 0,
        longestStreak: userData.streakData?.longestStreak || 0,
        statistics: userData.statistics || { totalMissionsCompleted: 0 }
      },
      missions,
      userMissions: userData.missions || []
    })
  } catch (error) {
    console.error('Error fetching user data:', error)
    res.status(500).json({ error: 'Failed to fetch user data' })
  }
})
router.put('/user/:clerkId', validateClerkId, async (req, res) => {
  try {
    const connected = await ensureDbConnection()
    if (!connected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    const { clerkId } = req.params
    const { email, name, profileImage } = req.body

    // Input validation
    if (!email || !name || typeof email !== 'string' || typeof name !== 'string') {
      return res.status(400).json({ error: 'Valid email and name are required' })
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Valid email format required' })
    }
    
    const missions = await getActiveMissions()
    const defaultMissions = createDefaultMissions(missions)
    
    // Use findOneAndUpdate with upsert to ensure user is created if not exists
    const user = await User.findOneAndUpdate(
      { clerkId },
      {
        clerkId,
        email,
        name,
        profileImage: profileImage || '',
        $setOnInsert: { missions: defaultMissions }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    )
    
    res.json({
      id: user._id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
      totalPoints: user.totalPoints || 0,
      level: user.level || 1
    })
  } catch (error) {
    console.error('Error updating user:', error)
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email already exists' })
    }
    res.status(500).json({ error: 'Failed to update user' })
  }
})
// Complete a mission
router.post('/complete/:clerkId/:missionId', validateClerkId, async (req, res) => {
  try {
    const connected = await ensureDbConnection()
    if (!connected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    const { clerkId, missionId } = req.params
    const { proofUrl, missionType } = req.body
    const parsedMissionId = parseInt(missionId)
    if (isNaN(parsedMissionId)) {
      return res.status(400).json({ error: 'Valid missionId is required' })
    }

    const user = await User.findOne({ clerkId })
    if (!user) return res.status(404).json({ error: 'User not found.' })

    const mission = await Mission.findOne({ id: parsedMissionId }).lean()
    if (!mission) return res.status(404).json({ error: 'Mission not found' })

    // Find or create user's mission progress
    let userMission = user.missions.find(m => m.missionId === parsedMissionId)
    if (!userMission) {
      userMission = { missionId: parsedMissionId, completions: [] }
      user.missions.push(userMission)
    }

    // Check last completion time
    const lastCompletion = userMission.completions.length > 0
      ? userMission.completions[userMission.completions.length - 1].completedAt
      : null

    if (lastCompletion && (Date.now() - new Date(lastCompletion).getTime()) < 60 * 60 * 1000) {
      // Less than 1 hour since last completion
      return res.status(400).json({ error: 'You can only complete this mission once every hour.' })
    }

    // Add new completion
    userMission.completions.push({
      proofUrl: proofUrl || (missionType === 'streak' ? 'streak' : ''),
      completedAt: new Date(),
      pointsEarned: mission.reward
    })

    // Add points and update level
    user.addPoints(mission.reward)
    user.statistics = user.statistics || { totalMissionsCompleted: 0 }
    user.statistics.totalMissionsCompleted += 1

    await user.save()

    res.json({
      success: true,
      pointsEarned: mission.reward,
      totalPoints: user.totalPoints,
      message: `Mission "${mission.title}" completed! You earned ${mission.reward} points.`
    })
  } catch (error) {
    console.error('Error completing mission:', error)
    res.status(500).json({ error: 'Failed to complete mission' })
  }
})

// Helper function to check achievements
const checkAchievements = (user) => {
  const newAchievements = []
  const existingAchievements = user.achievements || []
  
  const hasAchievement = (id) => existingAchievements.some(a => a.id === id)
  
  // First mission achievement
  if (user.statistics.totalMissionsCompleted === 1 && !hasAchievement('first_mission')) {
    newAchievements.push({
      id: 'first_mission',
      name: 'First Step',
      description: 'Completed your first eco-mission',
      earnedAt: new Date(),
      icon: '🌱'
    })
  }
  
  // Points milestones
  if (user.totalPoints >= 100 && !hasAchievement('points_100')) {
    newAchievements.push({
      id: 'points_100',
      name: 'Eco Warrior',
      description: 'Earned 100 points',
      earnedAt: new Date(),
      icon: '🏆'
    })
  }
  
  // Streak achievements
  const currentStreak = user.streakData?.currentStreak || 0
  if (currentStreak >= 7 && !hasAchievement('streak_7')) {
    newAchievements.push({
      id: 'streak_7',
      name: 'Week Warrior',
      description: '7-day streak achieved',
      earnedAt: new Date(),
      icon: '🔥'
    })
  }
  
  return newAchievements
}

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const connected = await ensureDbConnection()
    if (!connected) {
      return res.status(503).json({ error: 'Database unavailable' })
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 100) // Cap at 100
    
    const users = await User.find({}, {
      name: 1,
      profileImage: 1,
      totalPoints: 1,
      level: 1,
      'statistics.totalMissionsCompleted': 1
    })
    .sort({ totalPoints: -1, _id: 1 }) // Add _id for consistent ordering
    .limit(limit)
    .lean()
    
    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      name: user.name,
      profileImage: user.profileImage,
      totalPoints: user.totalPoints || 0,
      level: user.level || 1,
      missionsCompleted: user.statistics?.totalMissionsCompleted || 0
    }))
    
    res.json({ leaderboard })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

// Get user stats
router.get('/stats/:clerkId', validateClerkId, async (req, res) => {
  try {
    const { clerkId } = req.params
    
    const user = await User.findOne({ clerkId }, {
      totalPoints: 1,
      level: 1,
      achievements: 1,
      streakData: 1,
      statistics: 1,
      missions: 1
    }).lean()
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    const completedMissions = user.missions?.filter(m => m.completed) || []
    
    res.json({
      totalPoints: user.totalPoints || 0,
      level: user.level || 1,
      achievements: user.achievements || [],
      streakData: user.streakData || { currentStreak: 0, longestStreak: 0 },
      statistics: user.statistics || { totalMissionsCompleted: 0 },
      completedMissions: completedMissions.length,
      totalMissions: user.missions?.length || 0
    })
  } catch (error) {
    console.error('Error fetching user stats:', error)
    res.status(500).json({ error: 'Failed to fetch user stats' })
  }
})

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Router error:', error)
  res.status(500).json({ error: 'Internal server error' })
})

export default router