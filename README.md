
# ♻️ BinGo – AI-Powered Waste Disposal Verification & Gamification App

BinGo is a smart waste management platform that leverages AI, gamification, and geospatial data to encourage responsible civic behavior. Users earn rewards for verified waste disposal, locate nearby public dustbins, and compete in local eco-challenges.

## 🚀 Features

- 📸 **AI-Powered Proof Verification**  
  Users upload a "live" image of themselves disposing waste. AI verifies the action to prevent fraud or abuse.

- 🧩 **Gamified Civic Engagement**  
  Users earn points and badges, climb leaderboards, and unlock rewards based on participation and consistency.

- 🗺️ **Crowdsourced Dustbin Mapping**  
  Public dustbins are geotagged and displayed using a map-based UI for easy navigation.

- 🎁 **Reward System Integration**  
  Redeem points for rewards sponsored by local businesses or municipal programs.
## 🛠️ Tech Stack

### 🌐 Frontend
- **Framework**: React.js (Vite-based setup)
- **State Management**: Redux Toolkit
- **Routing**: React Router
- **Map & Geolocation**:  Leaflet with OpenStreetMap API
- **Media Capture**: HTML5 camera/file input + CropperJS

### ⚙️ Backend
- **Server Framework**: Node.js with Express.js
- **Database**: MongoDB (Atlas)
- **Authentication**: Clerk 
- **AI Integration**: Python Flask microservice (Face verification, activity detection using DeepFace)
- **Storage**: Cloudinary

### 🤖 AI Module (Microservice)
- **Framework**: Flask (Python)
- **Face Verification**: DeepFace 
- **Image Tampering/Activity Detection**: OpenCV, Image hashing, or TensorFlow
- **Security**: CORS, API key-based access between Node & Flask

---

## 📱 Core User Flow

1. **User Registration/Login**  
   via Clerk/Firebase → Profile created with face image stored.

2. **Capture or Upload Proof**  
   Using web camera → Image sent to backend → Forwarded to AI Flask API.

3. **AI Verification**  
   - Compares current photo with user profile image.
   - Checks for dustbin presence (optional using object detection).
   - Returns `verified/unverified` flag.

4. **Reward Allocation**  
   If verified, user gets points + timestamp & location stored in DB.

5. **Leaderboard + Map View**  
   Users can see public leaderboard and navigate to nearby bins.

**code visualization-**
<img width="5664" height="1212" alt="diagram (3)" src="https://github.com/user-attachments/assets/748eaa75-f410-4aee-8e92-d252bf3f2167" />

## 🧪 Future Enhancements

- NFC/bin QR scanning for ultra-accurate bin verification
- Object detection to verify actual garbage being thrown
- Real-time bin fill status (with smart sensors)
- Rewards marketplace with sponsors
- Offline submission sync

## 👥 Contributors

- **Aayush Singhal** - Full Stack Developer & AI Integration - https://github.com/Aayushsinghal294
- **Mayank Jain** – Full Stack Developer & AI Integration -  https://github.com/Mayankjain2624
- **Manbir Singh** - Full Stack Developer & AI Integration - https://github.com/ManbirS07

---
## 🙌 Support

If you like this project, leave a ⭐ on GitHub
