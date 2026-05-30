import React, { useState, useEffect, useRef } from 'react'
import { MapPin as MapPinIcon, Camera as CameraIcon, CheckCircle as CheckCircleIcon, XCircle as XCircleIcon, ArrowLeft as ArrowLeftIcon, Sparkles as SparklesIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../config/api'

const SuggestBin = () => {
  const navigate = useNavigate()
  const [location, setLocation] = useState(null)
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    let storedUserId = localStorage.getItem('binGoUserId')
    let storedUserName = localStorage.getItem('binGoUserName')
    if (!storedUserId) {
      storedUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('binGoUserId', storedUserId)
    }
    setUserId(storedUserId)
    setUserName(storedUserName || 'Anonymous')
  }, [])

  const getCurrentLocation = () => {
    setLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          setLocation({ lat: latitude, lng: longitude })
          try {
            const response = await fetch(
              `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=YOUR_OPENCAGE_API_KEY`
            )
            const data = await response.json()
            if (data.results && data.results[0]) {
              setAddress(data.results[0].formatted)
            }
          } catch (error) {
            setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
          }
          setLoading(false)
        },
        (error) => {
          alert('Unable to get your location. Please enable location services.')
          setLoading(false)
        }
      )
    } else {
      alert('Geolocation is not supported by this browser.')
      setLoading(false)
    }
  }

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB')
        return
      }
      setImage(file)
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!location) {
      alert('Please get your current location first')
      return
    }
    if (!image) {
      alert('Please upload an image of the dustbin')
      return
    }
    if (!address.trim()) {
      alert('Address is required')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('lat', location.lat)
      formData.append('lng', location.lng)
      formData.append('address', address)
      formData.append('description', description)
      formData.append('addedBy', userId)
      formData.append('addedByName', userName)
      formData.append('image', image)
      const response = await fetch(apiUrl('/api/dustbins'), {
        method: 'POST',
        body: formData
      })
      if (response.ok) {
        alert('Dustbin added successfully! Thank you for contributing.')
        navigate('/map')
      } else {
        const error = await response.json()
        alert('Error: ' + error.error)
      }
    } catch (error) {
      alert('Failed to add dustbin. Please try again.')
    }
    setLoading(false)
  }

  const handleNameChange = (name) => {
    setUserName(name)
    localStorage.setItem('binGoUserName', name)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-black to-emerald-900 py-8 px-4 text-white relative overflow-hidden">
      {/* Animated Sparkles */}
      <div className="absolute inset-0 pointer-events-none z-0">
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
      <div className="max-w-lg mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-3 rounded-full bg-green-400/20 hover:bg-green-400/30 transition-all duration-300 hover:scale-110 group"
          >
            <ArrowLeftIcon className="w-6 h-6 text-green-300 group-hover:text-white" />
          </button>
          <h1 className="text-3xl font-bold text-green-100 flex items-center gap-2">
            <SparklesIcon className="w-7 h-7 text-green-300 animate-pulse" />
            Suggest New Dustbin
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 bg-gradient-to-br from-green-800/60 to-emerald-800/60 p-8 rounded-2xl shadow-2xl border border-green-400/20 backdrop-blur-md animate-fade-in">
          {/* User Name */}
          <div>
            <label className="block text-sm font-semibold text-green-200 mb-2">
              Your Name (Optional)
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full p-3 bg-white/10 border border-green-400/30 rounded-lg text-white placeholder-green-200/60 focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-300"
              placeholder="Enter your name"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-green-200 mb-2">
              Location
            </label>
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={loading}
              className={`w-full p-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl ${location ? 'ring-2 ring-green-400' : ''}`}
            >
              <MapPinIcon className="w-5 h-5" />
              {loading ? 'Getting Location...' : location ? 'Location Captured' : 'Get Current Location'}
              {location && <CheckCircleIcon className="w-5 h-5 text-green-300 animate-pulse" />}
            </button>
            {location && (
              <p className="mt-2 text-sm text-green-200 flex items-center gap-2 animate-fade-in">
                <MapPinIcon className="w-4 h-4 text-green-300" />
                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-green-200 mb-2">
              Address <span className="text-yellow-300">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className="w-full p-3 bg-white/10 border border-green-400/30 rounded-lg text-white placeholder-green-200/60 focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-300"
              placeholder="Enter or confirm the address"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-green-200 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-3 bg-white/10 border border-green-400/30 rounded-lg text-white placeholder-green-200/60 focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-300"
              placeholder="Any additional details about the dustbin location..."
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-green-200 mb-2">
              Dustbin Photo <span className="text-yellow-300">*</span>
            </label>
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 border-2 border-dashed border-green-400/30 rounded-lg hover:border-yellow-400 transition-all duration-300 flex flex-col items-center gap-2 bg-white/5 hover:bg-white/10"
              >
                <CameraIcon className="w-8 h-8 text-green-300 animate-bounce" />
                <span className="text-green-200">
                  {image ? 'Change Photo' : 'Take/Upload Photo'}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                capture="environment"
              />
              {imagePreview && (
                <div className="relative animate-fade-in-up">
                  <img
                    src={imagePreview}
                    alt="Dustbin preview"
                    className="w-full h-48 object-cover rounded-xl shadow-lg border-2 border-green-400/30"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null)
                      setImagePreview(null)
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                  >
                    <XCircleIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !location || !image}
            className="w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 disabled:bg-gray-400 text-black font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <SparklesIcon className="w-5 h-5 animate-pulse" />
            {loading ? 'Adding Dustbin...' : 'Add Dustbin'}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-400/10 to-cyan-400/10 rounded-2xl border border-blue-400/20 shadow-lg animate-fade-in-up">
          <h3 className="font-semibold text-blue-200 mb-2 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-blue-300 animate-float" />
            <span>📝 Guidelines:</span>
          </h3>
          <ul className="text-sm text-blue-100 space-y-1 list-disc pl-5">
            <li>Make sure the dustbin is clearly visible in the photo</li>
            <li>Provide accurate location information</li>
            <li>Only add legitimate dustbins that others can use</li>
            <li>You can delete your own submissions later if needed</li>
          </ul>
        </div>
      </div>
      {/* Animations */}
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes float-delayed { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 4s ease-in-out infinite; }
        .animate-fade-in { animation: fade-in 0.7s ease-out; }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out both; }
      `}</style>
    </div>
  )
}

export default SuggestBin