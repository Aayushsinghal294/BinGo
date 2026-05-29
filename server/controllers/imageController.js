import Chat from '../models/Chat.js'
import { generateWithFallback } from '../utils/genaiClient.js'

const SYSTEM_PROMPT = `You are BinGo Assistant, a helpful AI assistant specialized in waste management and environmental topics. ...` // (same as above)

const IMAGE_MODEL_CANDIDATES = [
  process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash'
].filter(Boolean)

const getImageModel = (genAI) => {
  const errors = []

  for (const modelName of IMAGE_MODEL_CANDIDATES) {
    try {
      return { model: genAI.getGenerativeModel({ model: modelName }), modelName }
    } catch (error) {
      errors.push(`${modelName}: ${error.message}`)
    }
  }

  const message = errors.length
    ? `No supported Gemini model could be loaded for image analysis. Tried: ${errors.join(' | ')}`
    : 'No Gemini model names were configured for image analysis'

  throw new Error(message)
}

export const handleImageAnalysis = (genAI) => async (req, res) => {
  try {
    const { imageBase64, sessionId = 'default' } = req.body

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' })
    }

    const modelCandidates = IMAGE_MODEL_CANDIDATES

    const prompt = `Analyze this waste item image and provide a detailed response covering:

1. **Item Identification**: What specific type of waste/item this is
2. **Biodegradability**: Is it biodegradable or non-biodegradable? Explain why.
3. **Disposal Method**: How should this item be properly disposed of?
4. **Recycling Options**: Can it be recycled? If yes, how and where?
5. **Environmental Impact**: Brief note on its environmental impact
6. **Eco-friendly Alternatives**: Suggest sustainable alternatives if applicable

Please be concise but informative, and focus on practical waste management advice.`

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg"
      }
    }

    let analysis = null
    let generationError = null
    let usedModel = null

    try {
      const { result, modelName } = await generateWithFallback(genAI, modelCandidates, [prompt, imagePart])
      usedModel = modelName
      analysis = result.response.text()
    } catch (error) {
      generationError = error
      console.warn('All Gemini image generation attempts failed:', error && error.message)
      analysis = 'I could not reach Gemini for image analysis right now. Please try again, or upload a clearer image of the item.'
    }

    let chat = await Chat.findOne({ sessionId })
    if (!chat) {
      chat = new Chat({
        sessionId,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }]
      })
    }

    chat.messages.push(
      { role: 'user', content: '[Image uploaded for waste analysis]' },
      { role: 'model', content: analysis }
    )
    await chat.save()

    res.json({ analysis, model: usedModel, fallback: Boolean(generationError) })
  } catch (error) {
    console.error('Image analysis error:', error)
    res.status(500).json({
      error: 'Sorry, I couldn\'t analyze the image. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}