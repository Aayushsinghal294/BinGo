import React, { useState, useEffect } from 'react'
import { Gift, ArrowDownCircle, ArrowUpCircle, Coins, Trophy, Sparkles, CheckCircle, XCircle, History, Star } from 'lucide-react'
import { useUserData } from '../context/userDataContext'


const REWARDS = [
  { id: 1, name: "Eco-Friendly Tote Bag", cost: 25, description: "Sustainable cotton tote for your daily needs", icon: "🛍️", popular: false },
  { id: 2, name: "Reusable Water Bottle", cost: 30, description: "Keep hydrated while saving the planet", icon: "💧", popular: true },
  { id: 3, name: "Plant a Tree in Your Name", cost: 35, description: "Make a lasting environmental impact", icon: "🌳", popular: false },
  { id: 4, name: "Discount Coupon", cost: 40, description: "20% off on eco-friendly products", icon: "🎟️", popular: true }
]

const API_URL = 'http://localhost:4000/api/rewards'
const Rewards = () => {
 
  const { userData, refreshUserData } = useUserData()
  const userMissions = userData?.userMissions || []

  // Calculate total and available points
  const totalPoints = Number(userData?.user?.totalPoints) || 0
  const [redeemed, setRedeemed] = useState([]) // [{rewardId, name, cost}]
  const pointsSpent = redeemed.reduce((sum, r) => sum + (Number(r.cost) || 0), 0)

  // Animation states
  const [animatePoints, setAnimatePoints] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [pulsingReward, setPulsingReward] = useState(null)

  // Transaction state
  const [recipient, setRecipient] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [txMessage, setTxMessage] = useState('')
  const [txStatus, setTxStatus] = useState('') // 'success', 'error', or ''
  const [showHistory, setShowHistory] = useState(false)

  // Notification system
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    setAnimatePoints(true)
  }, [])

useEffect(() => {
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/history?clerkId=${userData?.user?.clerkId}`)
      const data = await res.json()
      if (res.ok) {
        const formatted = (data.redeemedRewards || []).map(r => ({
          name: r.rewardName,
          cost: r.pointsUsed,
          redeemedAt: new Date(), // No timestamp in backend, so default to now
          type: 'reward'
        }))
        setRedeemed(formatted)
      } else {
        console.error('Error fetching history:', data.error)
      }
    } catch (err) {
      console.error('Error fetching reward history:', err)
    }
  }

  if (userData?.user?.clerkId) {
    fetchHistory()
  }
}, [userData])

  const addNotification = (message, type = 'success') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 4000)
  }

  // Redeem handler with animations
  const handleRedeem = async(reward) => {
    if (totalPoints < reward.cost) {
      addNotification('Not enough points to redeem this reward!', 'error')
      return
    }
    
  setPulsingReward(reward.id)
  setShowConfetti(true)

  try {
    const res = await fetch(`${API_URL}/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clerkId: userData?.user?.clerkId,
        rewardName: reward.name,
        pointsRequired: reward.cost,
        description: reward.description
      })
    })

    const data = await res.json()
    console.log(data)
    if (res.ok) {
      setRedeemed([...redeemed, { ...reward, redeemedAt: new Date() }])
      addNotification(`Successfully redeemed ${reward.name}!`, 'success')
      refreshUserData() // make sure total points are updated
    } else {
      addNotification(data.message || 'Something went wrong', 'error')
    }
  } catch (err) {
    console.error(err)
    addNotification('Failed to redeem reward. Try again.', 'error')
  } finally {
    setTimeout(() => {
      setPulsingReward(null)
      setShowConfetti(false)
    }, 1000)
  }
}

  // Transaction handler with validation
  const handleSend = () => {
    if (!recipient.trim()) {
      setTxMessage('Please enter a recipient.')
      setTxStatus('error')
      return
    }
    if (!sendAmount || isNaN(sendAmount) || sendAmount <= 0) {
      setTxMessage('Please enter a valid amount.')
      setTxStatus('error')
      return
    }
    if (Number(sendAmount) > totalPoints) {
      setTxMessage('Insufficient points.')
      setTxStatus('error')
      return
    }

    // Simulate sending
    setTxMessage('Sending...')
    setTxStatus('pending')
    
    setTimeout(() => {
      setTxMessage(`Successfully sent ${sendAmount} points to ${recipient}!`)
      setTxStatus('success')
      setRedeemed([...redeemed, { 
        id: `tx-${Date.now()}`, 
        name: `Sent to ${recipient}`, 
        cost: Number(sendAmount),
        type: 'transfer',
        redeemedAt: new Date()
      }])
      addNotification(`${sendAmount} points sent to ${recipient}`, 'success')
      setRecipient('')
      setSendAmount('')
      
      setTimeout(() => {
        setTxMessage('')
        setTxStatus('')
      }, 3000)
    }, 1500)
  }

  const getPointsColor = () => {
    if (totalPoints > 200) return 'text-emerald-300'
    if (totalPoints > 50) return 'text-amber-300'
    return 'text-red-300'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900 pt-32 pb-16 px-6 md:px-16 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Confetti animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </div>
          ))}
        </div>
      )}

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-40 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border transform transition-all duration-500 translate-x-0 opacity-100 ${
              notification.type === 'success' 
                ? 'bg-emerald-900/80 text-emerald-200 border-emerald-500/50' 
                : 'bg-red-900/80 text-red-200 border-red-500/50'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              {notification.message}
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Points Display Card */}
        <div className="bg-gradient-to-r from-emerald-800/90 to-green-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl mb-10 border border-emerald-500/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-green-600/10 animate-pulse"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-8 h-8 text-amber-300 animate-bounce" />
              <Coins className="w-12 h-12 text-amber-300" />
              <Trophy className="w-8 h-8 text-amber-300 animate-bounce delay-300" />
            </div>
            <div className={`text-5xl font-black mb-2 transition-all duration-700 ${animatePoints ? 'scale-100 opacity-100' : 'scale-50 opacity-0'} ${getPointsColor()}`}>
              {totalPoints.toLocaleString()}
            </div>
            <div className="text-xl text-white mb-2 font-semibold">Total Points Earned</div>
            <div className="flex items-center gap-4 text-lg">
              <div className="flex items-center gap-2">
                <div className="text-emerald-200">Available:</div>
                <div className={`font-bold text-xl ${getPointsColor()} transition-colors duration-500`}>
                  {totalPoints.toLocaleString()}
                </div>
              </div>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
              <div className="text-gray-300">Spent: {pointsSpent.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setShowHistory(false)}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              !showHistory 
                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg transform scale-105' 
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <Gift className="w-5 h-5 inline mr-2" />
            Rewards
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              showHistory 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105' 
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <History className="w-5 h-5 inline mr-2" />
            History ({redeemed.length})
          </button>
        </div>

        {!showHistory ? (
          <>
            {/* Redeem Rewards */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <Gift className="w-8 h-8 text-amber-400" />
                Redeem Rewards
                <div className="text-sm bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full">
                  {REWARDS.length} Available
                </div>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {REWARDS.map(reward => (
                  <div 
                    key={reward.id} 
                    className={`bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 hover:transform hover:scale-105 hover:border-emerald-500/50 relative overflow-hidden group ${
                      pulsingReward === reward.id ? 'animate-pulse border-emerald-400' : ''
                    }`}
                  >
                    {reward.popular && (
                      <div className="absolute top-3 right-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Popular
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-green-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                      <div className="text-4xl mb-3 text-center">{reward.icon}</div>
                      <div className="text-xl font-bold text-white mb-2 text-center">{reward.name}</div>
                      <div className="text-gray-400 text-sm mb-4 text-center">{reward.description}</div>
                      <div className="text-center mb-4">
                        <div className="text-2xl font-black text-amber-300 flex items-center justify-center gap-2">
                          <Coins className="w-5 h-5" />
                          {reward.cost.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">points required</div>
                      </div>
                      <button
                        disabled={totalPoints < reward.cost || pulsingReward === reward.id}
                        onClick={() => handleRedeem(reward)}
                        className={`w-full py-3 px-4 rounded-xl font-semibold shadow-lg transition-all duration-300 transform ${
                          totalPoints < reward.cost 
                            ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-400 cursor-not-allowed' 
                            : pulsingReward === reward.id
                            ? 'bg-gradient-to-r from-emerald-400 to-green-400 text-white animate-pulse'
                            : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-400 hover:to-green-400 hover:scale-105 hover:shadow-xl'
                        }`}
                      >
                        {pulsingReward === reward.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Redeeming...
                          </div>
                        ) : totalPoints < reward.cost ? (
                          "Insufficient Points"
                        ) : (
                          "Redeem Now"
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Send Points */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <ArrowUpCircle className="w-8 h-8 text-blue-400" />
                Send Points
              </h2>
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-xl">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Recipient</label>
                    <input
                      type="text"
                      placeholder="Username or Email"
                      value={recipient}
                      onChange={e => setRecipient(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-700/50 text-white border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 backdrop-blur-sm"
                    />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={sendAmount}
                      onChange={e => setSendAmount(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-700/50 text-white border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 backdrop-blur-sm"
                      max={totalPoints}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleSend}
                      disabled={txStatus === 'pending'}
                      className={`px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 transform ${
                        txStatus === 'pending'
                          ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-400 hover:to-blue-500 hover:scale-105 hover:shadow-xl'
                      }`}
                    >
                      {txStatus === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Sending
                        </div>
                      ) : (
                        'Send Points'
                      )}
                    </button>
                  </div>
                </div>
                {txMessage && (
                  <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                    txStatus === 'success' 
                      ? 'bg-emerald-900/50 text-emerald-200 border border-emerald-500/20' 
                      : txStatus === 'error'
                      ? 'bg-red-900/50 text-red-200 border border-red-500/20'
                      : 'bg-blue-900/50 text-blue-200 border border-blue-500/20'
                  }`}>
                    {txStatus === 'success' && <CheckCircle className="w-5 h-5" />}
                    {txStatus === 'error' && <XCircle className="w-5 h-5" />}
                    {txStatus === 'pending' && <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>}
                    {txMessage}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Transaction History */
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <History className="w-8 h-8 text-purple-400" />
              Transaction History
            </h2>
            {redeemed.length > 0 ? (
              <div className="space-y-4">
                {redeemed.map((item, index) => (
                  <div 
                    key={index}
                    className="bg-gradient-to-r from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-purple-500/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          item.type === 'transfer' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {item.type === 'transfer' ? <ArrowUpCircle className="w-5 h-5" /> : <Gift className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="text-white font-semibold">{item.name}</div>
                          <div className="text-gray-400 text-sm">
                            {item.redeemedAt ? new Date(item.redeemedAt).toLocaleDateString() : 'Just now'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-300 font-bold">-{item.cost} pts</div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          item.type === 'transfer' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {item.type === 'transfer' ? 'Transfer' : 'Reward'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <History className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <div className="text-xl text-gray-400 mb-2">No transactions yet</div>
                <div className="text-gray-500">Your reward redemptions and point transfers will appear here</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Rewards