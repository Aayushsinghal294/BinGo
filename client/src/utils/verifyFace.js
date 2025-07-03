import axios from "axios"

const FLASK_API_URL = import.meta.env.BACKEND_URL || 'http://127.0.0.1:5000'

export const verifyFace = async (profileImageUrl, proofFile) => {
  try {
    // 1. Fetch profileImageUrl as Blob
    const response = await fetch(profileImageUrl, { mode: 'cors' })
    if (!response.ok) {
      throw new Error(`Failed to fetch profile image: status ${response.status}`)
    }
    const blob = await response.blob()

    // 2. Create a File object from the Blob.
    let ext = ""
    const contentType = blob.type
    if (contentType) {
      const parts = contentType.split("/")
      if (parts.length === 2) {
        const subtype = parts[1].split("+")[0]
        ext = "." + subtype
      }
    }
    const profileFileName = "profile" + (ext || ".jpg")
    const profileFile = new File([blob], profileFileName, { type: blob.type })

    // 3. Build FormData with two files: image1 and image2
    const formData = new FormData()
    formData.append("image1", profileFile)
    formData.append("image2", proofFile)

    // 4. POST to backend
    const res = await axios.post(`${FLASK_API_URL}/verify`, formData, {
      timeout: 60000,
    })
    return res.data
  } catch (err) {
    if (err.response) {
      return {
        error: err.response.data?.error || "Server error",
        status: err.response.status,
      }
    } else {
      return {
        error: err.message || "Request failed",
      }
    }
  }
}