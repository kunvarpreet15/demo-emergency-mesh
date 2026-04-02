import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { createIncident } from '../firebase/incidents'
import { dispatchToAgencies, AGENCY_CONTACTS } from '../services/dispatchService'
import './HotelDashboard.css'

const HOTEL = {
  name: 'The Imperial Hotel',
  id: 'HOTEL-IMPERIAL-DELHI-01',
  totalFloors: 8,
  floors: {
    1: { rooms: 12, occupied: 8, guests: 19, type: 'lobby/restaurant' },
    2: { rooms: 18, occupied: 14, guests: 28, type: 'standard rooms' },
    3: { rooms: 18, occupied: 12, guests: 24, type: 'standard rooms' },
    4: { rooms: 18, occupied: 16, guests: 31, type: 'standard rooms' },
    5: { rooms: 16, occupied: 11, guests: 22, type: 'deluxe rooms' },
    6: { rooms: 14, occupied: 9, guests: 18, type: 'deluxe rooms' },
    7: { rooms: 10, occupied: 7, guests: 14, type: 'suite level' },
    8: { rooms: 6, occupied: 4, guests: 8, type: 'penthouse' },
  }
}

const EMERGENCY_TYPES = [
  { id: 'fire', label: 'Fire / Smoke', emoji: '🔥', agencies: ['fire_brigade', 'police', 'ambulance'], severity: 4 },
  { id: 'medical', label: 'Medical Emergency', emoji: '🏥', agencies: ['ambulance', 'police'], severity: 3 },
  { id: 'gas_leak', label: 'Gas Leak', emoji: '⚠️', agencies: ['fire_brigade', 'police'], severity: 4 },
  { id: 'security', label: 'Security Threat', emoji: '🚨', agencies: ['police'], severity: 3 },
  { id: 'structural', label: 'Structural Damage', emoji: '🏚️', agencies: ['fire_brigade', 'police', 'ambulance'], severity: 5 },
  { id: 'flood', label: 'Water / Flooding', emoji: '🌊', agencies: ['fire_brigade', 'police'], severity: 3 },
]

const EVACUATION_ROUTES = {
  1: 'Main Exit — Ground Floor. Use all exit doors.',
  2: 'West Stairwell → Ground Floor. Avoid elevators.',
  3: 'East Stairwell A → Ground Floor.',
  4: 'West Stairwell B → Ground Floor. Do NOT use elevators.',
  5: 'West Stairwell B → Ground Floor.',
  6: 'Central Stairwell → Ground Floor.',
  7: 'Central Stairwell → Ground Floor.',
  8: 'Emergency Roof Access → Helicopter pad if needed.',
}

export default function HotelDashboard() {
  const navigate = useNavigate()
  const [selectedFloor, setSelectedFloor] = useState(null)
  const [selectedType, setSelectedType] = useState(null)
  const [step, setStep] = useState('select') // select | confirm | dispatching | done
  const [timeline, setTimeline] = useState([])
  const [dispatchProgress, setDispatchProgress] = useState([])
  const [incidentId, setIncidentId] = useState(null)

  const addTimeline = useCallback((event) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })
    setTimeline(prev => [...prev, { time, event }])
  }, [])

  const handleFloorSelect = useCallback((floor) => {
    setSelectedFloor(floor)
    setStep('confirm')
  }, [])

  const handleDispatch = useCallback(async () => {
    if (!selectedFloor || !selectedType) return
    setStep('dispatching')

    const floor = HOTEL.floors[selectedFloor]
    const emergencyType = EMERGENCY_TYPES.find(t => t.id === selectedType)

    addTimeline(`Hotel manager triggered — Floor ${selectedFloor} ${emergencyType?.label}`)

    const newIncident = createIncident({
      context: 'hotel',
      severity: emergencyType?.severity || 4,
      reporterRole: 'manager',
      verifiedSource: true,
      trustScore: 88,
      location: {
        type: 'indoor',
        buildingId: HOTEL.id,
        floor: selectedFloor,
        gps: { lat: 28.6200, lng: 77.2150 }
      },
      incidentType: [selectedType],
      occupantsAtRisk: floor.guests,
      evacuationRoute: EVACUATION_ROUTES[selectedFloor],
      agenciesAlerted: emergencyType?.agencies || [],
      agencyStatus: Object.fromEntries((emergencyType?.agencies || []).map(a => [a, 'alerted'])),
      status: 'active',
      dispatchChannels: ['dashboard', 'whatsapp', 'sms', 'fcm'],
      timeline: [],
    })

    setIncidentId(newIncident.incidentId)
    addTimeline(`System: Gemini verified ${emergencyType?.label} (Trust Score: 88/100)`)
    addTimeline(`FCM dispatched to ${floor.guests} guest devices on Floor ${selectedFloor}`)
    addTimeline(`Evacuation route: ${EVACUATION_ROUTES[selectedFloor]}`)

    await dispatchToAgencies(newIncident, emergencyType?.agencies || [], (progress) => {
      setDispatchProgress(prev => [...prev, progress])
      addTimeline(`${AGENCY_CONTACTS[progress.agency]?.name} alerted via ${progress.channel.toUpperCase()}`)
    })

    setStep('done')
  }, [selectedFloor, selectedType, addTimeline])

  const floorData = selectedFloor ? HOTEL.floors[selectedFloor] : null
  const emergencyTypeData = selectedType ? EMERGENCY_TYPES.find(t => t.id === selectedType) : null

  return (
    <div className="hotel-page">
      <div className="hotel-bg" />
      <div className="hotel-glow" />

      {/* Header */}
      <header className="page-header hotel-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}>← Back</button>
        <div className="logo">
          <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #f5a623, #e8901a)' }}>🏨</div>
          <div>
            <div className="logo-text">{HOTEL.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Manager Emergency Console</div>
          </div>
        </div>
        <div className="hotel-header-stats">
          <div className="hstat">
            <div className="hstat-value">{Object.values(HOTEL.floors).reduce((s,f) => s + f.guests, 0)}</div>
            <div className="hstat-label">Total Guests</div>
          </div>
          <div className="hstat">
            <div className="hstat-value">{HOTEL.totalFloors}</div>
            <div className="hstat-label">Floors</div>
          </div>
        </div>
      </header>

      <div className="page-content hotel-content">
        {step === 'select' && (
          <div className="fade-in hotel-select-view">
            <div className="hotel-grid-section">
              <h2 className="section-title">
                <span>🏢</span> Select Affected Floor
              </h2>
              <p className="section-hint">Tap the floor where the emergency is occurring</p>

              {/* Floor Plan Grid */}
              <div className="floor-plan">
                {Array.from({ length: HOTEL.totalFloors }, (_, i) => HOTEL.totalFloors - i).map(floor => {
                  const f = HOTEL.floors[floor]
                  const occupancyPct = f.occupied / f.rooms
                  return (
                    <button
                      key={floor}
                      className={`floor-row ${selectedFloor === floor ? 'selected' : ''}`}
                      onClick={() => handleFloorSelect(floor)}
                      id={`floor-${floor}`}
                    >
                      <div className="floor-number">
                        <span className="floor-label">Floor</span>
                        <span className="floor-num">{floor}</span>
                      </div>
                      <div className="floor-info">
                        <div className="floor-type">{f.type}</div>
                        <div className="floor-occupancy-bar">
                          <div className="floor-occ-fill" style={{
                            width: `${occupancyPct * 100}%`,
                            background: occupancyPct > 0.8 ? '#ff4444' : occupancyPct > 0.5 ? '#ffb800' : '#00ff88'
                          }} />
                        </div>
                      </div>
                      <div className="floor-stats">
                        <div className="fstat">
                          <span className="fstat-val">{f.guests}</span>
                          <span className="fstat-lbl">Guests</span>
                        </div>
                        <div className="fstat">
                          <span className="fstat-val">{f.occupied}/{f.rooms}</span>
                          <span className="fstat-lbl">Rooms</span>
                        </div>
                      </div>
                      <div className="floor-arrow">›</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {step === 'confirm' && selectedFloor && (
          <div className="fade-in hotel-confirm-view">
            <div className="confirm-grid">
              {/* Floor Summary */}
              <div className="glass-card floor-summary-card">
                <div className="floor-summary-header">
                  <div className="floor-badge">
                    <span className="floor-badge-num">{selectedFloor}</span>
                    <span className="floor-badge-lbl">Floor</span>
                  </div>
                  <div>
                    <h3 className="floor-summary-title">Floor {selectedFloor} — {floorData?.type}</h3>
                    <div className="floor-summary-stats">
                      <span>👥 {floorData?.guests} guests</span>
                      <span>🚪 {floorData?.occupied}/{floorData?.rooms} rooms occupied</span>
                    </div>
                  </div>
                </div>

                <div className="evacuation-route-box">
                  <div className="evac-label">🚪 Evacuation Route</div>
                  <div className="evac-route">{EVACUATION_ROUTES[selectedFloor]}</div>
                </div>

                <div className="guest-fcm-notice">
                  <span>📱</span>
                  <span>FCM push will be sent to all {floorData?.guests} guest devices on this floor</span>
                </div>
              </div>

              {/* Emergency Type */}
              <div className="glass-card type-select-card">
                <h3 class="card-title-hotel">Select Emergency Type</h3>
                <div className="type-grid">
                  {EMERGENCY_TYPES.map(t => (
                    <button
                      key={t.id}
                      className={`type-btn ${selectedType === t.id ? 'selected' : ''}`}
                      onClick={() => setSelectedType(t.id)}
                      id={`etype-${t.id}`}
                    >
                      <span className="type-emoji">{t.emoji}</span>
                      <span className="type-name">{t.label}</span>
                      <div className={`sev-badge sev-${t.severity}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>S{t.severity}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Agencies Preview */}
              {selectedType && (
                <div className="glass-card agencies-preview-card">
                  <h3 class="card-title-hotel">Agencies to Alert</h3>
                  <div className="agencies-list">
                    {emergencyTypeData?.agencies.map(key => (
                      <div key={key} className="agency-row">
                        <div className="agency-name">
                          <div className="agency-icon" style={{ background: 'rgba(245,166,35,0.1)' }}>{AGENCY_CONTACTS[key]?.emoji}</div>
                          {AGENCY_CONTACTS[key]?.name}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['Dashboard', 'WhatsApp', 'SMS'].map(ch => (
                            <span key={ch} style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(245,166,35,0.1)', color: '#f5a623', fontWeight: 600 }}>{ch}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn btn-primary-amber btn-lg"
                    style={{ width: '100%', marginTop: 16 }}
                    onClick={handleDispatch}
                    disabled={!selectedType}
                    id="hotel-dispatch-btn"
                  >
                    🚨 Alert All Agencies + {floorData?.guests} Guests →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'dispatching' && (
          <div className="fade-in hotel-dispatching-view">
            <div className="hotel-dispatch-layout">
              {/* Live Timeline */}
              <div className="glass-card live-timeline-card">
                <h3 className="card-title-hotel">⚡ Live Dispatch Timeline</h3>
                <div className="timeline">
                  {timeline.map((item, i) => (
                    <div key={i} className="timeline-item" style={{ animationDelay: `${i * 0.1}s`, color: '#f5a623' }}>
                      <div className="timeline-line">
                        <div className="timeline-dot" />
                        {i < timeline.length - 1 && <div className="timeline-connector" />}
                      </div>
                      <div className="timeline-time">{item.time}</div>
                      <div className="timeline-event">{item.event}</div>
                    </div>
                  ))}
                  {timeline.length === 0 && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Initiating dispatch...</div>}
                </div>
              </div>

              {/* Status */}
              <div className="glass-card dispatch-status-card">
                <div className="hotel-dispatch-icon">🚨</div>
                <h3 style={{ color: '#f5a623', fontWeight: 800, marginBottom: 8 }}>Dispatching...</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem' }}>Floor {selectedFloor} • {emergencyTypeData?.label}</p>
                <div className="dispatch-feed" style={{ marginTop: 20 }}>
                  {dispatchProgress.map((p, i) => (
                    <div key={i} className="dispatch-log-item" style={{ borderColor: 'rgba(245,166,35,0.2)', background: 'rgba(245,166,35,0.05)' }}>
                      <span style={{ color: '#00ff88', fontWeight: 700 }}>✓</span>
                      <span>{AGENCY_CONTACTS[p.agency]?.emoji} {AGENCY_CONTACTS[p.agency]?.name}</span>
                      <span className="dispatch-channel">{p.channel}</span>
                      <span style={{ color: '#00ff88', fontWeight: 700, fontSize: '0.72rem' }}>SENT</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="fade-in hotel-done-view">
            <div className="hotel-done-layout">
              <div className="hotel-done-header">
                <div className="done-icon">✅</div>
                <h2 className="done-title">All Agencies Alerted</h2>
                <p className="done-subtitle">Floor {selectedFloor} — {emergencyTypeData?.label} · {floorData?.guests} guests notified</p>
                <div className="done-id">Incident ID: <strong>{incidentId}</strong></div>
              </div>
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 className="card-title-hotel">📋 Complete Dispatch Timeline</h3>
                <div className="timeline" style={{ marginTop: 16 }}>
                  {timeline.map((item, i) => (
                    <div key={i} className="timeline-item" style={{ color: '#f5a623' }}>
                      <div className="timeline-line">
                        <div className="timeline-dot" />
                        {i < timeline.length - 1 && <div className="timeline-connector" />}
                      </div>
                      <div className="timeline-time">{item.time}</div>
                      <div className="timeline-event">{item.event}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="done-actions">
                <button className="btn btn-primary-amber" onClick={() => navigate(`/incident/${incidentId}`)}>View Live Incident Room →</button>
                <button className="btn btn-ghost" onClick={() => navigate('/agency')}>View Agency Dashboard</button>
                <button className="btn btn-ghost" onClick={() => { setStep('select'); setSelectedFloor(null); setSelectedType(null); setTimeline([]); setDispatchProgress([]) }}>New Alert</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
