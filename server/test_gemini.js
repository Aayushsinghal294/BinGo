import dotenv from "dotenv"
dotenv.config()

import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent("Say hello")
    console.log(result.response.text())
  } catch (err) {
    console.error("FULL ERROR:", err)
    console.error("MESSAGE:", err.message)
    console.error("STATUS:", err.status)
  }
}

test()