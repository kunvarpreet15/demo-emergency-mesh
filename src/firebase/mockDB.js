// =============================================
// MOCK DATABASE — In-memory Firestore simulation
// Provides real-time updates via listeners
// =============================================

let incidents = [
  {
    incidentId: 'INC-2026-0088',
    context: 'citizen',
    severity: 3,
    reporterRole: 'citizen',
    verifiedSource: false,
    trustScore: 62,
    location: { type: 'outdoor', gps: { lat: 28.6139, lng: 77.2090 } },
    incidentType: ['road_accident'],
    occupantsAtRisk: 3,
    geminiAnalysis: {
      confidence: 0.87,
      detectedTypes: ['road_accident', 'vehicle_damage'],
      severity: 3,
      aiGenerated: false,
      description: 'Two-vehicle collision with visible damage. Airbags deployed on sedan.'
    },
    agenciesAlerted: ['police', 'ambulance'],
    agencyStatus: { police: 'en_route', ambulance: 'acknowledged' },
    status: 'acknowledged',
    dispatchChannels: ['dashboard', 'whatsapp'],
    timeline: [
      { time: '11:02:14', event: 'Citizen triggered alert — Road accident' },
      { time: '11:02:16', event: 'Gemini confirmed accident (87% confidence)' },
      { time: '11:02:17', event: 'FCM dispatched to police + ambulance' },
      { time: '11:04:22', event: 'Police acknowledged — ETA 8 minutes' },
    ],
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    resolvedAt: null,
  },
  {
    incidentId: 'INC-2026-0089',
    context: 'hotel',
    severity: 4,
    reporterRole: 'manager',
    verifiedSource: true,
    trustScore: 88,
    location: { type: 'indoor', buildingId: 'HOTEL-IMPERIAL-DELHI', floor: 3, gps: { lat: 28.6200, lng: 77.2150 } },
    incidentType: ['fire', 'evacuation_needed'],
    occupantsAtRisk: 31,
    geminiAnalysis: {
      confidence: 0.96,
      detectedTypes: ['fire', 'smoke'],
      severity: 4,
      aiGenerated: false,
      description: 'Active fire with dense smoke in corridor. Sprinkler system active.'
    },
    evacuationRoute: 'East Stairwell A — Floors 2 to 5',
    agenciesAlerted: ['fire_brigade', 'police', 'ambulance'],
    agencyStatus: { fire_brigade: 'on_scene', police: 'acknowledged', ambulance: 'en_route' },
    status: 'acknowledged',
    dispatchChannels: ['dashboard', 'whatsapp', 'sms'],
    timeline: [
      { time: '10:44:11', event: 'Hotel manager triggered — Floor 3 fire' },
      { time: '10:44:13', event: 'Gemini confirmed fire + smoke (96% confidence)' },
      { time: '10:44:14', event: 'FCM dispatched to 3 agencies + 31 guest devices' },
      { time: '10:44:15', event: 'WhatsApp + SMS sent to registered numbers' },
      { time: '10:47:30', event: 'Fire Brigade acknowledged — ETA 5 minutes' },
      { time: '10:52:45', event: 'Fire Brigade on scene' },
    ],
    createdAt: new Date(Date.now() - 22 * 60000).toISOString(),
    resolvedAt: null,
  },
  {
    incidentId: 'INC-2026-0090',
    context: 'ship',
    severity: 5,
    reporterRole: 'captain',
    verifiedSource: true,
    trustScore: 95,
    location: { type: 'maritime', gps: { lat: 19.0760, lng: 72.8777 } },
    incidentType: ['engine_fire', 'sos'],
    occupantsAtRisk: 24,
    vessel: { name: 'MV Ocean Star', crewCount: 24, cargoType: 'Petroleum', flag: 'IN' },
    geminiAnalysis: {
      confidence: 0.99,
      detectedTypes: ['fire', 'maritime_emergency'],
      severity: 5,
      aiGenerated: false,
      description: 'Engine room fire on commercial vessel. Crew mustering at evacuation points.'
    },
    agenciesAlerted: ['coast_guard', 'port_hospital', 'port_authority'],
    agencyStatus: { coast_guard: 'en_route', port_hospital: 'acknowledged', port_authority: 'acknowledged' },
    status: 'active',
    dispatchChannels: ['dashboard', 'sms'],
    timeline: [
      { time: '10:14:02', event: 'Captain triggered SOS — Engine fire' },
      { time: '10:14:03', event: 'GPS captured: 19.0760°N, 72.8777°E' },
      { time: '10:14:04', event: 'Offline queue detected — signal weak' },
      { time: '10:14:09', event: 'Signal restored — SOS transmitted' },
      { time: '10:14:10', event: 'Coast Guard alerted — ETA 40 minutes' },
    ],
    createdAt: new Date(Date.now() - 65 * 60000).toISOString(),
    resolvedAt: null,
  },
]

let listeners = []
let idCounter = 91

const notify = () => {
  listeners.forEach(fn => fn([...incidents]))
}

export const mockDB = {
  getIncidents: () => [...incidents],

  getIncident: (id) => incidents.find(i => i.incidentId === id) || null,

  addIncident: (incident) => {
    const newIncident = {
      ...incident,
      incidentId: `INC-2026-00${idCounter++}`,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    }
    incidents = [newIncident, ...incidents]
    notify()
    return newIncident
  },

  updateIncident: (id, updates) => {
    incidents = incidents.map(i =>
      i.incidentId === id ? { ...i, ...updates } : i
    )
    notify()
  },

  subscribe: (callback) => {
    listeners.push(callback)
    callback([...incidents]) // emit current state immediately
    return () => {
      listeners = listeners.filter(fn => fn !== callback)
    }
  },
}
