import React from 'react'
import { MapPinIcon, Trash2Icon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const SuggestBinButton = () => {
  const navigate = useNavigate()

  return (
    <div className="fixed bottom-6 left-6 z-50 group">
      {/* Animated pulse rings */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 animate-ping opacity-30 pointer-events-none"></div>
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 animate-pulse opacity-40 pointer-events-none"></div>
      <button
        onClick={() => navigate('/map')}
        className="relative bg-gradient-to-br from-yellow-500 via-amber-400 to-yellow-600 text-white p-5 rounded-full shadow-2xl transition-all duration-500 hover:scale-125 hover:rotate-12 hover:shadow-yellow-400/60 focus:outline-none focus:ring-4 focus:ring-yellow-400/50 group overflow-hidden magic-btn"
        title="Suggest Bin"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full animate-spin-slow"></div>
        <Trash2Icon className="w-8 h-8 relative z-10 transition-transform duration-300 group-hover:scale-110" />
        <MapPinIcon className="absolute top-1 right-1 w-4 h-4 text-white/80 animate-twinkle opacity-80" />
      </button>
      <style>{`
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.5; transform: rotate(0deg) scale(1);}
          50% { opacity: 1; transform: rotate(180deg) scale(1.2);}
        }
      `}</style>
    </div>
  )
}

export default SuggestBinButton