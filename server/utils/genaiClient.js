const DEFAULT_RETRIES = 3
const BASE_BACKOFF_MS = 400
const CIRCUIT_FAILURE_THRESHOLD = 3
const CIRCUIT_COOLDOWN_MS = 30 * 1000

const modelCircuit = new Map()

function isCircuitOpen(modelName) {
  const s = modelCircuit.get(modelName)
  if (!s) return false
  if (s.openUntil && Date.now() < s.openUntil) return true
  return false
}

function recordFailure(modelName) {
  const s = modelCircuit.get(modelName) || { failures: 0, openUntil: null }
  s.failures = (s.failures || 0) + 1
  if (s.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    s.openUntil = Date.now() + CIRCUIT_COOLDOWN_MS
  }
  modelCircuit.set(modelName, s)
}

function recordSuccess(modelName) {
  modelCircuit.set(modelName, { failures: 0, openUntil: null })
}

async function callModel(genAI, modelName, inputs) {
  const model = genAI.getGenerativeModel({ model: modelName })
  return await model.generateContent(inputs)
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function generateWithFallback(genAI, candidateModels, inputs, opts = {}) {
  const retries = opts.retries ?? DEFAULT_RETRIES

  const errors = []

  for (const modelName of candidateModels) {
    if (isCircuitOpen(modelName)) {
      errors.push(new Error(`circuit_open:${modelName}`))
      continue
    }

    let attempt = 0
    while (attempt < retries) {
      try {
        const result = await callModel(genAI, modelName, inputs)
        recordSuccess(modelName)
        return { result, modelName }
      } catch (err) {
        attempt += 1
        errors.push(err)

        // For transient failures, wait and retry; otherwise break
        const transient = err && err.status && (err.status === 429 || err.status >= 500)
        recordFailure(modelName)
        if (!transient || attempt >= retries) break

        const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt - 1)
        await sleep(backoff)
      }
    }
  }

  const agg = new Error('All models failed')
  agg.inner = errors
  throw agg
}

export { generateWithFallback, isCircuitOpen }
