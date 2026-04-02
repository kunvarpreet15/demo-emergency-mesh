// =============================================
// DISPATCH SERVICE — WhatsApp + SMS + Voice
// Simulated in demo, real via Twilio in prod
// =============================================

const AGENCY_CONTACTS = {
  fire_brigade: { name: 'Fire Brigade', emoji: '🚒', phone: '+911012345678', whatsapp: '+911012345678' },
  police: { name: 'Police', emoji: '🚔', phone: '+911001234567', whatsapp: '+911001234567' },
  ambulance: { name: 'Ambulance (108)', emoji: '🚑', phone: '+911081234567', whatsapp: '+911081234567' },
  coast_guard: { name: 'Coast Guard', emoji: '⚓', phone: '+912281234567', whatsapp: '+912281234567' },
  port_hospital: { name: 'Port Hospital', emoji: '🏥', phone: '+912291234567', whatsapp: '+912291234567' },
  port_authority: { name: 'Port Authority', emoji: '🏗️', phone: '+912251234567', whatsapp: '+912251234567' },
  disaster_management: { name: 'NDRF', emoji: '🛡️', phone: '+911111234567', whatsapp: '+911111234567' },
}

const delay = (ms) => new Promise(r => setTimeout(r, ms))

export const dispatchToAgencies = async (incident, agencies, onProgress) => {
  const results = []

  for (const agencyKey of agencies) {
    const agency = AGENCY_CONTACTS[agencyKey]
    if (!agency) continue

    // Simulate network delay for each channel
    await delay(400 + Math.random() * 600)

    // Simulate dashboard push (instant via Firestore)
    onProgress?.({ agency: agencyKey, channel: 'dashboard', status: 'sent' })

    await delay(300)

    // Simulate WhatsApp
    onProgress?.({ agency: agencyKey, channel: 'whatsapp', status: 'sent' })

    await delay(200)

    // Simulate SMS fallback
    onProgress?.({ agency: agencyKey, channel: 'sms', status: 'sent' })

    results.push({ agency: agencyKey, status: 'dispatched', channels: ['dashboard', 'whatsapp', 'sms'] })
  }

  return results
}

export const formatDispatchMessage = (incident) => {
  const lines = [
    `🚨 EMERGENCY ALERT — EmergencyMesh`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `Type: ${incident.incidentType?.join(', ').toUpperCase()}`,
    `Severity: ${'⚠️'.repeat(incident.severity || 1)} (${incident.severity}/5)`,
    `Context: ${incident.context?.toUpperCase()}`,
  ]

  if (incident.location?.gps) {
    lines.push(`GPS: ${incident.location.gps.lat.toFixed(4)}, ${incident.location.gps.lng.toFixed(4)}`)
    lines.push(`Maps: https://maps.google.com/?q=${incident.location.gps.lat},${incident.location.gps.lng}`)
  }

  if (incident.location?.floor) {
    lines.push(`Floor: ${incident.location.floor}`)
  }

  if (incident.occupantsAtRisk) {
    lines.push(`Occupants at Risk: ${incident.occupantsAtRisk}`)
  }

  if (incident.vessel) {
    lines.push(`Vessel: ${incident.vessel.name} | Crew: ${incident.vessel.crewCount} | Cargo: ${incident.vessel.cargoType}`)
  }

  lines.push(`Reporter Trust Score: ${incident.trustScore}/100`)
  lines.push(`Incident ID: ${incident.incidentId}`)
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`Respond at: https://emergencymesh.app/incident/${incident.incidentId}`)

  return lines.join('\n')
}

export { AGENCY_CONTACTS }
