export const API_BASE_URL =
  (import.meta.env.VITE_SERVER_URL || "https://bingo-server-gjtv.onrender.com").replace(/\/$/, "")

export const apiUrl = (path) => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`
  return `${API_BASE_URL}${cleanPath}`
}