import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { 
  GiftIcon, 
  LeafIcon,  
  CameraIcon, 
  SparklesIcon, 
  UserIcon, 
  MailIcon, 
  PhoneIcon, 
  CalendarIcon, 
  EarthIcon,
  CheckCircle,
  Target,
  Zap,
  Award,
  TrendingUp,
  Flame,
  Medal,
  Crown,
  Activity,
  Recycle,
  Clock,
  Trophy,
  Heart
} from 'lucide-react'
import ProfilePopup from '../components/ProfilePopup'
import axios from 'axios'
import { useUserData } from '../context/userDataContext'

const CLOUDINARY_UPLOAD_PRESET = 'BinGo_CodePaglus'
const CLOUDINARY_CLOUD_NAME = 'dgclo6bft'

const Dashboard = () => {
  const { user } = useUser()
  const profileImage = user?.unsafeMetadata?.profileImage
  const [showPopup, setShowPopup] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const { userData} = useUserData();

  const userMissions = userData?.userMissions || [];
  const toDoMissions = userData?.missions
  const missions = Array.isArray(userMissions) ? userMissions : [];
  
  const completed = missions.filter( o => o.completed == true)
 
  const completedCount = userMissions.filter(m => m.completed).length

  const [animateStats, setAnimateStats] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)

  // Enhanced user data extraction
  const userProfile = userData?.user || {}
  const achievements = userProfile.achievements || []
  const streakData = userProfile.streakData || { currentStreak: 0, longestStreak: 0 }
  const statistics = userProfile.statistics || {}
  const level = userProfile.level || 1
  const totalPoints = userProfile.totalPoints || 0
  const currentLevelProgress = totalPoints % 100
  const progressPercentage = (currentLevelProgress / 100) * 100

  useEffect(() => {
    if (user && !user.unsafeMetadata?.profileImage) {
      setShowPopup(true)
    }
  }, [user])

  useEffect(() => {
    setAnimateStats(true)
    if (completedCount > 0) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }
  }, [completedCount])

  const handleSaveImage = async (img) => {
    try {
      const data = new FormData()
      data.append('file', img)
      data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
      data.append('cloud_name', CLOUDINARY_CLOUD_NAME)

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        data
      )
      const url = res.data.secure_url

      await user.update({
        unsafeMetadata: {
          profileImage: url
        }
      })
      setShowPopup(false)
    } catch (err) {
      console.error('Error updating image:', err)
    }
  }

  const getStatsIcon = (type) => {
    switch(type) {
      case 'points': return <GiftIcon className="w-8 h-8 text-yellow-300 mb-2 animate-spin-slow" />
      case 'waste': return <LeafIcon className="w-8 h-8 text-lime-300 mb-2 animate-pulse" />
      case 'level': return <Crown className="w-8 h-8 text-purple-300 mb-2 animate-bounce" />
      case 'streak': return <Flame className="w-8 h-8 text-orange-300 mb-2 animate-pulse" />
      case 'missions': return <Target className="w-8 h-8 text-blue-300 mb-2 animate-bounce" />
      case 'badges': return <Medal className="w-8 h-8 text-pink-300 mb-2 animate-bounce" />
      case 'bins': return <EarthIcon className="w-8 h-8 text-green-300 mb-2 animate-bounce" />
      case 'sorted': return <Recycle className="w-8 h-8 text-cyan-300 mb-2 animate-pulse" />
      default: return null
    }
  }

  const getLevelColor = (level) => {
    if (level >= 20) return 'from-purple-400 to-pink-400'
    if (level >= 15) return 'from-yellow-400 to-orange-400'
    if (level >= 10) return 'from-blue-400 to-cyan-400'
    if (level >= 5) return 'from-green-400 to-emerald-400'
    return 'from-gray-400 to-slate-400'
  }

  const getLevelTitle = (level) => {
    if (level >= 20) return 'BinGo Legend'
    if (level >= 15) return 'Green Master'
    if (level >= 10) return 'Waste Warrior'
    if (level >= 5) return 'BinGo Champion'
    return 'Green Rookie'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900 text-white px-6 md:px-16 py-12 pt-32 relative overflow-hidden">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl animate-pulse delay-500"></div>
        <div className="absolute top-3/4 left-1/3 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Floating sparkles */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          >
            <SparklesIcon className={`w-${4 + Math.floor(Math.random() * 4)} h-${4 + Math.floor(Math.random() * 4)} text-emerald-300/30`} />
          </div>
        ))}
      </div>

   

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start gap-12 z-10 relative">
        {/* Enhanced Profile Section */}
        <div className="w-full lg:w-1/3">
          {/* Profile Card with advanced animations */}
          <div className="relative group mb-8">
            <div className="absolute -inset-4 rounded-full blur-2xl opacity-60 group-hover:opacity-90 transition-all duration-700 bg-gradient-to-tr from-emerald-400/40 via-blue-400/30 to-yellow-200/30 animate-blob" />
            <div className="w-70 h-70 mx-auto rounded-full overflow-hidden border-4 border-gradient-to-r from-emerald-400 to-blue-400 shadow-2xl bg-white z-10 relative transition-all duration-500 group-hover:scale-105 group-hover:rotate-2 flex items-center justify-center backdrop-blur-sm">
              <img
                src={profileImage || '/default-avatar.png'}
                alt="Profile"
                className="w-70 h-70 object-cover rounded-full"
                style={{ aspectRatio: '1/1' }}
              />
            </div>
            <button
              onClick={() => setShowPopup(true)}
              className="absolute bottom-4 right-10 bg-gradient-to-tr from-emerald-500 to-blue-500 p-4 rounded-full hover:scale-110 transition-all duration-300 shadow-xl border-3 border-white hover:shadow-2xl hover:rotate-12"
              title="Change Photo"
            >
              <CameraIcon className="w-6 h-6 text-white" />
            </button>
           
          </div>

          {/* Welcome Message with enhanced styling */}
          <div className="text-center mb-8">
            <h1 className="text-4xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-blue-200 to-yellow-200 mb-3 drop-shadow-2xl flex items-center justify-center gap-3">
              <span className='ml-14'>Welcome</span>{user?.firstName || userProfile.name || 'BinGo Hero'}  
              <span className="animate-wiggle text-4xl">👋</span>
            </h1>
            <p className="text-gray-200 text-lg mb-4 font-medium">
              {getLevelTitle(level)} on a mission to save the planet! 
            </p>
            <div className="inline-flex items-center bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-emerald-300 px-4 py-2 rounded-full text-sm font-semibold border border-emerald-400/30 mb-4">
              <Zap className="w-4 h-4 mr-2 animate-pulse" />
              #BinGo Champion
            </div>

            {/* Level Progress Bar */}
            <div className="bg-gray-700/50 rounded-full h-4 mb-2 overflow-hidden border border-gray-600/30 backdrop-blur-sm">
              <div 
                className={`h-full bg-gradient-to-r ${getLevelColor(level)} transition-all duration-1000 ease-out rounded-full relative overflow-hidden`}
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-6">
              {currentLevelProgress}/{100} XP to Level {level + 1}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 mb-8">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 px-6 py-3 rounded-full font-semibold shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <UserIcon className="w-5 h-5" />
              {showDetails ? 'Hide Profile Details' : 'View Profile Details'}
            </button>
            
            <button
              onClick={() => setShowAchievements(!showAchievements)}
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 px-6 py-3 rounded-full font-semibold shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Award className="w-5 h-5" />
              {showAchievements ? 'Hide Achievements' : `View Achievements (${achievements.length})`}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="w-full lg:w-2/3">
          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-10">
            {[
              {
                icon: 'points',
                value: totalPoints,
                label: 'Total Points',
                color: 'from-yellow-400/20 to-amber-100/10',
                border: 'border-yellow-200/30',
                textColor: 'text-yellow-200'
              },
              {
                icon: 'level',
                value: level,
                label: 'Current Level',
                color: 'from-purple-400/20 to-pink-100/10',
                border: 'border-purple-200/30',
                textColor: 'text-purple-200'
              },
              {
                icon: 'streak',
                value: streakData.currentStreak,
                label: 'Current Streak',
                color: 'from-orange-400/20 to-red-100/10',
                border: 'border-orange-200/30',
                textColor: 'text-orange-200'
              },
              {
                icon: 'missions',
                value: completedCount,
                label: 'Missions Complete',
                color: 'from-blue-400/20 to-blue-100/10',
                border: 'border-blue-200/30',
                textColor: 'text-blue-200'
              },
              {
                icon: 'waste',
                value: statistics.wasteDisposed || 0,
                label: 'Waste Disposed (kg)',
                color: 'from-lime-400/20 to-green-100/10',
                border: 'border-lime-200/30',
                textColor: 'text-lime-200'
              },
              {
                icon: 'sorted',
                value: statistics.wasteSorted || 0,
                label: 'Waste Sorted (kg)',
                color: 'from-cyan-400/20 to-teal-100/10',
                border: 'border-cyan-200/30',
                textColor: 'text-cyan-200'
              },
              {
                icon: 'bins',
                value: statistics.binsRecommended || 0,
                label: 'Bins Recommended',
                color: 'from-green-400/20 to-emerald-100/10',
                border: 'border-green-200/30',
                textColor: 'text-green-200'
              },
              {
                icon: 'badges',
                value: achievements.length,
                label: 'Badges Earned',
                color: 'from-pink-400/20 to-rose-100/10',
                border: 'border-pink-200/30',
                textColor: 'text-pink-200'
              }
            ].map((stat, index) => (
              <div 
                key={index}
                className={`bg-gradient-to-br ${stat.color} backdrop-blur-sm p-6 rounded-2xl shadow-xl border ${stat.border} flex flex-col items-center transition-all duration-500 hover:scale-105 hover:shadow-2xl group relative overflow-hidden ${
                  animateStats ? 'animate-fade-in-up' : ''
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                {getStatsIcon(stat.icon)}
                <p className={`font-black text-3xl ${stat.textColor} mb-1 relative z-10 transition-all duration-300 group-hover:scale-110`}>
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-sm text-gray-300 text-center font-medium relative z-10">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Enhanced User Details Section */}
          {showDetails && (
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 mb-10 shadow-2xl animate-fade-in-up relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-blue-600/5 animate-pulse"></div>
              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-blue-200 mb-6 flex items-center gap-3 relative z-10">
                <UserIcon className="w-6 h-6 text-emerald-300" /> 
                Profile Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                {[
                  { icon: UserIcon, label: 'Full Name', value: user?.fullName || userProfile.name || 'N/A' },
                  { icon: UserIcon, label: 'Username', value: user?.username || 'N/A' },
                  { icon: MailIcon, label: 'Email', value: user?.primaryEmailAddress?.emailAddress || userProfile.email || 'N/A' },
                  { icon: PhoneIcon, label: 'Phone', value: user?.primaryPhoneNumber?.phoneNumber || 'N/A' },
                  { icon: CalendarIcon, label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' },
                  { icon: Crown, label: 'Level Title', value: getLevelTitle(level) },
                  { icon: Flame, label: 'Longest Streak', value: `${streakData.longestStreak} days` },
                  { icon: Activity, label: 'Last Activity', value: streakData.lastCompletionDate ? new Date(streakData.lastCompletionDate).toLocaleDateString() : 'N/A' },
                  { icon: TrendingUp, label: 'Progress to Next Level', value: `${Math.round(progressPercentage)}%` },
                  { icon: Clock, label: 'Account Status', value: 'Active' }
                ].map(({ icon: Icon, label, value }, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-xl backdrop-blur-sm border border-gray-600/30 hover:border-emerald-400/50 transition-all duration-300 group">
                    <Icon className="w-5 h-5 text-emerald-300 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                    <div>
                      <div className="text-emerald-300 font-semibold text-sm uppercase tracking-wide">{label}</div>
                      <div className="text-white font-medium">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievements Section */}
          {showAchievements && (
            <div className="bg-gradient-to-br from-purple-800/90 to-pink-900/90 backdrop-blur-xl border border-purple-700/50 rounded-2xl p-8 mb-10 shadow-2xl animate-fade-in-up relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-pink-600/5 animate-pulse"></div>
              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200 mb-6 flex items-center gap-3 relative z-10">
                <Award className="w-6 h-6 text-purple-300" /> 
                Achievements & Badges
              </h3>
              
              {achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                  {achievements.map((achievement, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-purple-700/30 rounded-xl backdrop-blur-sm border border-purple-600/30 hover:border-pink-400/50 transition-all duration-300 group">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <Medal className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="text-purple-200 font-semibold">{achievement.name}</div>
                        <div className="text-purple-300 text-sm">{achievement.description}</div>
                        <div className="text-purple-400 text-xs">
                          Earned: {new Date(achievement.earnedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 relative z-10">
                  <Medal className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                  <div className="text-xl text-purple-400 mb-2 font-semibold">No achievements yet</div>
                  <div className="text-purple-500">Complete missions to earn your first badges!</div>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Missions Section */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-blue-200 flex items-center gap-3">
                <Trophy className="w-8 h-8 text-emerald-400" /> 
                Completed Missions
              </h2>
              <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-emerald-300 px-4 py-2 rounded-full text-sm font-bold border border-emerald-400/30">
                {completedCount} / {missions.length} Complete
              </div>
            </div>

            {completed.length > 0 ? (
              <div className="space-y-6">
                {completed.map((item, idx) => {
                  const mission = toDoMissions?.find(m => m.id === item.missionId);
                  return (
                    <div
                      key={item.missionId || idx}
                      className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-gray-700/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl hover:border-emerald-500/50 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-gradient-to-r from-emerald-400 to-blue-400 text-white px-3 py-1 rounded-full text-sm font-bold">
                              Mission #{item.missionId}
                            </div>
                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                            <div className="text-xs text-gray-400">
                              Completed {new Date().toLocaleDateString()}
                            </div>
                          </div>
                          {mission && (
                            <div className="text-xl font-bold text-white mb-2">{mission.title}</div>
                          )}
                          {mission && (
                            <div className="text-gray-300 text-sm mb-4 leading-relaxed">{mission.description}</div>
                          )}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Target className="w-5 h-5 text-yellow-400" />
                              <span className="text-yellow-300 font-semibold">
                                Points: <span className="text-yellow-100 font-bold">{mission?.reward || 0}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Heart className="w-4 h-4 text-red-400" />
                              <span className="text-red-300 text-sm">Impact: High</span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-6 flex flex-col items-center">
                          <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full flex items-center justify-center shadow-xl mb-2">
                            <Trophy className="w-8 h-8 text-white" />
                          </div>
                          <span className="text-xs text-gray-400 font-medium">Completed</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-700/50">
                <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <div className="text-2xl text-gray-400 mb-2 font-semibold">No missions completed yet</div>
                <div className="text-gray-500">Start completing missions to see your achievements here!</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfilePopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        onSave={handleSaveImage}
        userImage={profileImage}
      />

      {/* Enhanced Custom Animations */}
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-15deg) scale(1); }
          25% { transform: rotate(15deg) scale(1.1); }
          50% { transform: rotate(-10deg) scale(1); }
          75% { transform: rotate(10deg) scale(1.05); }
        }
        .animate-wiggle { animation: wiggle 2s infinite; }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.8s both ease-out; }

        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 4s linear infinite; }

        @keyframes blob {
          0%, 100% { transform: scale(1) translateY(0px) rotate(0deg); }
          33% { transform: scale(1.1) translateY(-10px) rotate(2deg); }
          66% { transform: scale(0.95) translateY(5px) rotate(-1deg); }
        }
        .animate-blob { animation: blob 8s infinite ease-in-out; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
         50% { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }

        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient { background-size: 200% 200%; animation: gradient-shift 3s ease infinite; }

        .backdrop-blur-xl { backdrop-filter: blur(16px); }
        .shadow-3xl { box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25); }
      `}</style>
    </div>
  )
}

export default Dashboard