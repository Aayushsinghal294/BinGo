import React, { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Leaf, Users, Gift, Scan, Camera, MapPin, Trophy, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

const ParticlesBG = () => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    // Dustbin position (bottom center)
    const dustbin = {
      x: width / 2,
      y: height - 80,
      r: 36,
    }

    // Fixed reward target (top right, like a reward button)
    function getRewardTarget() {
      return {
        x: width - 60,
        y: 40,
      }
    }

    // Waste particle shapes/colors with neon glow
    const wasteTypes = [
      { color: '#fbbf24', shape: 'circle', glow: '#fef3c7' },   // yellow
      { color: '#60a5fa', shape: 'rect', glow: '#dbeafe' },     // blue
      { color: '#34d399', shape: 'triangle', glow: '#d1fae5' }, // green
      { color: '#f472b6', shape: 'star', glow: '#fce7f3' },     // pink star
      { color: '#a3e635', shape: 'oval', glow: '#ecfccb' },     // lime oval
    ]

    // Generate random waste particles
    const particles = Array.from({ length: 32 }).map(() => {
      const type = wasteTypes[Math.floor(Math.random() * wasteTypes.length)]
      const startX = Math.random() * width
      const startY = Math.random() * (height * 0.7)
      const size = 8 + Math.random() * 14
      const speed = 0.5 + Math.random() * 1.0
      return {
        ...type,
        x: startX,
        y: startY,
        size,
        speed,
        angle: Math.atan2(dustbin.y - startY, dustbin.x - startX),
        progress: 0,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
      }
    })

    // Coins flying to top right
    const coins = []

    function drawCoin(ctx, r, alpha = 1) {
      ctx.save()
      ctx.globalAlpha = alpha
      // Outer coin with enhanced glow
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, 2 * Math.PI)
      ctx.fillStyle = '#ffd700'
      ctx.shadowBlur = 20
      ctx.shadowColor = '#ffed4e'
      ctx.fill()
      // Inner shine
      ctx.beginPath()
      ctx.arc(-r * 0.3, -r * 0.3, r * 0.4, 0, 2 * Math.PI)
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.shadowBlur = 0
      ctx.fill()
      // Coin edge
      ctx.lineWidth = 2
      ctx.strokeStyle = '#f59e42'
      ctx.stroke()
      ctx.restore()
    }

    function drawStar(ctx, r, color, alpha = 1) {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(
          Math.cos((18 + i * 72) / 180 * Math.PI) * r,
          -Math.sin((18 + i * 72) / 180 * Math.PI) * r
        )
        ctx.lineTo(
          Math.cos((54 + i * 72) / 180 * Math.PI) * r * 0.5,
          -Math.sin((54 + i * 72) / 180 * Math.PI) * r * 0.5
        )
      }
      ctx.closePath()
      ctx.fillStyle = color
      ctx.shadowBlur = 18
      ctx.shadowColor = color
      ctx.fill()
      ctx.restore()
    }

    function animate() {
      ctx.clearRect(0, 0, width, height)
      
      // Draw and move waste particles
      particles.forEach(p => {
        // Move toward dustbin
        p.progress += p.speed * 0.008
        p.x += Math.cos(p.angle) * p.speed
        p.y += Math.sin(p.angle) * p.speed
        p.rotation += p.rotationSpeed

        // Draw shape with enhanced glow
        ctx.save()
        ctx.globalAlpha = 0.85
        ctx.shadowBlur = 15
        ctx.shadowColor = p.glow
        ctx.fillStyle = p.color
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        
        switch (p.shape) {
          case 'circle':
            ctx.beginPath()
            ctx.arc(0, 0, p.size / 2, 0, 2 * Math.PI)
            ctx.fill()
            break
          case 'rect':
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
            break
          case 'triangle':
            ctx.beginPath()
            ctx.moveTo(0, -p.size / 2)
            ctx.lineTo(-p.size / 2, p.size / 2)
            ctx.lineTo(p.size / 2, p.size / 2)
            ctx.closePath()
            ctx.fill()
            break
          case 'star':
            drawStar(ctx, p.size / 2, p.color)
            break
          case 'oval':
            ctx.save()
            ctx.scale(1.4, 0.6)
            ctx.beginPath()
            ctx.arc(0, 0, p.size / 2, 0, 2 * Math.PI)
            ctx.fill()
            ctx.restore()
            break
          default:
            break
        }
        ctx.restore()

        // If reached dustbin, spawn coin and reset
        const rewardTarget = getRewardTarget()
        if (Math.hypot(p.x - dustbin.x, p.y - dustbin.y) < 35) {
          const control = {
            x: dustbin.x + (rewardTarget.x - dustbin.x) * 0.3,
            y: Math.min(dustbin.y, rewardTarget.y) - 140,
          }
          coins.push({
            t: 0,
            duration: 85 + Math.random() * 15,
            start: { x: dustbin.x, y: dustbin.y - 15 },
            end: { x: rewardTarget.x, y: rewardTarget.y },
            control,
            size: 12 + Math.random() * 10,
            collected: false,
          })
          // Reset waste particle
          p.x = Math.random() * width
          p.y = Math.random() * (height * 0.7)
          p.angle = Math.atan2(dustbin.y - p.y, dustbin.x - p.x)
          p.rotation = Math.random() * Math.PI * 2
        }
      })

      // Draw and animate coins
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i]
        c.t += 1
        const progress = Math.min(1, c.t / c.duration)
        const x =
          (1 - progress) * (1 - progress) * c.start.x +
          2 * (1 - progress) * progress * c.control.x +
          progress * progress * c.end.x
        const y =
          (1 - progress) * (1 - progress) * c.start.y +
          2 * (1 - progress) * progress * c.control.y +
          progress * progress * c.end.y
        const alpha = 1 - Math.max(0, progress - 0.8) / 0.2
        
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(progress * Math.PI * 4) // spinning effect
        drawCoin(ctx, c.size / 2, alpha)
        ctx.restore()
        
        if (progress >= 1 && !c.collected) {
          c.collected = true
          coins.splice(i, 1)
        }
      }

      // Draw enhanced dustbin
      ctx.save()
      ctx.translate(dustbin.x, dustbin.y)
      ctx.scale(1.3, 1.3)
      ctx.globalAlpha = 0.95
      ctx.lineWidth = 2.5
      ctx.strokeStyle = '#10b981'
      ctx.fillStyle = '#1f2937'
      ctx.shadowBlur = 20
      ctx.shadowColor = '#10b981'
      
      // Bin body
      ctx.beginPath()
      ctx.moveTo(-18, 0)
      ctx.lineTo(-14, 32)
      ctx.lineTo(14, 32)
      ctx.lineTo(18, 0)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      
      // Bin lid
      ctx.beginPath()
      ctx.rect(-20, -8, 40, 10)
      ctx.fillStyle = '#374151'
      ctx.fill()
      ctx.stroke()
      
      // Bin handle
      ctx.beginPath()
      ctx.arc(0, -8, 8, Math.PI, 2 * Math.PI)
      ctx.stroke()
      ctx.restore()

      // Draw reward coin with pulsing effect
      const rewardTarget = getRewardTarget()
      const pulseSize = 18 + Math.sin(Date.now() * 0.003) * 3
      ctx.save()
      ctx.translate(rewardTarget.x, rewardTarget.y)
      drawCoin(ctx, pulseSize, 1)
      ctx.restore()

      requestAnimationFrame(animate)
    }

    animate()

    function handleResize() {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
      dustbin.x = width / 2
      dustbin.y = height - 80
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}
      aria-hidden
    />
  )
}

const HeroSection = () => {
  const navigate = useNavigate()
  const cards = [
    {
      title: "Dispose Waste",
      icon: <Camera className='w-4 h-4 sm:w-5 sm:h-5 text-pink-400' />,
      task: "Photo proof, instant points.",
      reward: "+50",
      gradient: "from-pink-500/20 to-rose-500/20",
      borderGradient: "from-pink-400 to-rose-400"
    },
    {
      title: "Suggest Bin",
      icon: <MapPin className='w-4 h-4 sm:w-5 sm:h-5 text-blue-400' />,
      task: "Mark a new spot.",
      reward: "+30",
      gradient: "from-blue-500/20 to-cyan-500/20",
      borderGradient: "from-blue-400 to-cyan-400"
    },
    {
      title: "3-Day Streak",
      icon: <Trophy className='w-4 h-4 sm:w-5 sm:h-5 text-yellow-400' />,
      task: "Log daily action.",
      reward: "+40",
      gradient: "from-yellow-500/20 to-amber-500/20",
      borderGradient: "from-yellow-400 to-amber-400"
    },
    {
      title: "Sort Waste",
      icon: <Scan className='w-4 h-4 sm:w-5 sm:h-5 text-green-400' />,
      task: "Scan & sort items.",
      reward: "+25",
      gradient: "from-green-500/20 to-emerald-500/20",
      borderGradient: "from-green-400 to-emerald-400"
    }
  ]

  return (
    <div className='relative flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-20 2xl:px-32 pt-30 sm:pt-24 md:pt-28 lg:pt-32 pb-8 lg:pb-12 min-h-screen text-white overflow-hidden'>
      <ParticlesBG />
      
      {/* Floating geometric shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
        <div className="absolute top-20 left-4 sm:left-10 w-20 sm:w-32 h-20 sm:h-32 bg-gradient-to-r from-green-400/10 to-emerald-400/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-32 sm:top-40 right-4 sm:right-20 w-16 sm:w-24 h-16 sm:h-24 bg-gradient-to-r from-blue-400/10 to-cyan-400/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-4 sm:left-20 w-24 sm:w-40 h-24 sm:h-40 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-xl animate-pulse delay-2000"></div>
      </div>

      {/* Left Content */}
      <div className='flex flex-col justify-center gap-6 sm:gap-8 lg:w-1/2 xl:w-3/5 z-10 relative'>
        <motion.div
          className='absolute -top-4 -left-4 w-2 h-2 bg-green-400 rounded-full animate-ping'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        />
        
        <motion.h1
          className='text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] max-w-4xl bg-gradient-to-r from-white via-green-100 to-green-200 bg-clip-text text-transparent'
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 1, type: "spring", stiffness: 100 }}
        >
          Turn Trash Into Triumph with{' '}
          <motion.span 
            className='relative bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 bg-clip-text text-transparent'
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            BinGo
            <motion.span
              className='absolute -top-1 sm:-top-2 -right-1 sm:-right-2'
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Sparkles className='w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-400' />
            </motion.span>
          </motion.span>
        </motion.h1>

        <motion.div
          className='relative'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <p className='text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent mb-2'>
            Snap it . Bin it . Win it .
          </p>
          <div className='w-16 sm:w-20 lg:w-45 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full'></div>
        </motion.div>

        <motion.p
          className='max-w-2xl text-base sm:text-lg md:text-xl text-gray-100/90 leading-relaxed'
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          Take a live photo of your BinGo-action, verify through AI, and rise on the leaderboard. Make waste count and earn badges, points, and real-world rewards.
        </motion.p>

        <motion.button
          className='group relative flex items-center justify-center gap-3 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 hover:from-green-300 hover:via-emerald-300 hover:to-green-400 transition-all duration-300 rounded-2xl shadow-2xl w-full sm:w-max overflow-hidden'
          whileHover={{ 
            scale: 1.05, 
            boxShadow: "0 20px 40px 0 rgba(34,197,94,0.3)",
            y: -2
          }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          onClick={() => navigate('/missions')}
        >
          <div className='absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
          <span className='relative z-10 text-gray-900'>Start Your Mission</span>
          <ArrowRight className='relative z-10 w-5 h-5 sm:w-6 sm:h-6 text-gray-900 group-hover:translate-x-1 transition-transform duration-300' />
        </motion.button>

        <motion.div
          className='flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 mt-6 sm:mt-8'
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          {[
            { icon: Users, text: "5,000+ Users Joined", color: "text-green-300", bg: "from-green-400/10 to-emerald-400/10" },
            { icon: Gift, text: "12,300 Rewards Claimed", color: "text-yellow-300", bg: "from-yellow-400/10 to-amber-400/10" },
            { icon: Leaf, text: "18 Tons Waste Collected", color: "text-lime-300", bg: "from-lime-400/10 to-green-400/10" }
          ].map((item, i) => (
            <motion.div
              key={i}
              className={`flex items-center gap-2 sm:gap-3 bg-gradient-to-r ${item.bg} backdrop-blur-xl px-4 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl shadow-lg border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 + i * 0.1 }}
              whileHover={{ y: -2 }}
            >
              <item.icon className={`${item.color} w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0`} />
              <span className='text-xs sm:text-sm font-medium whitespace-nowrap'>{item.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Right Grid - Mobile version */}
      <motion.div
        className="lg:hidden grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-lg mx-auto mt-8 z-10"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
      >
        {cards.map((card, i) => (
          <motion.div
            key={i}
            className={`group relative bg-gradient-to-br ${card.gradient} backdrop-blur-2xl p-4 rounded-2xl shadow-2xl w-full h-48 sm:h-56 flex flex-col justify-between border border-white/20 hover:border-white/30 transition-all duration-500 overflow-hidden`}
            whileHover={{ 
              y: -8, 
              boxShadow: "0 25px 50px 0 rgba(0,0,0,0.25)",
              scale: 1.02
            }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: 1.6 + i * 0.15, 
              duration: 0.8, 
              type: "spring",
              stiffness: 100
            }}
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${card.borderGradient} rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-sm`}></div>
            
            <div className='absolute top-3 right-3 w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse'></div>
            <div className='absolute top-5 right-5 w-1 h-1 bg-white/60 rounded-full animate-pulse delay-500'></div>
            
            <div className='relative z-10'>
              <div className='flex items-center gap-2 mb-3'>
                <div className={`p-1.5 rounded-lg bg-gradient-to-r ${card.borderGradient} bg-opacity-20`}>
                  {card.icon}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white leading-tight">{card.title}</h3>
              </div>
              <p className="text-xs sm:text-sm text-gray-100/80 leading-relaxed">{card.task}</p>
            </div>
            
            <div className='relative z-10 flex justify-between items-end mt-4'>
              <div className='flex items-center gap-1'>
                <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-yellow-300 to-amber-300 bg-clip-text text-transparent">
                  {card.reward}
                </span>
                <span className='text-xs text-yellow-200/60'>pts</span>
              </div>
              <motion.button
                className={`px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r ${card.borderGradient} text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl text-gray-900 relative overflow-hidden group/btn`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/missions')}
              >
                <div className='absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500'></div>
                <span className='relative z-10'>Join</span>
              </motion.button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Right Grid - Desktop version */}
      <motion.div
        className="hidden lg:grid grid-cols-2 gap-6 lg:w-2/5 xl:w-2/5 relative z-10"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 1.4, duration: 1, type: "spring", stiffness: 60 }}
      >
        {cards.map((card, i) => (
          <motion.div
            key={i}
            className={`group relative bg-gradient-to-br ${card.gradient} backdrop-blur-2xl p-6 rounded-3xl shadow-2xl w-full h-72 flex flex-col justify-between border border-white/20 hover:border-white/30 transition-all duration-500 overflow-hidden`}
            whileHover={{ 
              y: -12, 
              boxShadow: "0 25px 50px 0 rgba(0,0,0,0.25)",
              scale: 1.02
            }}
            initial={{ opacity: 0, y: 50, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ 
              delay: 1.6 + i * 0.15, 
              duration: 0.8, 
              type: "spring",
              stiffness: 100
            }}
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${card.borderGradient} rounded-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-sm`}></div>
            
            <div className='absolute top-4 right-4 w-2 h-2 bg-white/40 rounded-full animate-pulse'></div>
            <div className='absolute top-8 right-8 w-1 h-1 bg-white/60 rounded-full animate-pulse delay-500'></div>
            
            <div className='relative z-10'>
              <div className='flex items-center gap-3 mb-4'>
                <div className={`p-2 rounded-xl bg-gradient-to-r ${card.borderGradient} bg-opacity-20`}>
                  {card.icon}
                </div>
                <h3 className="text-xl font-bold text-white">{card.title}</h3>
              </div>
              <p className="text-sm text-gray-100/80 leading-relaxed">{card.task}</p>
            </div>
            
            <div className='relative z-10 flex justify-between items-end mt-6'>
              <div className='flex items-center gap-2'>
                <span className="text-2xl font-bold bg-gradient-to-r from-yellow-300 to-amber-300 bg-clip-text text-transparent">
                  {card.reward}
                </span>
                <span className='text-xs text-yellow-200/60'>points</span>
              </div>
              <motion.button
                className={`px-6 py-2.5 bg-gradient-to-r ${card.borderGradient} text-sm font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl text-gray-900 relative overflow-hidden group/btn`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/missions')}
              >
                <div className='absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500'></div>
                <span className='relative z-10'>Join</span>
              </motion.button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

export default HeroSection