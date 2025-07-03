import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dotenv from 'dotenv'
dotenv.config()
const SERVER_URL =process.env.VITE_SERVER_URL
export default defineConfig({
base: './', // ← ADD THIS LINE for S3 deployment
plugins: [tailwindcss(), react()],
server: {
proxy: {
'/api': `${SERVER_URL}`,
}
}
})