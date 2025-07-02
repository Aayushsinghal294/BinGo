import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
base: './', // ← ADD THIS LINE for S3 deployment
plugins: [tailwindcss(), react()],
server: {
proxy: {
'/api': 'http://localhost:4000'
}
}
})