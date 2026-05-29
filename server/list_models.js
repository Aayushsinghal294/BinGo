import dotenv from "dotenv"
dotenv.config()

const API_KEY = process.env.GOOGLE_API_KEY

async function listModels() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
  )

  const data = await res.json()

  if (!res.ok) {
    console.error(data)
    return
  }

  data.models.forEach(model => {
    if (model.supportedGenerationMethods?.includes("generateContent")) {
      console.log(model.name)
    }
  })
}

listModels()