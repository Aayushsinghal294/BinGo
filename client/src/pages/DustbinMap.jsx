import React, { useState, useEffect } from 'react'
import { MapPin as MapPinIcon, Heart as HeartIcon, Flag as FlagIcon, Trash2 as TrashIcon, User as UserIcon, Calendar as CalendarIcon, ArrowLeft as ArrowLeftIcon, Sparkles as SparklesIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../config/api'

const DustbinMap = () => {
  const navigate = useNavigate()
  const [dustbins, setDustbins] = useState([])
  const [selectedDustbin, setSelectedDustbin] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [showMyBins, setShowMyBins] = useState(false)


  useEffect(() => {
    const storedUserId = localStorage.getItem('binGoUserId')
    if (storedUserId) {
      setUserId(storedUserId)
    }
    getCurrentLocation()
    fetchDustbins()
  }, [])

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error getting location:', error)
        }
      )
    }
  }

const fetchDustbins = async () => {
  try {
    const API_BASE = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'
    console.log("Dustbin API URL:", `${API_BASE}('/api/dustbins`)

    const response = await fetch(apiUrl('/api/dustbins'))
    const text = await response.text()

    console.log("Dustbin response:", text.slice(0, 100))

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text}`)
    }

    const data = JSON.parse(text)
    setDustbins(data)
  } catch (error) {
    console.error('Error fetching dustbins:', error)
  }
  setLoading(false)
}

  const handleLike = async (dustbinId) => {
    try {
      const API_BASE = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'
      const response = await fetch(apiUrl(`/api/dustbins/${dustbinId}/like`), {
        method: 'POST'
      })
      if (response.ok) {
        const updatedDustbin = await response.json()
        setDustbins(dustbins.map(bin =>
          bin._id === dustbinId ? updatedDustbin : bin
        ))
        if (selectedDustbin && selectedDustbin._id === dustbinId) {
          setSelectedDustbin(updatedDustbin)
        }
      }
    } catch (error) {
      console.error('Error liking dustbin:', error)
    }
  }

  const handleReport = async (dustbinId) => {
    if (window.confirm('Are you sure you want to report this dustbin?')) {
      try {
        const API_BASE = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'
        const response = await fetch(apiUrl(`/api/dustbins/${dustbinId}/report`), {
          method: 'POST'
        })
        if (response.ok) {
          alert('Dustbin reported successfully')
          fetchDustbins()
        }
      } catch (error) {
        console.error('Error reporting dustbin:', error)
      }
    }
  }

  const handleDelete = async (dustbinId) => {
    if (window.confirm('Are you sure you want to delete this dustbin?')) {
      try {
        const API_BASE = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'
        const response = await fetch(apiUrl(`/api/dustbins/${dustbinId}`), {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId })
        })

        if (response.ok) {
          alert('Dustbin deleted successfully')
          setDustbins(dustbins.filter(bin => bin._id !== dustbinId))
          setSelectedDustbin(null)
        } else {
          const error = await response.json()
          alert('Error: ' + error.error)
        }
      } catch (error) {
        console.error('Error deleting dustbin:', error)
        alert('Failed to delete dustbin')
      }
    }
  }

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const filteredDustbins = showMyBins
    ? dustbins.filter(bin => bin.addedBy === userId)
    : dustbins

  const sortedDustbins = userLocation
    ? filteredDustbins.sort((a, b) => {
        const distA = calculateDistance(
          userLocation.lat, userLocation.lng,
          a.location.coordinates[1], a.location.coordinates[0]
        )
        const distB = calculateDistance(
          userLocation.lat, userLocation.lng,
          b.location.coordinates[1], b.location.coordinates[0]
        )
        return distA - distB
      })
    : filteredDustbins

  if (loading) {
    return (
      <div className="min-h-screen  bg-gradient-to-br from-green-900 via-black to-emerald-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-400 border-t-transparent mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping"></div>
          </div>
          <p className="text-green-200 text-lg font-medium animate-pulse">Loading dustbins...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br  from-green-900 via-black to-emerald-900 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute animate-float left-10 top-20 opacity-20">
          <SparklesIcon className="w-12 h-12 text-green-300" />
        </div>
        <div className="absolute animate-float-delayed right-20 top-1/3 opacity-15">
          <SparklesIcon className="w-16 h-16 text-yellow-200" />
        </div>
        <div className="absolute animate-float left-1/4 bottom-20 opacity-20">
          <SparklesIcon className="w-10 h-10 text-emerald-400" />
        </div>
        <div className="absolute animate-pulse right-10 bottom-10 opacity-10">
          <SparklesIcon className="w-20 h-20 text-green-200" />
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-green-800/80 to-emerald-700/80 backdrop-blur-md border-b border-green-400/20 shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-3 rounded-full bg-green-400/20 hover:bg-green-400/30 transition-all duration-300 hover:scale-110 group"
              >
                <ArrowLeftIcon className="w-6 h-6 text-green-300 group-hover:text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-green-100 flex items-center gap-2">
                  <MapPinIcon className="w-7 h-7 text-green-300" />
                  Dustbin Map
                </h1>
                <p className="text-green-200/80 text-sm mt-1">Discover eco-friendly spots nearby</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMyBins(!showMyBins)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                  showMyBins
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg'
                    : 'bg-white/10 text-green-200 hover:bg-white/20 border border-green-400/30'
                }`}
              >
                My Bins
              </button>
              <button
                onClick={() => navigate('/suggest-bin')}
                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-black rounded-full text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                + Add Bin
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-screen relative z-10">
        {/* Dustbin List */}
        <div className="w-1/3 bg-gradient-to-b from-green-800/40 to-emerald-800/40 backdrop-blur-sm border-r border-green-400/20 overflow-y-auto">
          <div className="p-4 border-b border-green-400/20">
            <h2 className="font-bold text-green-100 text-lg">
              {showMyBins ? 'My Dustbins' : 'All Dustbins'} ({sortedDustbins.length})
            </h2>
            {userLocation && (
              <p className="text-sm text-green-200/80 mt-1 flex items-center gap-1">
                <SparklesIcon className="w-4 h-4" />
                Sorted by distance from you
              </p>
            )}
          </div>

          <div className="divide-y divide-green-400/10">
            {sortedDustbins.map((dustbin, index) => {
              const distance = userLocation ? calculateDistance(
                userLocation.lat, userLocation.lng,
                dustbin.location.coordinates[1], dustbin.location.coordinates[0]
              ) : null

              return (
                <div
                  key={dustbin._id}
                  onClick={() => setSelectedDustbin(dustbin)}
                  className={`p-4 cursor-pointer transition-all duration-300 hover:bg-green-400/10 hover:scale-[1.02] transform animate-slide-in-left group ${
                    selectedDustbin?._id === dustbin._id ? 'bg-gradient-to-r from-green-400/20 to-emerald-400/20 border-r-4 border-green-400 shadow-lg' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <img
                        src={dustbin.image}
                        alt="Dustbin"
                        className="w-16 h-16 object-cover rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                      />
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{dustbin.likes}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-green-100 truncate group-hover:text-white transition-colors">
                        {dustbin.address}
                      </h3>
                      <p className="text-sm text-green-200/80 mt-1 flex items-center gap-1">
                        <MapPinIcon className="w-3 h-3" />
                        {distance ? `${distance.toFixed(1)} km away` : 'Distance unknown'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-green-300/80">
                        <span className="flex items-center gap-1">
                          <HeartIcon className="w-3 h-3 text-red-400" />
                          {dustbin.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          {dustbin.addedByName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {sortedDustbins.length === 0 && (
            <div className="p-8 text-center text-green-200/60 animate-fade-in">
              <div className="relative">
                <MapPinIcon className="w-20 h-20 mx-auto mb-4 text-green-300/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 border-2 border-green-300/20 rounded-full animate-ping"></div>
                </div>
              </div>
              <p className="text-lg mb-2 font-medium">
                {showMyBins ? 'No dustbins added by you yet' : 'No dustbins found'}
              </p>
              <p className="text-sm text-green-300/60">
                {showMyBins
                  ? 'Add your first dustbin to help the community!'
                  : 'Be the first to add a dustbin in your area!'
                }
              </p>
            </div>
          )}
        </div>

        {/* Map/Detail View */}
        <div className="flex-1 bg-gradient-to-br from-green-800/30 to-emerald-800/30 backdrop-blur-sm">
          {selectedDustbin ? (
            <div className="h-full overflow-y-auto">
              {/* Dustbin Image */}
              <div className="relative h-80 overflow-hidden">
                <img
                  src={selectedDustbin.image}
                  alt="Dustbin"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute top-6 right-6 flex gap-3">
                  <button
                    onClick={() => handleLike(selectedDustbin._id)}
                    className="p-3 bg-white/90 hover:bg-white rounded-full shadow-xl transition-all duration-300 hover:scale-110 group"
                  >
                    <HeartIcon className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
                  </button>
                  {selectedDustbin.addedBy !== userId && (
                    <button
                      onClick={() => handleReport(selectedDustbin._id)}
                      className="p-3 bg-white/90 hover:bg-white rounded-full shadow-xl transition-all duration-300 hover:scale-110 group"
                    >
                      <FlagIcon className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                  {selectedDustbin.addedBy === userId && (
                    <button
                      onClick={() => handleDelete(selectedDustbin._id)}
                      className="p-3 bg-white/90 hover:bg-white rounded-full shadow-xl transition-all duration-300 hover:scale-110 group"
                    >
                      <TrashIcon className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                </div>
                <div className="absolute bottom-6 left-6 text-white">
                  <h2 className="text-3xl font-bold mb-2 drop-shadow-lg">
                    Dustbin Location
                  </h2>
                  <p className="text-lg text-green-200 flex items-center gap-2">
                    <MapPinIcon className="w-5 h-5" />
                    {selectedDustbin.address}
                  </p>
                </div>
              </div>

              {/* Dustbin Details */}
              <div className="p-8 space-y-8">
                {selectedDustbin.description && (
                  <div className="bg-gradient-to-r from-green-700/30 to-emerald-700/30 p-6 rounded-2xl border border-green-400/20 backdrop-blur-sm">
                    <h3 className="font-bold text-green-100 mb-3 flex items-center gap-2">
                      <SparklesIcon className="w-5 h-5 text-green-300" />
                      Description
                    </h3>
                    <p className="text-green-200/90 leading-relaxed">{selectedDustbin.description}</p>
                  </div>
                )}

                {/* Animated Stats */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-red-400/20 to-pink-400/20 p-6 rounded-2xl shadow-xl border border-red-400/30 backdrop-blur-sm transform hover:scale-105 transition-all duration-300 animate-fade-in-up">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-red-400/20 rounded-full">
                        <HeartIcon className="w-6 h-6 text-red-300 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-2xl font-bold text-red-200 animate-count-up">{selectedDustbin.likes}</span>
                        <p className="text-sm text-red-100/80 mt-1">Likes</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-400/20 to-cyan-400/20 p-6 rounded-2xl shadow-xl border border-blue-400/30 backdrop-blur-sm transform hover:scale-105 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-400/20 rounded-full">
                        <UserIcon className="w-6 h-6 text-blue-300" />
                      </div>
                      <div>
                        <span className="text-lg font-bold text-blue-200 truncate block">{selectedDustbin.addedByName}</span>
                        <p className="text-sm text-blue-100/80 mt-1">Added by</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="bg-gradient-to-r from-green-700/30 to-emerald-700/30 p-6 rounded-2xl shadow-xl border border-green-400/20 backdrop-blur-sm">
                  <h3 className="font-bold text-green-100 mb-4 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-green-300" />
                    Additional Information
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                      <CalendarIcon className="w-5 h-5 text-green-300" />
                      <span className="text-green-200">
                        Added on {new Date(selectedDustbin.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                      <MapPinIcon className="w-5 h-5 text-green-300" />
                      <span className="text-green-200">
                        Coordinates: {selectedDustbin.location.coordinates[1].toFixed(6)}, {selectedDustbin.location.coordinates[0].toFixed(6)}
                      </span>
                    </div>
                    {userLocation && (
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <span className="w-5 h-5 text-center text-green-300">📏</span>
                        <span className="text-green-200">
                          {calculateDistance(
                            userLocation.lat, userLocation.lng,
                            selectedDustbin.location.coordinates[1], selectedDustbin.location.coordinates[0]
                          ).toFixed(2)} km from your location
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedDustbin.location.coordinates[1]},${selectedDustbin.location.coordinates[0]}`
                      window.open(url, '_blank')
                    }}
                    className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    Get Directions
                  </button>
                  <button
                    onClick={() => handleLike(selectedDustbin._id)}
                    className="px-8 py-4 bg-gradient-to-r from-green-700/50 to-emerald-700/50 hover:from-green-600/60 hover:to-emerald-600/60 text-green-100 font-bold rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2 border border-green-400/30"
                  >
                    <HeartIcon className="w-5 h-5" />
                    Like
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div className="animate-fade-in">
                <div className="relative mb-8">
                  <MapPinIcon className="w-24 h-24 mx-auto text-green-300/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 border-2 border-green-300/20 rounded-full animate-ping"></div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-green-100 mb-3">
                  Select a Dustbin
                </h3>
                <p className="text-green-200/80 mb-8 max-w-md">
                  Choose a dustbin from the list to view details, get directions, and help keep your city clean and green.
                </p>
                <button
                  onClick={() => navigate('/suggest-bin')}
                  className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-black font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Add New Dustbin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes float-delayed { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
        @keyframes slide-in-left { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes count-up { from { transform: scale(0.8); } to { transform: scale(1); } }
        
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 4s ease-in-out infinite; }
        .animate-slide-in-left { animation: slide-in-left 0.5s ease-out both; }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }
        .animate-fade-in-up { animation: fade-in-up 0.7s ease-out both; }
        .animate-count-up { animation: count-up 0.5s ease-out; }
      `}</style>
    </div>
  )
}

export default DustbinMap