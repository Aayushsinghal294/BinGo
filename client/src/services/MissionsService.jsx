const SERVER_URL = import.meta.env.VITE_SERVER_URL
const API_URL = `${SERVER_URL}/api/missions`
export const fetchMissions = async () => {
  const res = await fetch(`${API_URL}/missions`)
  return res.json()
}

export const fetchUserMissions = async (userId) => {
  const res = await fetch(`${API_URL}/user-missions/${userId}`)
  return res.json()
}

export const joinMission = async (missionId, userId) => {
  await fetch(`${API_URL}/join-mission`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ missionId, userId })
  })
}

export const completeMission = async (missionId, userId, proofUrl) => {
  await fetch(`${API_URL}/complete/${userId}/${missionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ missionId, userId, proofUrl })
  })
}