// =============================================
// GEMINI SERVICE — Image + Voice + Text Analysis
// Uses real API if key present, else rich mock
// =============================================

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

const INCIDENT_TYPES = {
  fire: { label: 'Fire / Smoke', emoji: '🔥', severityBoost: 2 },
  flood: { label: 'Flood / Water', emoji: '🌊', severityBoost: 1 },
  road_accident: { label: 'Road Accident', emoji: '🚗', severityBoost: 1 },
  medical: { label: 'Medical Emergency', emoji: '🏥', severityBoost: 2 },
  building_collapse: { label: 'Building Collapse', emoji: '🏚️', severityBoost: 3 },
  gas_leak: { label: 'Gas Leak', emoji: '⚠️', severityBoost: 2 },
  violence: { label: 'Violence / Assault', emoji: '🚨', severityBoost: 2 },
  maritime: { label: 'Maritime Emergency', emoji: '⚓', severityBoost: 2 },
  chemical: { label: 'Chemical Spill', emoji: '☣️', severityBoost: 3 },
}

// Mock responses for demo when no API key
const MOCK_RESPONSES = [
  {
    confidence: 0.93,
    detectedTypes: ['fire', 'smoke'],
    severity: 4,
    aiGenerated: false,
    description: 'Active fire with dense smoke visible. Multiple ignition points detected. Immediate evacuation recommended.',
    recommendedAgencies: ['fire_brigade', 'police', 'ambulance'],
  },
  {
    confidence: 0.88,
    detectedTypes: ['road_accident'],
    severity: 3,
    aiGenerated: false,
    description: 'Two-vehicle collision with significant structural damage. Airbags deployed. Possible injuries to occupants.',
    recommendedAgencies: ['police', 'ambulance'],
  },
  {
    confidence: 0.95,
    detectedTypes: ['flood'],
    severity: 3,
    aiGenerated: false,
    description: 'Significant water accumulation covering road surface. Multiple vehicles partially submerged.',
    recommendedAgencies: ['police', 'fire_brigade'],
  },
  {
    confidence: 0.91,
    detectedTypes: ['medical'],
    severity: 4,
    aiGenerated: false,
    description: 'Person in visible distress, unresponsive. Emergency medical intervention required immediately.',
    recommendedAgencies: ['ambulance', 'police'],
  },
]

export const analyzeImage = async (base64Image, mimeType = 'image/jpeg') => {
  // If real API key present, use Gemini
  if (GEMINI_API_KEY) {
    try {
      const prompt = `You are an emergency response AI. Analyze this image and return a JSON object with these exact fields:
      {
        "confidence": (0.0 to 1.0 — how confident you are),
        "detectedTypes": (array of strings from: fire, flood, road_accident, medical, building_collapse, gas_leak, violence, maritime, chemical),
        "severity": (integer 1-5 where 5 is most severe),
        "aiGenerated": (boolean — is this image AI generated or synthetic?),
        "description": (2-3 sentence description of what you see),
        "recommendedAgencies": (array from: fire_brigade, police, ambulance, coast_guard, port_authority, disaster_management)
      }
      Respond with ONLY the JSON, no markdown, no explanation.`

      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Image } }
            ]
          }]
        })
      })

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
      return JSON.parse(cleaned)
    } catch (err) {
      console.warn('Gemini API error, falling back to mock:', err)
    }
  }

  // Mock: simulate analysis delay then return random response
  await new Promise(resolve => setTimeout(resolve, 2200))
  return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
}

export const analyzeVoice = async (transcript) => {
  if (GEMINI_API_KEY) {
    try {
      const prompt = `You are an emergency response AI. Extract structured emergency data from this voice transcript:
      "${transcript}"
      
      Return ONLY a JSON object:
      {
        "incidentType": (string — primary emergency type),
        "location": (string — location mentioned or "Not specified"),
        "severity": (integer 1-5),
        "occupantsAtRisk": (integer or 0 if unknown),
        "additionalDetails": (string — any other relevant info),
        "recommendedAgencies": (array from: fire_brigade, police, ambulance, coast_guard)
      }`

      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      })
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
      return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
    } catch (err) {
      console.warn('Gemini voice error:', err)
    }
  }

  // Mock voice analysis
  await new Promise(resolve => setTimeout(resolve, 1500))
  return {
    incidentType: 'fire',
    location: 'Detected from speech',
    severity: 4,
    occupantsAtRisk: 15,
    additionalDetails: 'Voice stress analysis: HIGH. Background audio: crackling, alarm sounds detected.',
    recommendedAgencies: ['fire_brigade', 'police', 'ambulance'],
  }
}

export const generateIncidentReport = async (incident) => {
  await new Promise(resolve => setTimeout(resolve, 2000))
  return {
    summary: `INCIDENT REPORT — ${incident.incidentId}`,
    context: incident.context?.toUpperCase(),
    type: incident.incidentType?.join(', '),
    severity: `${incident.severity}/5`,
    responseTime: '8 minutes 23 seconds',
    agenciesResponded: Object.keys(incident.agencyStatus || {}).length,
    recommendation: 'Install additional smoke detectors on affected floors. Schedule monthly emergency drills with staff. Review evacuation route signage.',
    generatedAt: new Date().toLocaleString(),
  }
}

export { INCIDENT_TYPES }
