import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { createIncident } from '../firebase/incidents'
import { dispatchToAgencies, AGENCY_CONTACTS } from '../services/dispatchService'
import './ShipDashboard.css'

const EMERGENCY_TYPES = [
  { id: 'engine_fire', label: 'Engine Fire', emoji: '🔥' },
  { id: 'flooding', label: 'Flooding / Sinking', emoji: '🌊' },
  { id: 'man_overboard', label: 'Man Overboard', emoji: '🧑‍🦱' },
  { id: 'medical', label: 'Medical Emergency', emoji: '🏥' },
  { id: 'collision', label: 'Collision / Grounding', emoji: '💥' },
  { id: 'cargo_fire', label: 'Cargo Fire', emoji: '📦🔥' },
]

const CARGO_TYPES = ['Petroleum', 'General Cargo', 'Bulk Grain', 'Containers', 'Chemical', 'Passenger', 'Fishing']

const MARITIME_AGENCIES = ['coast_guard', 'port_hospital', 'port_authority']

// Service Worker offline queue simulation
const offlineQueue = {
  queue: [],
  push: (data) => { offlineQueue.queue.push(data) },
  flush: () => { const q = [...offlineQueue.queue]; offlineQueue.queue = []; return q },
}

export default function ShipDashboard() {
  const navigate = useNavigate()
  const [step, setStep] = useState('standby') // standby | details | sos | offline | dispatching | done
  const [gps, setGps] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [signal, setSignal] = useState(85) // 0-100 signal strength
  const [isOffline, setIsOffline] = useState(false)
  const [vessel, setVessel] = useState({ name: 'MV Ocean Star', crewCount: 24, cargoType: 'Petroleum', flag: 'IN' })
  const [emergencyType, setEmergencyType] = useState('')
  const [incidentId, setIncidentId] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [dispatchProgress, setDispatchProgress] = useState([])
  const [queuedCount, setQueuedCount] = useState(0)
  const signalRef = useRef()

  // Simulate fluctuating signal
  useEffect(() => {
    signalRef.current = setInterval(() => {
      setSignal(prev => {
        const delta = (Math.random() - 0.5) * 10
        const next = Math.min(100, Math.max(0, prev + delta))
        setIsOffline(next < 15)
        return Math.round(next)
      })
    }, 2000)
    return () => clearInterval(signalRef.current)
  }, [])

  const addTimeline = useCallback((event) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false })
    setTimeline(prev => [...prev, { time, event }])
  }, [])

  const getGPS = useCallback(() => {
    setGpsLoading(true)
    navigator.geolocation?.getCurrentPosition(
      pos => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false) },
      () => { setGps({ lat: 19.0760 + (Math.random()-0.5)*0.1, lng: 72.8777 + (Math.random()-0.5)*0.1 }); setGpsLoading(false) },
      { timeout: 4000 }
    )
  }, [])

  const handleSOS = useCallback(async () => {
    const capturedGps = gps || { lat: 19.0760, lng: 72.8777 }
    if (!gps) { getGPS() }
    addTimeline('🔴 SOS triggered by Captain')
    addTimeline(`📍 GPS captured: ${capturedGps.lat.toFixed(4)}°N, ${capturedGps.lng.toFixed(4)}°E`)

    if (isOffline) {
      setStep('offline')
      addTimeline('📡 No signal — SOS queued by Service Worker')
      offlineQueue.push({ gps: capturedGps, vessel, emergencyType })
      setQueuedCount(1)

      // Simulate signal restoration after 4 seconds
      setTimeout(async () => {
        addTimeline('📶 Signal restored — transmitting queued SOS')
        const queued = offlineQueue.flush()
        if (queued.length > 0) await dispatchSOS(capturedGps)
      }, 4000)
    } else {
      setStep('dispatching')
      await dispatchSOS(capturedGps)
    }
  }, [gps, vessel, emergencyType, isOffline, addTimeline, getGPS])

  const dispatchSOS = useCallback(async (capturedGps) => {
    const newIncident = createIncident({
      context: 'ship',
      severity: 5,
      reporterRole: 'captain',
      verifiedSource: true,
      trustScore: 95,
      location: { type: 'maritime', gps: capturedGps },
      incidentType: [emergencyType || 'sos'],
      occupantsAtRisk: vessel.crewCount,
      vessel,
      agenciesAlerted: MARITIME_AGENCIES,
      agencyStatus: Object.fromEntries(MARITIME_AGENCIES.map(a => [a, 'alerted'])),
      status: 'active',
      dispatchChannels: ['dashboard', 'sms'],
      timeline: [],
    })

    setIncidentId(newIncident.incidentId)
    addTimeline(`Vessel: ${vessel.name} | Crew: ${vessel.crewCount} | Cargo: ${vessel.cargoType}`)

    setStep('dispatching')
    await dispatchToAgencies(newIncident, MARITIME_AGENCIES, (progress) => {
      setDispatchProgress(prev => [...prev, progress])
      addTimeline(`${AGENCY_CONTACTS[progress.agency]?.name} alerted via ${progress.channel.toUpperCase()}`)
    })

    setStep('done')
  }, [vessel, emergencyType, addTimeline])

  const signalBars = Math.ceil((signal / 100) * 5)
  const signalColor = signal > 60 ? '#00ff88' : signal > 30 ? '#ffb800' : '#ff4444'

  return (
    <div className="ship-page">
      <div className="ship-bg" />
      <div className="ocean-waves">
        <div className="wave wave-1" />
        <div className="wave wave-2" />
        <div className="wave wave-3" />
      </div>

      {/* Header */}
      <header className="page-header ship-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}>← Back</button>
        <div className="logo">
          <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #0d1b2a, #1a3a5c)', border: '1px solid rgba(255,255,255,0.15)' }}>⚓</div>
          <div>
            <div className="logo-text">Maritime SOS</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Ship Captain Emergency Console</div>
          </div>
        </div>
        <div className="ship-header-right">
          {/* Signal Indicator */}
          <div className="signal-display">
            <div className="signal-bars">
              {[1,2,3,4,5].map(b => (
                <div key={b} className={`signal-bar ${b <= signalBars ? 'active' : ''}`}
                  style={{ height: `${b * 4 + 8}px`, background: b <= signalBars ? signalColor : undefined }} />
              ))}
            </div>
            <div className="signal-text" style={{ color: signalColor }}>
              {isOffline ? '⚠️ NO SIGNAL' : `${signal}%`}
            </div>
          </div>
          {/* GPS */}
          {gps ? (
            <span className="ship-gps">📍 {gps.lat.toFixed(3)}°N, {gps.lng.toFixed(3)}°E</span>
          ) : (
            <button className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '6px 12px' }} onClick={getGPS}>📍 Get GPS</button>
          )}
        </div>
      </header>

      <div className="page-content ship-content">
        {/* Standby / Details */}
        {(step === 'standby' || step === 'details') && (
          <div className="fade-in ship-standby">
            <div className="ship-layout">
              {/* Vessel Info */}
              <div className="glass-card vessel-card">
                <h3 className="card-title-ship">⚓ Vessel Details</h3>
                <div className="vessel-form">
                  <div className="field-group">
                    <label className="field-label">Vessel Name</label>
                    <input className="field-input" value={vessel.name} onChange={e => setVessel(v => ({ ...v, name: e.target.value }))} placeholder="e.g. MV Ocean Star" />
                  </div>
                  <div className="vessel-row">
                    <div className="field-group">
                      <label className="field-label">Crew Count</label>
                      <input className="field-input" type="number" value={vessel.crewCount} onChange={e => setVessel(v => ({ ...v, crewCount: parseInt(e.target.value) || 0 }))} />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Flag State</label>
                      <input className="field-input" value={vessel.flag} onChange={e => setVessel(v => ({ ...v, flag: e.target.value }))} placeholder="IN" />
                    </div>
                  </div>
                  <div className="field-group">
                    <label className="field-label">Cargo Type</label>
                    <select className="field-input" value={vessel.cargoType} onChange={e => setVessel(v => ({ ...v, cargoType: e.target.value }))}>
                      {CARGO_TYPES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="field-group">
                    <label className="field-label">Nature of Emergency</label>
                    <div className="etype-grid">
                      {EMERGENCY_TYPES.map(t => (
                        <button key={t.id} className={`etype-btn ${emergencyType === t.id ? 'selected' : ''}`} onClick={() => setEmergencyType(t.id)}>
                          <span>{t.emoji}</span> {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SOS Button + Info */}
              <div className="sos-panel">
                {/* Offline Badge */}
                {isOffline && (
                  <div className="offline-badge">
                    <span>📡</span>
                    <div>
                      <div style={{ fontWeight: 700, color: '#ffb800' }}>No Signal Detected</div>
                      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>SOS will be queued and sent when signal is restored</div>
                    </div>
                  </div>
                )}

                {/* THE SOS BUTTON */}
                <button className="sos-btn" onClick={handleSOS} id="sos-btn" disabled={step === 'dispatching' || step === 'done'}>
                  <div className="sos-ring sos-ring-1" />
                  <div className="sos-ring sos-ring-2" />
                  <div className="sos-ring sos-ring-3" />
                  <div className="sos-inner">
                    <span className="sos-label">SOS</span>
                    <span className="sos-sublabel">Tap to Send Distress Signal</span>
                  </div>
                </button>

                <div className="sos-desc">
                  <p>One tap automatically broadcasts:</p>
                  <ul>
                    <li>✓ GPS coordinates</li>
                    <li>✓ Vessel name + flag</li>
                    <li>✓ Crew count</li>
                    <li>✓ Cargo type</li>
                    <li>✓ Nature of emergency</li>
                  </ul>
                  <p className="sos-to">→ Coast Guard · Port Hospital · Port Authority</p>
                </div>

                {/* Agencies */}
                <div className="maritime-agencies">
                  {MARITIME_AGENCIES.map(key => (
                    <div key={key} className="maritime-agency">
                      <span className="ma-emoji">{AGENCY_CONTACTS[key]?.emoji}</span>
                      <span className="ma-name">{AGENCY_CONTACTS[key]?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Offline Queue */}
        {step === 'offline' && (
          <div className="fade-in offline-panel">
            <div className="offline-icon">📡</div>
            <h2 className="offline-title">SOS Queued Offline</h2>
            <p className="offline-desc">No signal detected. Your distress signal has been securely queued by the Service Worker and will transmit automatically the moment signal is restored.</p>
            <div className="offline-queue-visual">
              <div className="queue-item">
                <span>🔴</span>
                <span>SOS signal — {vessel.name}</span>
                <span className="queued-badge">QUEUED</span>
              </div>
            </div>
            <div className="signal-restore-bar">
              <div className="restore-label">Scanning for signal...</div>
              <div className="restore-progress" />
            </div>
            <div className="offline-timeline">
              {timeline.map((item, i) => (
                <div key={i} className="offline-timeline-item">
                  <span style={{ color: '#ff3b30', fontWeight: 700 }}>{item.time}</span>
                  <span>{item.event}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dispatching */}
        {step === 'dispatching' && (
          <div className="fade-in ship-dispatching">
            <div className="ship-dispatch-radar">
              <div className="radar-ring" style={{ borderColor: 'rgba(255,59,48,0.4)' }} />
              <div className="radar-ring radar-ring-2" style={{ borderColor: 'rgba(255,59,48,0.25)' }} />
              <div className="radar-ring radar-ring-3" style={{ borderColor: 'rgba(255,59,48,0.15)' }} />
              <div className="radar-core" style={{ fontSize: '3rem' }}>🆘</div>
            </div>
            <h2 style={{ color: '#ff3b30', fontWeight: 900, fontSize: '1.8rem' }}>SOS TRANSMITTED</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>{gps ? `${gps.lat.toFixed(4)}°N, ${gps.lng.toFixed(4)}°E` : 'GPS locked'}</p>
            <div className="dispatch-feed" style={{ marginTop: 24, maxWidth: 420, width: '100%' }}>
              {dispatchProgress.map((p, i) => (
                <div key={i} className="dispatch-log-item" style={{ borderColor: 'rgba(255,59,48,0.2)', background: 'rgba(255,59,48,0.05)' }}>
                  <span style={{ color: '#00ff88', fontWeight: 700 }}>✓</span>
                  <span>{AGENCY_CONTACTS[p.agency]?.emoji} {AGENCY_CONTACTS[p.agency]?.name}</span>
                  <span className="dispatch-channel">{p.channel}</span>
                  <span style={{ color: '#00ff88', fontSize: '0.72rem', fontWeight: 700 }}>SENT</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="fade-in ship-done">
            <div style={{ fontSize: '4rem', animation: 'float 2s ease infinite' }}>✅</div>
            <h2 className="done-title">Distress Signal Transmitted</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 500, textAlign: 'center', lineHeight: 1.7 }}>
              Coast Guard, Port Hospital, and Port Authority have been alerted with your GPS coordinates, crew count, and emergency type.
            </p>
            <div className="done-id">Incident ID: <strong>{incidentId}</strong></div>
            <div className="glass-card" style={{ padding: 20, maxWidth: 500, width: '100%' }}>
              <h4 style={{ color: '#ff3b30', marginBottom: 12, fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dispatch Timeline</h4>
              <div className="timeline">
                {timeline.map((item, i) => (
                  <div key={i} className="timeline-item" style={{ color: '#ff3b30' }}>
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
              <button className="btn btn-primary-red" onClick={() => navigate(`/incident/${incidentId}`)}>View Live Incident Room →</button>
              <button className="btn btn-ghost" onClick={() => navigate('/agency')}>Agency Dashboard</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
