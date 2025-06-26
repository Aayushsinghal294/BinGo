import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { GiftIcon, TrophyIcon, CameraIcon, MapPinIcon, ScanIcon, CheckCircle2Icon, Loader2Icon, InfoIcon, SparklesIcon, StarIcon, AlertTriangleIcon, XCircleIcon, CheckIcon, UploadIcon, RefreshCwIcon } from 'lucide-react'
import clsx from 'clsx'
import Webcam from 'react-webcam'
import { useUser } from '@clerk/clerk-react'
import { verifyFace } from '../utils/verifyFace'
import { useUserData } from '../context/userDataContext'
import { completeMission } from '../services/MissionsService'

const CLOUDINARY_UPLOAD_PRESET = 'BinGo_CodePaglus'
const CLOUDINARY_CLOUD_NAME = 'dgclo6bft'
const BACKEND_URL = 'http://127.0.0.1:5000'

const missionIcons = {
  "Dispose Waste": <CameraIcon className="w-6 h-6 text-emerald-400" />,
  "Suggest Bin": <MapPinIcon className="w-6 h-6 text-blue-400" />,
  "3-Day Streak": <TrophyIcon className="w-6 h-6 text-amber-400" />,
  "Sort Waste": <ScanIcon className="w-6 h-6 text-purple-400" />,
}

const statusColors = {
  not_started: 'bg-gradient-to-r from-slate-600 to-slate-700 text-slate-100',
  completed: 'bg-gradient-to-r from-emerald-600 to-green-700 text-emerald-100'
}

const funFacts = [
  "🔄 Recycling one aluminum can saves enough energy to run a TV for 3 hours.",
  "⏰ Plastic can take up to 1,000 years to decompose in landfills.",
  "🌱 Composting food waste reduces methane emissions from landfills.",
  "📍 Suggesting new bin locations helps keep your city cleaner!",
  "🌍 Every small action counts towards a greener planet.",
  "🤖 AI detection helps prevent fake submissions and ensures authentic BinGo-actions.",
  "🔍 Our duplicate detection system ensures fair play for all users."
]


const Missions = () => {
  const { user: clerkUser } = useUser()
  const profileImage = clerkUser?.unsafeMetadata?.profileImage
  const userId = clerkUser?.id || 'mock-user'
  const navigate = useNavigate()
  const { userData, refreshUserData } = useUserData();


  const missions = userData?.missions || []
  const userMissions = userData?.userMissions || [];
  
  const userProfile = userData?.user || {}
  console.log(userMissions)

  const [selectedMission, setSelectedMission] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('upload')
  const [loading, setLoading] = useState(false)
  const [factIdx, setFactIdx] = useState(0)
  const [proofImage, setProofImage] = useState(null)
  const [useCamera, setUseCamera] = useState(false)
  const webcamRef = useRef(null)
  const [motivation, setMotivation] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const fileInputRef = useRef(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const [error, setError] = useState('')
  const [duplicateDetails, setDuplicateDetails] = useState(null)
  const [timer, setTimer] = useState(Date.now())
  const [aiDetectionResult, setAiDetectionResult] = useState(null)
  const [faceVerificationResult, setFaceVerificationResult] = useState(null)
  const [backendHealth, setBackendHealth] = useState('unknown')
  const [stepStatus, setStepStatus] = useState({
    ai: null,
    duplicate: null,
    face: null
  })

  useEffect(() => {
  const interval = setInterval(() => setTimer(Date.now()), 1000)
  return () => clearInterval(interval)
}, [])

useEffect(() => {
  const interval = setInterval(() => {
    setFactIdx(idx => (idx + 1) % funFacts.length)
  }, 6000) // Change fact every 6 seconds
  return () => clearInterval(interval)
}, [funFacts.length])

  useEffect(() => {
    checkBackendHealth()
  }, [])

  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/health`)
      if (response.ok) {
        setBackendHealth('healthy')
      } else {
        setBackendHealth('unhealthy')
      }
    } catch {
      setBackendHealth('unhealthy')
    }
  }

const getStatus = (missionId) => {
  // Always use cooldown logic
  const last = getLastCompletionTime(missionId)
  if (!last) return 'not_started'
  if ((Date.now() - last.getTime()) < 60 * 60 * 1000) return 'cooldown'
  return 'ready'
}

// Get total points earned for a mission
const getMissionPoints = (missionId) => {
  const um = userMissions.find(m => m.missionId === missionId)
  if (!um || !um.completions) return 0
  return um.completions.reduce((sum, c) => sum + (c.pointsEarned || 0), 0)
}
  
// Helper: Get last completion time for a mission
const getLastCompletionTime = (missionId) => {
  const um = userMissions.find(m => m.missionId === missionId)
  if (!um || !um.completions || um.completions.length === 0) return null
  // Assume completions is sorted, get the last one
  return new Date(um.completions[um.completions.length - 1].completedAt)
}

// Helper: Time left in ms
const timeLeftMs = (missionId) => {
  const last = getLastCompletionTime(missionId)
  if (!last) return 0
  const diff = 60 * 60 * 1000 - (Date.now() - last.getTime())
  return diff > 0 ? diff : 0
}

// Helper: Format ms to mm:ss
const formatMs = (ms) => {
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

  const completedCount = userMissions.filter(m => m.completed).length
  const totalCount = missions.length
  const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0

  const handleMissionAction = (mission, action) => {
    if (mission.title === "Suggest Bin") {
      navigate('/map')
      return
    }
    setSelectedMission(mission)
    setModalType(action)
    setShowModal(true)
    setProofImage(null)
    setUseCamera(false)
    setMotivation('')
    setConfirmSubmit(false)
    setUploadStatus('')
    setError('')
    setDuplicateDetails(null)
    setAiDetectionResult(null)
    setFaceVerificationResult(null)
    setStepStatus({ ai: null, duplicate: null, face: null })
  }

  const handleStreakComplete = () => {
    setLoading(true)
    setUploadStatus('Updating streak progress...')
    setTimeout(async () => {
    await handleMissionComplete(selectedMission.id, 'streak');
    setShowModal(false);
    setShowConfetti(true);
    setMotivation(`🔥 Amazing! 3-day streak completed! You've earned ${selectedMission.reward} points and built a great habit! 🏆`);
    setTimeout(() => setShowConfetti(false), 3000);
    setLoading(false);
    setUploadStatus('');
  }, 1500);
  }

  
const handleMissionComplete = async (missionId, proofUrl) => {
await completeMission(missionId, userId, proofUrl);
refreshUserData(); 
};

  const handleProofSubmit = async () => {
    setConfirmSubmit(false)
    if (!proofImage) return

    setLoading(true)
    setUploadStatus('Uploading image to cloud storage...')
    setError('')
    setDuplicateDetails(null)
    setAiDetectionResult(null)
    setFaceVerificationResult(null)
    setStepStatus({ ai: null, duplicate: null, face: null })

    try {
      if (backendHealth === 'unhealthy') {
        await checkBackendHealth()
        if (backendHealth === 'unhealthy') {
          throw new Error('Backend service is currently unavailable. Please try again later.')
        }
      }

      // 1. Upload to Cloudinary
      const formData = new FormData()
      formData.append('file', proofImage)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

      const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      })

      if (!cloudinaryResponse.ok) {
        throw new Error('Failed to upload image to cloud storage. Please try again.')
      }

      const cloudinaryData = await cloudinaryResponse.json()
      const uploadedUrl = cloudinaryData.secure_url

      // Step 1: AI Detection
      setUploadStatus('Running AI detection...')
      setStepStatus(s => ({ ...s, ai: 'loading' }))
      const aiRes = await fetch(`${BACKEND_URL}/analyze_ai_only`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: uploadedUrl })
      })
      const aiData = await aiRes.json()
      setAiDetectionResult({
        isAiGenerated: aiData.ai_generated,
        confidence: aiData.confidence,
        details: aiData.details
      })
      if (aiData.ai_generated && aiData.confidence > 0.7) {
        setStepStatus(s => ({ ...s, ai: 'fail' }))
        setError(`❌ AI-Generated Image Detected!\n\nThis image appears to be artificially generated with ${(aiData.confidence * 100).toFixed(1)}% confidence.\n\nFor fair play, please upload authentic photos of your actual BinGo-actions.`)
        setUploadStatus('')
        setLoading(false)
        return
      } else {
        setStepStatus(s => ({ ...s, ai: 'pass' }))
        setUploadStatus('AI detection passed. Checking for duplicates...')
      }

      // Step 2: Duplicate Detection
      setStepStatus(s => ({ ...s, duplicate: 'loading' }))
      const dupRes = await fetch(`${BACKEND_URL}/check_duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: uploadedUrl, user_id: userId, mission_id: selectedMission?.id })
      })
      const dupData = await dupRes.json()
      if (dupData.status === "rejected" || dupData.duplicate) {
        setStepStatus(s => ({ ...s, duplicate: 'fail' }))
        const matchDate = dupData.matched_date ? new Date(dupData.matched_date).toLocaleDateString() : 'Unknown'
        const detectionMethod = dupData.method ? dupData.method.toUpperCase() : 'UNKNOWN'
        setDuplicateDetails({
          matchedImage: dupData.matched_image,
          matchedDate: matchDate,
          method: detectionMethod,
          similarity: dupData.similarity
        })
        setError(`🔍 Duplicate Image Detected!\n\nThis image matches one you uploaded on ${matchDate}.\nDetection method: ${detectionMethod}${dupData.similarity ? `\nSimilarity: ${(dupData.similarity * 100).toFixed(1)}%` : ''}\n\nPlease upload a new, unique photo for this mission.`)
        setUploadStatus('')
        setLoading(false)
        return
      } else {
        setStepStatus(s => ({ ...s, duplicate: 'pass' }))
        setUploadStatus('Duplicate check passed. Running face verification...')
      }

      // Step 3: Face Verification (if profile image available)
      if (profileImage) {
        setStepStatus(s => ({ ...s, face: 'loading' }))
        setUploadStatus('Running face verification...')
        const faceResult = await verifyFace(profileImage, proofImage)
        setFaceVerificationResult(faceResult)
        if (faceResult.error) {
          setStepStatus(s => ({ ...s, face: 'fail' }))
          setError(`❌ Face Verification Error: ${faceResult.error}`)
          setUploadStatus('')
          setLoading(false)
          return
        }
        if (faceResult.verified === false) {
          setStepStatus(s => ({ ...s, face: 'fail' }))
          setError(`❌ Face Verification Failed!\n\nThe face in your proof image does not match your profile image.`)
          setUploadStatus('')
          setLoading(false)
          return
        }
        if (faceResult.verified === undefined) {
          setStepStatus(s => ({ ...s, face: 'fail' }))
          setError(`❌ No face detected in one or both images. Please ensure your face is clearly visible.`)
          setUploadStatus('')
          setLoading(false)
          return
        }
        setStepStatus(s => ({ ...s, face: 'pass' }))
        setUploadStatus('Face verification successful!')
      } else {
        setStepStatus(s => ({ ...s, face: 'skip' }))
      }
      setUploadStatus('All checks passed! Completing mission...')
      setTimeout(async () => {

      await handleMissionComplete(selectedMission.id, uploadedUrl);
      setShowModal(false);
      setShowConfetti(true);
      setMotivation(`🎉 Mission completed successfully! You've earned ${selectedMission.reward} points and made your city cleaner! 🌱`);
      setTimeout(() => setShowConfetti(false), 3000);
      }, 1200);
    } catch (err) {
      setError(`❌ Upload Failed\n\n${err.message}\n\nPlease check your internet connection and try again.`)
    }
    setLoading(false)
    setUploadStatus('')
  }

  const resetModal = () => {
    setProofImage(null)
    setConfirmSubmit(false)
    setError('')
    setUploadStatus('')
    setDuplicateDetails(null)
    setAiDetectionResult(null)
    setFaceVerificationResult(null)
    setStepStatus({ ai: null, duplicate: null, face: null })
  }


  const totalPoints = userProfile.totalPoints || 0
  
  const streakDays = userMissions.find(m => m.missionId === 3 && m.completed)
    ? 3
    : userMissions.find(m => m.missionId === 3)
    ? 2
    : 1

  const renderStepStatus = (label, status) => (
    <div className="flex items-center gap-2 text-sm mb-1">
      {status === 'loading' && <Loader2Icon className="w-4 h-4 animate-spin text-blue-600" />}
      {status === 'pass' && <CheckCircle2Icon className="w-4 h-4 text-green-500" />}
      {status === 'fail' && <XCircleIcon className="w-4 h-4 text-red-500" />}
      {status === 'skip' && <InfoIcon className="w-4 h-4 text-gray-400" />}
      <span className={
        status === 'pass' ? 'text-green-700' :
        status === 'fail' ? 'text-red-700' :
        status === 'loading' ? 'text-blue-700' :
        'text-gray-700'
      }>
        {label}
        {status === 'skip' && ' (skipped)'}
      </span>
    </div>
  )

  const getMissionButtons = (mission) => {
  const status = getStatus(mission.id)
  const msLeft = timeLeftMs(mission.id)

 if (status === 'cooldown') {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg bg-gray-700 text-gray-300 cursor-not-allowed"
      >
        <RefreshCwIcon className="w-5 h-5 animate-spin" />
        Available in {formatMs(msLeft)}
      </button>
    )
  }
  

    if (mission.title === "Suggest Bin") {
      return (
        <button
          onClick={() => navigate('/map')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transform hover:scale-105 hover:shadow-xl"
        >
          <MapPinIcon className="w-5 h-5" />
          Suggest Location
        </button>
      )
    }

    if (mission.title === "3-Day Streak") {
      return (
        <button
          onClick={() => handleMissionAction(mission, 'streak')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white transform hover:scale-105 hover:shadow-xl"
        >
          <TrophyIcon className="w-5 h-5" />
          Complete Streak
        </button>
      )
    }

    return (
      <button
        onClick={() => handleMissionAction(mission, 'upload')}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transform hover:scale-105 hover:shadow-xl"
      >
        <CameraIcon className="w-5 h-5" />
        Upload Photo
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900 pt-32 pb-16 px-6 md:px-16">
      <div className="max-w-6xl mx-auto">
        {/* Backend Status Indicator */}
        <div className="fixed top-20 right-4 z-40">
          <div className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm",
            backendHealth === 'healthy' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
            backendHealth === 'unhealthy' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          )}>
            <div className={clsx(
              "w-2 h-2 rounded-full animate-pulse",
              backendHealth === 'healthy' ? 'bg-emerald-400' :
              backendHealth === 'unhealthy' ? 'bg-red-400' :
              'bg-amber-400'
            )} />
            AI Detection: {backendHealth === 'healthy' ? 'Online' : backendHealth === 'unhealthy' ? 'Offline' : 'Checking...'}
          </div>
        </div>

        {/* Profile Section */}
        <div className="flex flex-col items-center mb-12">
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-emerald-400 shadow-2xl bg-white flex items-center justify-center ring-4 ring-emerald-400/20">
              <img
                src={profileImage || '/default-avatar.png'}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full p-2 shadow-lg">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Header */}
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 mb-4 text-center">
            BinGo Missions
          </h1>
          <p className="text-xl text-gray-300 mb-6 text-center max-w-2xl">
            Complete BinGo missions, earn rewards, and make a positive impact on the environment!
          </p>

          {/* Fun Fact Ticker */}
          <div className="bg-gradient-to-r from-emerald-900/40 to-green-900/40 backdrop-blur-sm border border-emerald-500/20 rounded-2xl px-6 py-4 shadow-xl max-w-4xl">
            <div className="flex items-center gap-3">
              <InfoIcon className="w-6 h-6 text-emerald-400 animate-pulse flex-shrink-0" />
              <span className="text-emerald-100 font-medium text-lg">{funFacts[factIdx]}</span>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-gradient-to-r from-slate-800/50 to-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-8 mb-12 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-full p-3">
                <TrophyIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">Mission Progress</h3>
                <p className="text-gray-400">Keep up the great work!</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-black text-emerald-400">{completedCount}</div>
                <div className="text-sm text-gray-400">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-amber-400">
                  {totalPoints}
                   </div>
                <div className="text-sm text-gray-400">Points Earned</div>
              </div>
              <div className="w-32">
                <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-green-500 h-full transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-sm text-gray-400 mt-1 text-center">{progress}% Complete</div>
              </div>
            </div>
          </div>
        </div>

        {/* Motivation Message */}
        {motivation && (
          <div className="mb-8 bg-gradient-to-r from-emerald-500/20 to-green-500/20 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-6 shadow-xl animate-fade-in-up">
            <div className="flex items-center gap-3">
              <SparklesIcon className="w-8 h-8 text-emerald-400 animate-bounce" />
              <span className="text-emerald-100 font-semibold text-lg">{motivation}</span>
            </div>
          </div>
        )}

        {/* Confetti Animation */}
        {showConfetti && (
          <div className="fixed inset-0 z-50 pointer-events-none">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-10px`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${3 + Math.random() * 2}s`
                }}
              >
                <StarIcon className="w-6 h-6 text-amber-400" />
              </div>
            ))}
          </div>
        )}

        {/* Mission Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {missions.map((mission) => {
            const status = getStatus(mission.id)
            const colorClass = mission.color || 'emerald'
            return (
              <div
                key={mission.id}
                className={clsx(
                  "relative group overflow-hidden rounded-3xl shadow-2xl transition-all duration-500 transform hover:scale-105",
                  status === 'completed'
                    ? 'bg-gradient-to-br from-emerald-900/60 to-green-900/60 border-2 border-emerald-400/50 ring-2 ring-emerald-400/20'
                    : 'bg-gradient-to-br from-slate-800/60 to-gray-800/60 border border-gray-700/50 hover:border-emerald-500/30'
                )}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45" />
                </div>

                {/* Content */}
                <div className="relative p-8 flex flex-col h-full min-h-[400px]">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`bg-gradient-to-r from-${colorClass}-500 to-${colorClass}-600 rounded-2xl p-3 shadow-lg`}>
                        {missionIcons[mission.title]}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1">{mission.title}</h3>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>
                          {status === 'completed' ? '✅ Completed' : '🎯 Ready to Start'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-400 font-bold text-lg">
                        <GiftIcon className="w-5 h-5" />
                        <span>{mission.reward}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">points</div>
                        <div className="text-xs text-emerald-300 mt-1">
    Earned: {getMissionPoints(mission.id)}
  </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-300 text-lg leading-relaxed mb-6 flex-grow">
                    {mission.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {mission.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-gray-700/50 rounded-full text-xs font-medium text-gray-300 border border-gray-600/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-auto">
                    {getMissionButtons(mission)}
                  </div>

                  {/* Completion Badge */}
                  {status === 'completed' && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-emerald-500 rounded-full p-2 shadow-lg animate-pulse">
                        <CheckCircle2Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Modal */}
        {showModal && selectedMission && modalType !== 'suggest' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-slate-800 to-gray-900 rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  {missionIcons[selectedMission?.title]}
                  {selectedMission?.title}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white transition-colors p-2"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              {modalType === 'view' && (
                <div className="space-y-6">
                  <p className="text-gray-300 text-lg">{selectedMission?.description}</p>
                  {userMissions.find(m => m.missionId === selectedMission?.id)?.proofUrl &&
                   userMissions.find(m => m.missionId === selectedMission?.id)?.proofUrl !== 'streak' && (
                    <div className="bg-gray-800/50 rounded-2xl p-6">
                      <h3 className="text-xl font-semibold text-white mb-4">Proof Image</h3>
                      <img
                        src={userMissions.find(m => m.missionId === selectedMission?.id)?.proofUrl}
                        alt="Mission proof"
                        className="w-full max-w-md mx-auto rounded-xl shadow-lg"
                      />
                    </div>
                  )}
                  {userMissions.find(m => m.missionId === selectedMission?.id)?.proofUrl === 'streak' && (
                    <div className="bg-amber-900/30 rounded-2xl p-6 border border-amber-500/30">
                      <h3 className="text-xl font-semibold text-amber-300 mb-2">3-Day Streak Completed! 🔥</h3>
                      <p className="text-amber-200">Congratulations on building a sustainable habit!</p>
                    </div>
                  )}
                </div>
              )}

              {modalType === 'streak' && (
                <div className="space-y-6">
                  <p className="text-gray-300 text-lg">{selectedMission?.description}</p>
                  <div className="bg-amber-900/30 rounded-2xl p-6 border border-amber-500/30">
                    <h3 className="text-xl font-semibold text-amber-300 mb-4">Streak Progress</h3>
                    <div className="flex items-center gap-4">
                      {[1, 2, 3].map(day => (
                        <div key={day} className="flex flex-col items-center">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                            day <= streakDays
                              ? 'bg-amber-500 border-amber-400 text-white'
                              : 'bg-gray-700 border-gray-600 text-gray-400'
                          }`}>
                            {day <= streakDays ? <CheckIcon className="w-6 h-6" /> : day}
                          </div>
                          <span className="text-sm text-amber-300 mt-2">Day {day}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-amber-200 mt-4">
                      {streakDays === 3 ? 'Congratulations! You can now complete this mission!' :
                       `Keep going! You've completed ${streakDays} out of 3 days.`}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleStreakComplete}
                      disabled={loading || streakDays < 3}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2Icon className="w-5 h-5 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        <>
                          <TrophyIcon className="w-5 h-5" />
                          Complete Mission
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {modalType === 'upload' && (
                <div className="space-y-6">
                  <p className="text-gray-300 text-lg">{selectedMission?.description}</p>
                  {(stepStatus.ai || stepStatus.duplicate || stepStatus.face) && (
                    <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700">
                      <h3 className="text-lg font-semibold text-white mb-3">Verification Steps</h3>
                      {renderStepStatus('AI Detection', stepStatus.ai)}
                      {renderStepStatus('Duplicate Check', stepStatus.duplicate)}
                      {profileImage && renderStepStatus('Face Verification', stepStatus.face)}
                    </div>
                  )}
                  {!proofImage && (
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => setUseCamera(true)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300"
                        >
                          <CameraIcon className="w-5 h-5" />
                          Use Camera
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-300"
                        >
                          <UploadIcon className="w-5 h-5" />
                          Upload File
                        </button>
                      </div>
                      {useCamera && (
                        <div className="bg-gray-800 rounded-2xl p-4">
                          <Webcam
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            className="w-full rounded-xl"
                          />
                          <div className="flex gap-3 mt-4">
                            <button
                              onClick={() => {
                                const imageSrc = webcamRef.current?.getScreenshot()
                                if (imageSrc) {
                                  fetch(imageSrc)
                                    .then(res => res.blob())
                                    .then(blob => {
                                      const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' })
                                      setProofImage(file)
                                      setUseCamera(false)
                                    })
                                }
                              }}
                              className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all duration-300"
                            >
                              Capture Photo
                            </button>
                            <button
                              onClick={() => setUseCamera(false)}
                              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-xl transition-all duration-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setProofImage(file)
                          }
                        }}
                        className="hidden"
                      />
                    </div>
                  )}
                  {proofImage && (
                    <div className="bg-gray-800/50 rounded-2xl p-4">
                      <h3 className="text-lg font-semibold text-white mb-3">Image Preview</h3>
                      <img
                        src={URL.createObjectURL(proofImage)}
                        alt="Proof preview"
                        className="w-40 max-w-md mx-auto rounded-xl shadow-lg"
                      />
                      <div className="flex gap-3 mt-4">
                        {!confirmSubmit ? (
                          <>
                            <button
                              onClick={() => setConfirmSubmit(true)}
                              className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all duration-300"
                            >
                              Confirm & Submit
                            </button>
                            <button
                              onClick={resetModal}
                              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-xl transition-all duration-300"
                            >
                              Change Photo
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={handleProofSubmit}
                              disabled={loading}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
                            >
                              {loading ? (
                                <>
                                  <Loader2Icon className="w-5 h-5 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <CheckIcon className="w-5 h-5" />
                                  Final Submit
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => setConfirmSubmit(false)}
                              disabled={loading}
                              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white font-semibold rounded-xl transition-all duration-300"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {uploadStatus && (
                    <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-2">
                        <Loader2Icon className="w-5 h-5 animate-spin text-blue-400" />
                        <span className="text-blue-300">{uploadStatus}</span>
                      </div>
                    </div>
                  )}
                  {error && (
                    <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangleIcon className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-red-300 whitespace-pre-line">{error}</p>
                          {duplicateDetails && (
                            <div className="mt-3 pt-3 border-t border-red-500/30">
                             
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {!loading && (
                    <button
                      onClick={() => setShowModal(false)}
                      className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-300"
                    >
                      Close
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10px) rotate(0deg);
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out;
        }
      `}</style>
    </div>
  )
}

export default Missions