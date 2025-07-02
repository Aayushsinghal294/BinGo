import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { GoogleGenerativeAI } from '@google/generative-ai'
import chatRoutes from './routes/chat.js'
import analyzeImageRoutes from './routes/analyzeImage.js'
import dustbinRoutes from './routes/dustbin.js'
import missionsRouter from './routes/missions.js'
import dailyQuestRoutes from './routes/dailyQuest.js';
import rewardsRoute from './routes/rewards.js'
import leaderboardRoutes from './routes/leaderboard.js'

dotenv.config()

const app = express()

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',   
  credentials: true                  
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)

// MongoDB connection with better error handling
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected successfully')
  console.log('Database:', mongoose.connection.db.databaseName)
})
.catch(err => {
  console.error('MongoDB connection error:', err)
  process.exit(1)
})

// MongoDB connection event handlers
mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err)
})

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected')
})

// Routes
app.use('/api/chat', chatRoutes(genAI))
app.use('/api/analyze-image', analyzeImageRoutes(genAI))
app.use('/api/dustbins', dustbinRoutes)
app.use('/api/missions', missionsRouter)
app.use('/api/daily-quest', dailyQuestRoutes);
app.use('/api/rewards', rewardsRoute)
app.use('/api/leaderboard', leaderboardRoutes)


// Health check endpoint with enhanced info


app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'BinGo Assistant API is running',
    timestamp: new Date().toISOString(),
    gemini_configured: !!process.env.GOOGLE_API_KEY,
    mongodb_connected: mongoose.connection.readyState === 1,
    mongodb_status: {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }[mongoose.connection.readyState],
    features: {
      chat: true,
      image_analysis: !!process.env.GOOGLE_API_KEY,
      dustbin_mapping: true,
      mission_system: mongoose.connection.readyState === 1
    }
  })
})

// Comprehensive health check for missions
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: 'unhealthy',
        message: 'Database not connected'
      })
    }

    // Test database query
    await mongoose.connection.db.admin().ping()
    
    res.json({
      status: 'healthy',
      message: 'All systems operational',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Health check failed:', error)
    res.status(503).json({
      status: 'unhealthy',
      message: 'Service temporarily unavailable'
    })
  }
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error)
  
  // Handle MongoDB errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation error',
      details: Object.values(error.errors).map(err => err.message)
    })
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid data format' })
  }
  
  if (error.code === 11000) {
    return res.status(400).json({ error: 'Duplicate entry' })
  }
  
  // Handle multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size too large. Maximum 5MB allowed.' })
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field.' })
  }
  
  res.status(500).json({ error: 'Internal server error' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`BinGo Assistant API ready`)
  console.log(`Features enabled:`)
  console.log(`  - Chat with AI: ${!!process.env.GOOGLE_API_KEY}`)
  console.log(`  - Image Analysis: ${!!process.env.GOOGLE_API_KEY}`)
  console.log(`  - Dustbin Mapping: true`)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...')
  await mongoose.connection.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...')
  await mongoose.connection.close()
  process.exit(0)
})