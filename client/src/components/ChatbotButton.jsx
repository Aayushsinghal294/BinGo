import React, { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Paperclip, RotateCcw, Sparkles, Leaf, Recycle } from 'lucide-react'

const ChatbotButton = () => {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'Hi! I am your BinGo Assistant. 🌱\n\nI can help you with:\n• Waste management questions\n• Identifying biodegradable items\n• Recycling guidance\n• Eco-friendly tips\n• Image analysis of waste items\n\nFeel free to ask me anything or upload an image!'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [error, setError] = useState(null)
  const [particles, setParticles] = useState([])
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const chatWindowRef = useRef(null)
  const sessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

  // Particle system
  useEffect(() => {
    if (open) {
      const generateParticles = () => {
        const newParticles = []
        for (let i = 0; i < 15; i++) {
          newParticles.push({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 4 + 2,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.5 + 0.2,
            color: ['#10b981', '#34d399', '#84cc16', '#22d3ee'][Math.floor(Math.random() * 4)]
          })
        }
        setParticles(newParticles)
      }
      generateParticles()

      const animateParticles = setInterval(() => {
        setParticles(prev => prev.map(particle => ({
          ...particle,
          x: (particle.x + particle.speedX + 100) % 100,
          y: (particle.y + particle.speedY + 100) % 100,
          opacity: Math.sin(Date.now() * 0.001 + particle.id) * 0.3 + 0.4
        })))
      }, 50)

      return () => clearInterval(animateParticles)
    }
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (open && chatWindowRef.current && !chatWindowRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file')
        return
      }
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(file)
      setError(null)
    }
  }

  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const sendMessage = async () => {
    if (!input.trim() && !selectedImage) return
    setLoading(true)
    setError(null)
    try {
      const API_BASE = import.meta.env.PROD
        ? 'https://your-production-api.com'
        : '/api'

      if (selectedImage) {
        const userMsg = {
          role: 'user',
          text: input || 'Please analyze this waste image',
          image: imagePreview
        }
        setMessages(prev => [...prev, userMsg])
        const base64Image = await convertImageToBase64(selectedImage)
        const res = await fetch(`${API_BASE}/analyze-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Image,
            sessionId: sessionId.current
          })
        })
        const data = await res.json()
        if (res.ok) {
          setMessages(prev => [...prev, { role: 'bot', text: data.analysis }])
        } else {
          throw new Error(data.error || "Error analyzing image. Please try again.")
        }
        setSelectedImage(null)
        setImagePreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        const userMsg = { role: 'user', text: input }
        setMessages(prev => [...prev, userMsg])
        const res = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: input,
            sessionId: sessionId.current
          })
        })
        const data = await res.json()
        if (res.ok) {
          setMessages(prev => [...prev, { role: 'bot', text: data.reply }])
        } else {
          throw new Error(data.error || "Error. Please try again.")
        }
      }
    } catch (error) {
      setError(error.message || "Network error. Please check your connection and try again.")
      setMessages(prev => [...prev, {
        role: 'bot',
        text: "I'm having trouble connecting right now. Please check your internet connection and try again. 🔄"
      }])
    }
    setInput('')
    setLoading(false)
  }

  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const clearChat = () => {
    setMessages([
      {
        role: 'bot',
        text: 'Hi! I am your BinGo Assistant. 🌱\n\nI can help you with:\n• Waste management questions\n• Identifying biodegradable items\n• Recycling guidance\n• Eco-friendly tips\n• Image analysis of waste items\n\nFeel free to ask me anything or upload an image!'
      }
    ])
    sessionId.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!open ? (
        <div className="relative">
          {/* Floating action button with pulse rings */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 animate-ping opacity-30"></div>
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 animate-pulse opacity-40"></div>
          <button
            onClick={() => setOpen(true)}
            className="relative bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 text-white p-5 rounded-full shadow-2xl transition-all duration-500 hover:scale-125 hover:rotate-12 hover:shadow-emerald-500/60 focus:outline-none focus:ring-4 focus:ring-emerald-400/50 group overflow-hidden magic-btn"
            title="Open BinGo Assistant"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full animate-spin-slow"></div>
            <Bot className="w-8 h-8 relative z-10 transition-transform duration-300 group-hover:scale-110" />
            <Sparkles className="absolute top-1 right-1 w-4 h-4 text-yellow-300 animate-twinkle opacity-80" />
          </button>
        </div>
      ) : (
        <div 
          ref={chatWindowRef}
          className="w-[90vw] max-w-[520px] min-w-[380px] h-[85vh] max-h-[750px] min-h-[550px] rounded-3xl shadow-2xl border border-gray-700/30 bg-gradient-to-br from-gray-900/95 via-slate-800/95 to-emerald-900/95 backdrop-blur-2xl overflow-hidden relative flex flex-col animate-scale-in"
          style={{ 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05), 0 0 60px rgba(16, 185, 129, 0.15)' 
          }}
        >
          {/* Animated Background Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map(particle => (
              <div
                key={particle.id}
                className="absolute rounded-full animate-float"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  backgroundColor: particle.color,
                  opacity: particle.opacity,
                  boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
                  animationDelay: `${particle.id * 0.2}s`,
                  animationDuration: `${3 + particle.id * 0.5}s`
                }}
              />
            ))}
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none animate-gradient-shift"></div>

          {/* Header with enhanced design */}
          <div className="bg-gradient-to-r from-gray-800/90 via-slate-700/90 to-emerald-800/90 text-white px-6 py-5 rounded-t-3xl shadow-lg flex-shrink-0 border-b border-gray-600/30 backdrop-blur-xl relative overflow-hidden">
            {/* Header background animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 via-teal-500/10 to-green-500/10 animate-pulse"></div>
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-3 rounded-full shadow-lg animate-glow">
                    <Bot className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-wide text-white flex items-center gap-2">
                    BinGo Assistant
                    <Leaf className="w-5 h-5 text-green-400 animate-bounce" />
                  </h3>
                  <p className="text-sm text-emerald-300 animate-fade-in-up">🌱 Waste Management Expert</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={clearChat}
                  className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all duration-300 hover:scale-110 backdrop-blur-sm hover:rotate-180 group"
                  title="Clear chat"
                >
                  <RotateCcw className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="bg-red-500/80 hover:bg-red-500 p-3 rounded-full transition-all duration-300 hover:scale-110 hover:rotate-90"
                  title="Close chat"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Error Banner with enhanced styling */}
          {error && (
            <div className="bg-gradient-to-r from-red-900/95 to-red-800/95 border-l-4 border-red-500 p-4 text-red-200 text-sm animate-slide-down flex-shrink-0 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
              <p className="relative z-10 flex items-center gap-2">
                <span className="text-red-400">⚠️</span>
                {error}
              </p>
            </div>
          )}

          {/* Messages with enhanced styling */}
          <div className="flex-1 p-5 space-y-5 overflow-y-auto bg-gradient-to-b from-gray-900/30 to-slate-800/30 dark-scrollbar relative">
            {/* Decorative elements */}
            <div className="absolute top-4 left-4 opacity-20">
              <Recycle className="w-8 h-8 text-emerald-400 animate-spin-slow" />
            </div>
            <div className="absolute bottom-4 right-4 opacity-20">
              <Leaf className="w-6 h-6 text-green-400 animate-pulse" />
            </div>

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'bot' ? 'justify-start' : 'justify-end'} animate-message-appear`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div
                  className={`max-w-[85%] px-5 py-4 rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] relative overflow-hidden ${
                    msg.role === 'bot'
                      ? 'bg-gradient-to-br from-gray-800/90 to-slate-700/90 border-gray-600/30 text-gray-100 rounded-bl-md backdrop-blur-sm message-glow-bot'
                      : 'bg-gradient-to-br from-emerald-600/90 to-teal-600/90 border-emerald-500/30 text-white rounded-br-md shadow-emerald-500/20 message-glow-user'
                  }`}
                >
                  {msg.role === 'bot' && (
                    <div className="absolute top-2 right-2 opacity-30">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  
                  {msg.image && (
                    <div className="relative mb-4 group">
                      <img
                        src={msg.image}
                        alt="Uploaded waste"
                        className="max-w-full h-auto rounded-lg border border-gray-600/50 transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm leading-relaxed relative z-10">{msg.text}</div>
                  
                  {/* Message shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-gradient-to-br from-gray-800/90 to-slate-700/90 border border-gray-600/30 px-5 py-4 rounded-2xl rounded-bl-md shadow-lg flex items-center space-x-3 backdrop-blur-sm relative overflow-hidden">
                  <div className="flex space-x-1">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full animate-bounce shadow-lg"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                  <span className="text-gray-300 text-sm animate-pulse">BinGo is thinking...</span>
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-twinkle ml-2" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Image Preview with enhanced styling */}
          {imagePreview && (
            <div className="px-5 py-4 border-t border-gray-600/30 bg-gradient-to-r from-gray-800/60 to-emerald-900/60 flex-shrink-0 backdrop-blur-sm animate-slide-up">
              <div className="flex items-center space-x-4">
                <div className="relative group">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-xl border-2 border-emerald-500/50 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:border-emerald-400"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <button
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm transition-all duration-300 shadow-lg hover:scale-110 hover:rotate-90"
                  >
                    ×
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300 font-medium">Image ready for analysis</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Click send to analyze this waste item
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Input Area with enhanced design */}
          <div className="px-5 py-5 border-t border-gray-600/30 bg-gradient-to-r from-gray-800/80 via-slate-800/80 to-emerald-900/80 flex-shrink-0 backdrop-blur-xl shadow-inner relative overflow-hidden">
            {/* Input area glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-green-500/5 animate-pulse"></div>
            
            <div className="flex items-end gap-3 relative z-10">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message or upload an image..."
                  className="w-full px-5 py-4 border border-emerald-700/40 rounded-2xl text-sm bg-gradient-to-br from-emerald-900/40 to-teal-900/40 text-emerald-100 placeholder:text-emerald-300/70 shadow-lg focus:outline-none focus:ring-2 focus:ring-lime-400/70 focus:border-lime-400 transition-all resize-none max-h-32 min-h-[52px] glassy-input backdrop-blur-sm"
                  disabled={loading}
                  rows="1"
                  aria-label="Type your message"
                />
                <div className="absolute inset-0 rounded-2xl ring-2 ring-emerald-400/0 focus-within:ring-emerald-400/30 transition-all pointer-events-none animate-glow-ring"></div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-4 bg-gradient-to-br from-emerald-800/80 to-teal-800/80 border border-emerald-700/40 text-emerald-200 hover:from-lime-700/80 hover:to-emerald-700/80 hover:text-lime-200 rounded-xl transition-all flex-shrink-0 shadow-lg focus:outline-none focus:ring-2 focus:ring-lime-400/60 hover:scale-110 hover:shadow-lime-400/30 shine-btn backdrop-blur-sm group"
                disabled={loading}
                title="Upload waste image"
                aria-label="Upload waste image"
                type="button"
              >
                <Paperclip className="w-5 h-5 transition-transform group-hover:rotate-12" />
              </button>

              <button
                onClick={sendMessage}
                disabled={loading || (!input.trim() && !selectedImage)}
                className="p-4 bg-gradient-to-br from-emerald-600 to-lime-500 hover:from-emerald-500 hover:to-lime-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-all flex-shrink-0 shadow-lg hover:shadow-lime-400/40 focus:outline-none focus:ring-2 focus:ring-lime-400/60 hover:scale-110 shine-btn backdrop-blur-sm group relative overflow-hidden"
                title="Send message"
                aria-label="Send message"
                type="button"
              >
                <Send className="w-5 h-5 transition-transform group-hover:translate-x-1 relative z-10" />
                {!loading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-scale-in {
          animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .animate-slide-up {
          animation: slideUp 0.4s ease-out;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out;
        }
        .animate-message-appear {
          animation: messageAppear 0.5s ease-out;
        }
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        .animate-gradient-shift {
          animation: gradientShift 6s ease-in-out infinite;
        }
        .animate-glow {
          animation: glow 2s ease-in-out infinite alternate;
        }
        .animate-glow-ring {
          animation: glowRing 3s ease-in-out infinite;
        }
        .magic-btn {
          animation: magicFloat 3s ease-in-out infinite;
        }
        .message-glow-bot {
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.1);
        }
        .message-glow-user {
          box-shadow: 0 4px 20px rgba(20, 184, 166, 0.2);
        }

        /* Dark Theme Custom Scrollbar */
        .dark-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #10b981 #1f2937;
        }
        .dark-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .dark-scrollbar::-webkit-scrollbar-track {
          background: linear-gradient(to bottom, #1f2937, #111827);
          border-radius: 10px;
          margin: 8px 0;
          border: 1px solid #374151;
        }
        .dark-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #10b981, #059669);
          border-radius: 10px;
          border: 1px solid #065f46;
          box-shadow: 
            inset 0 1px 2px rgba(255, 255, 255, 0.1),
            0 0 8px rgba(16, 185, 129, 0.3);
        }
        .dark-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #34d399, #10b981);
          box-shadow: 
            inset 0 1px 3px rgba(255, 255, 255, 0.2),
            0 0 12px rgba(16, 185, 129, 0.5);
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(40px) rotateX(-20deg);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0) rotateX(0deg);
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes messageAppear {
          from {
            opacity: 0;
            transform: translateX(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes twinkle {
          0%, 100% { 
            opacity: 0.5; 
            transform: rotate(0deg) scale(1);
          }
          50% { 
            opacity: 1; 
            transform: rotate(180deg) scale(1.2);
          }
        }
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg); 
          }
          33% { 
            transform: translateY(-10px) rotate(120deg); 
          }
          66% { 
            transform: translateY(5px) rotate(240deg); 
          }
        }
        @keyframes gradientShift {
          0%, 100% { 
            background-position: 0% 50%; 
          }
          50% { 
            background-position: 100% 50%; 
          }
        }
        @keyframes glow {
          0% { 
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); 
          }
          100% { 
            box-shadow: 0 0 30px rgba(16, 185, 129, 0.6), 0 0 40px rgba(16, 185, 129, 0.2); 
          }
        }
        @keyframes glowRing {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.1); 
          }
          50% { 
            box-shadow: 0 0 30px rgba(16, 185, 129, 0.3); 
          }
        }
        @keyframes magicFloat {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg); 
          }
          33% { 
            transform: translateY(-5px) rotate(2deg); 
          }
          66% { 
            transform: translateY(3px) rotate(-1deg); 
          }
        }

        /* Glassmorphism effect */
        .glassy-input {
          backdrop-filter: blur(12px) saturate(1.3);
          background: linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(132,204,22,0.08) 100%);
          box-shadow: 
            0 4px 20px 0 rgba(16,185,129,0.1),
            inset 0 1px 0 rgba(255,255,255,0.1);
                 transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .shine-btn {
          position: relative;
          overflow: hidden;
        }
        .shine-btn::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(120deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 100%);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }
        .shine-btn:hover::after, .shine-btn:focus::after {
          opacity: 1;
          animation: shine-move 0.7s linear;
        }
        @keyframes shine-move {
          0% { transform: translateX(-60%) rotate(10deg);}
          100% { transform: translateX(60%) rotate(10deg);}
        }
        @keyframes spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
      `}</style>
    </div>
  )
}

export default ChatbotButton  