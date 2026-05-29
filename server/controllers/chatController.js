import Chat from '../models/Chat.js'
import { generateWithFallback } from '../utils/genaiClient.js'

const SYSTEM_PROMPT = `You are BinGo Assistant, a helpful AI assistant specialized in waste management and environmental topics. You can:

1. Answer questions about waste management, recycling, and environmental practices
2. Help identify if items are biodegradable or not
3. Provide tips on sustainable living and waste reduction
4. Give advice on proper disposal methods for different types of waste
5. Suggest eco-friendly alternatives to common products
6. Explain composting and recycling processes
7. Provide information about environmental impact of different materials

Be friendly, informative, and environmentally conscious in your responses. Keep your answers concise but helpful. Always encourage sustainable practices and environmental responsibility.`

const CHAT_MODEL_CANDIDATES = [
  process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash'
].filter(Boolean)

const getChatModel = (genAI) => {
  const errors = []

  for (const modelName of CHAT_MODEL_CANDIDATES) {
    try {
      return { model: genAI.getGenerativeModel({ model: modelName }), modelName }
    } catch (error) {
      errors.push(`${modelName}: ${error.message}`)
    }
  }

  const message = errors.length
    ? `No supported Gemini model could be loaded. Tried: ${errors.join(' | ')}`
    : 'No Gemini model names were configured'

  throw new Error(message)
}

const buildFallbackReply = (message) => {
  const text = message.toLowerCase()

  if (text.includes('biodegradable') || text.includes('organic') || text.includes('compost')) {
    return 'This looks like a biodegradable or compostable item if it is food waste, leaves, paper napkins, or untreated plant matter. Keep it separate from plastics and metals.'
  }

  if (text.includes('plastic') || text.includes('bottle') || text.includes('wrapper')) {
    return 'Most clean plastic bottles and rigid containers can be recycled where your local system accepts them. Rinse them first and check the recycling code.'
  }

  if (text.includes('glass') || text.includes('metal')) {
    return 'Glass and metal are usually recyclable if they are clean and empty. Avoid mixing them with food-contaminated waste.'
  }

  return 'I could not reach Gemini just now, so here is a quick BinGo fallback: separate wet waste, dry recyclables, and hazardous waste. If you want, send an item name or image and I will help classify it.'
}

export const handleChat = (genAI) => async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    let chat = await Chat.findOne({ sessionId })
    if (!chat) {
      chat = new Chat({
        sessionId,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }]
      })
    }

    chat.messages.push({ role: 'user', content: message })

    const modelCandidates = CHAT_MODEL_CANDIDATES

    const recentMessages = chat.messages.slice(-10)
    let conversationHistory = SYSTEM_PROMPT + "\n\nConversation history:\n"
    recentMessages.forEach(msg => {
      if (msg.role !== 'system') {
        conversationHistory += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`
      }
    })
    conversationHistory += `\nPlease respond to the user's latest message: "${message}"`

    let assistantReply = null
    let generationError = null
    let usedModel = null

    try {
      const { result, modelName } = await generateWithFallback(genAI, modelCandidates, conversationHistory)
      usedModel = modelName
      assistantReply = result.response.text()
    } catch (error) {
      generationError = error
      console.error('All Gemini generation attempts failed:', error)
      assistantReply = buildFallbackReply(message)
    }

    chat.messages.push({ role: 'model', content: assistantReply })
    await chat.save()

    res.json({ reply: assistantReply, model: usedModel, fallback: Boolean(generationError) })
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({
      error: 'Sorry, I encountered an error. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params
    const chat = await Chat.findOne({ sessionId })
    if (!chat) {
      return res.json({ messages: [] })
    }
    const userMessages = chat.messages.filter(msg => msg.role !== 'system')
    res.json({ messages: userMessages })
  } catch (error) {
    console.error('Get chat history error:', error)
    res.status(500).json({ error: 'Failed to retrieve chat history' })
  }
}

export const clearChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params
    await Chat.deleteOne({ sessionId })
    res.json({ message: 'Chat history cleared successfully' })
  } catch (error) {
    console.error('Clear chat history error:', error)
    res.status(500).json({ error: 'Failed to clear chat history' })
  }
}