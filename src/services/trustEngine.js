// =============================================
// TRUST VERIFICATION ENGINE — 6 Layer Check
// =============================================

export const runTrustVerification = async (imageFile, deviceGps) => {
  const results = {
    liveCapture: true, // We enforce this via camera constraints
    exifTimestampMatch: false,
    exifGpsMatch: false,
    aiImageDetected: false,
    corroboratingReports: 0,
    trustScore: 40,
    passed: false,
    flags: [],
  }

  // Layer 1: Live capture (enforced by camera constraints in UI)
  results.liveCapture = true

  // Layer 2: EXIF timestamp check (within 2 minutes)
  const fileAge = (Date.now() - imageFile.lastModified) / 1000 / 60
  results.exifTimestampMatch = fileAge <= 2
  if (!results.exifTimestampMatch) {
    results.flags.push('Photo taken more than 2 minutes ago')
  }

  // Layer 3: EXIF GPS vs Device GPS (simulated)
  // In production, use exifr library to extract GPS from EXIF
  results.exifGpsMatch = true // Mock: assume match for demo

  // Layer 4: AI-generated detection — handled by Gemini response
  results.aiImageDetected = false // Set by Gemini analyzeImage()

  // Layer 5: Corroborating reports from nearby (mock)
  results.corroboratingReports = Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0

  // Calculate trust score
  let score = 40
  if (results.liveCapture) score += 15
  if (results.exifTimestampMatch) score += 15
  if (results.exifGpsMatch) score += 10
  if (!results.aiImageDetected) score += 10
  if (results.corroboratingReports > 0) score += Math.min(results.corroboratingReports * 5, 15)

  results.trustScore = Math.min(score, 100)
  results.passed = results.trustScore >= 50 && !results.aiImageDetected

  return results
}

export const getRoleTrustScore = (role) => {
  const scores = {
    captain: 95,
    manager: 88,
    citizen: null, // calculated dynamically
  }
  return scores[role] || 40
}

export const getTrustLabel = (score) => {
  if (score >= 85) return { label: 'Verified Source', color: '#00ff88' }
  if (score >= 70) return { label: 'High Trust', color: '#00d4ff' }
  if (score >= 50) return { label: 'Moderate Trust', color: '#ffb800' }
  return { label: 'Low Trust — Review Required', color: '#ff4444' }
}
