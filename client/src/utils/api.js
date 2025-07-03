import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.AI_BACKEND_URL || 'http://localhost:5000/api'
});

// If you store token in localStorage:
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
