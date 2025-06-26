import React, { useRef, useState, useEffect, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Camera, Upload, RotateCcw, Check, X, Maximize2, Minimize2 } from 'lucide-react'

const videoConstraints = {
  width: 320,
  height: 320,
  facingMode: "user"
}

const ProfilePopup = ({ isOpen, onClose, onSave, userImage }) => {
  const webcamRef = useRef(null)
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const [imgSrc, setImgSrc] = useState(null)
  const [error, setError] = useState(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [uploadMethod, setUploadMethod] = useState('webcam') // 'webcam' or 'file'
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (userImage) setImgSrc(userImage)
  }, [userImage])

  useEffect(() => {
    let interval
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1)
      }, 1000)
    } else if (countdown === 0 && isCapturing) {
      capture()
    }
    return () => clearInterval(interval)
  }, [countdown, isCapturing])

  const startCountdown = () => {
    setCountdown(3)
    setIsCapturing(true)
  }

  const capture = useCallback(() => {
    try {
      const imageSrc = webcamRef.current.getScreenshot()
      setImgSrc(imageSrc)
      setError(null)
      setIsCapturing(false)
      setCountdown(0)
    } catch (e) {
      setError("Unable to access webcam.")
      setIsCapturing(false)
      setCountdown(0)
    }
  }, [])

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB")
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        setImgSrc(e.target.result)
        setError(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const applyFilters = () => {
    if (!imgSrc || !canvasRef.current) return imgSrc

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new window.Image()

    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height

        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`
        ctx.save()
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((rotation * Math.PI) / 180)
        ctx.scale(zoom, zoom)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        ctx.restore()
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      }
      img.src = imgSrc
    })
  }

  const handleSave = async () => {
    if (imgSrc) {
      const processedImage = await applyFilters()
      onSave(processedImage || imgSrc)
      onClose()
    }
  }


  const resetImage = () => {
    setImgSrc(null)
    setZoom(1)
    setRotation(0)
    setBrightness(100)
    setContrast(100)
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-emerald-900/90 via-blue-900/90 to-yellow-900/90 backdrop-blur-sm p-4">
      <div className={`relative bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900 rounded-2xl p-8 shadow-3xl ${isFullscreen ? 'w-full h-full max-w-none' : 'w-full max-w-xs'} flex flex-col items-center border-2 border-emerald-400/30 backdrop-blur-xl overflow-hidden transition-all duration-500`}>
        {/* Animated background glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 animate-pulse pointer-events-none" />
        {/* Header */}
        <div className="flex items-center justify-between w-full mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-xl">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-blue-200 to-yellow-200 drop-shadow-lg">
              Profile Photo
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-gray-400" /> : <Maximize2 className="w-4 h-4 text-gray-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/50 hover:bg-red-500/20 transition-colors group"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-400 group-hover:text-red-400" />
            </button>
          </div>
        </div>
        {/* Upload Method Toggle */}
        <div className="flex bg-slate-800/50 rounded-xl p-1 mb-6 relative z-10">
          <button
            onClick={() => setUploadMethod('webcam')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${uploadMethod === 'webcam' ? 'bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            <Camera className="w-4 h-4" />
            Camera
          </button>
          <button
            onClick={() => setUploadMethod('file')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${uploadMethod === 'file' ? 'bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>
        {/* Countdown overlay */}
        {countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-2xl z-50">
            <div className="text-6xl font-bold text-white animate-pulse">
              {countdown}
            </div>
          </div>
        )}
        {/* Main content */}
        <div className="w-full flex-1 flex flex-col items-center relative z-10">
          {!imgSrc ? (
            uploadMethod === 'webcam' ? (
              <>
                <div className="relative rounded-full border-4 border-emerald-400 shadow-xl mb-4 bg-white/10 p-1 animate-in slide-in-from-top-4 duration-300 z-10">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    className="rounded-full w-40 h-40 object-cover border-2 border-emerald-300/40 shadow-lg"
                  />
                </div>
                <div className="flex gap-3 w-full max-w-xs">
                  <button
                    onClick={startCountdown}
                    disabled={isCapturing}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg hover:from-emerald-400 hover:to-blue-400 transition-all duration-300 disabled:opacity-50"
                  >
                    <Camera className="w-5 h-5" />
                    {isCapturing ? 'Capturing...' : 'Take Photo'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  className="w-40 h-40 border-2 border-dashed border-emerald-400/50 rounded-full flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition-colors mb-4 bg-slate-800/30"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-10 h-10 text-emerald-400 mb-2" />
                  <p className="text-gray-300 text-center">
                    Click to upload<br />
                    <span className="text-xs text-gray-500">Max 5MB</span>
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </>
            )
          ) : (
            <>
              {/* Image preview with controls */}
              <div className="relative mb-6">
                <div className="relative overflow-hidden rounded-full border-4 border-emerald-400 shadow-lg">
                  <img
                    src={imgSrc}
                    alt="Profile preview"
                    className="w-32 h-32 object-cover"
                    style={{
                      transform: `rotate(${rotation}deg) scale(${zoom})`,
                      filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                      transition: 'all 0.3s ease'
                    }}
                  />
                </div>
              </div>
              {/* Image controls */}
              <div className="w-full max-w-xs space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Zoom</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-24 accent-emerald-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Rotation</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="w-24 accent-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Brightness</span>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-24 accent-yellow-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Contrast</span>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-24 accent-pink-500"
                  />
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex gap-3 w-full max-w-xs">
                <button
                  onClick={resetImage}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-700/50 text-gray-300 hover:bg-slate-600/50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake
                </button>
              
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg hover:from-emerald-400 hover:to-blue-400 transition-all duration-300"
                >
                  <Check className="w-4 h-4" />
                  Save
                </button>
              </div>
            </>
          )}
        </div>
        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm text-center relative z-10">
            {error}
          </div>
        )}
        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}

export default ProfilePopup