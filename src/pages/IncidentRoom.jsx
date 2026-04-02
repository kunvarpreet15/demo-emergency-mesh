import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { subscribeToIncidents, updateIncidentStatus, resolveIncident } from '../firebase/incidents'
import { generateIncidentReport } from '../services/geminiService'
import { AGENCY_CONTACTS } from '../services/dispatchService'
import './IncidentRoom.css'

const CONTEXT_COLORS = { citizen: '#00d4ff', hotel: '#f5a623', ship: '#ff3b30' }
const CONTEXT_ICONS = { citizen: '🆘', hotel: '🏨', ship: '⚓' }

export default function IncidentRoom() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [incident, setIncident] = useState(null)
  const [report, setReport] = useState(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const unsubscribe = subscribeToIncidents((incidents) => {
      const found = incidents.find(i => i.incidentId === id)
      setIncident(found || null)
    })
    return unsubscribe
  }, [id])

  // Elapsed timer
  useEffect(() => {
    if (!incident) return
    const timer = setInterval(() => {
      setElapsed(Math.round((Date.now() - new Date(incident.createdAt).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [incident])

  const formatElapsed = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}m ${sec}s`
  }

  const handleGenReport = async () => {
    setGeneratingReport(true)
    const r = await generateIncidentReport(incident)
    setReport(r)
    setGeneratingReport(false)
  }

  if (!incident) {
    return (
      <div className="incident-room-loading">
        <div className="ir-spinner" />
        <p>Loading incident {id}...</p>
        <button className="btn btn-ghost" onClick={() => navigate('/agency')}>← Agency Dashboard</button>
      </div>
    )
  }

  const contextColor = CONTEXT_COLORS[incident.context] || '#fff'

  return (
    <div className="incident-room">
      <div className="ir-bg" style={{ '--ctx-color': contextColor }} />

      {/* Header */}
      <header className="ir-header">
        <button className="btn btn-ghost" onClick={() => navigate('/agency')}>← Agency</button>
        <div className="ir-title-group">
          <div className="ir-context-tag" style={{ background: `${contextColor}15`, color: contextColor, border: `1px solid ${contextColor}30` }}>
            {CONTEXT_ICONS[incident.context]} {incident.context?.toUpperCase()} INCIDENT
          </div>
          <h1 className="ir-incident-id">{incident.incidentId}</h1>
        </div>
        <div className="ir-live-badge">
          <span className="pulse-dot" style={{ background: incident.status === 'resolved' ? '#00ff88' : '#ff4444' }} />
          {incident.status === 'resolved' ? 'RESOLVED' : 'LIVE'}
        </div>
      </header>

      <div className="ir-content">
        {/* Top Row */}
        <div className="ir-top-row">
          {/* Severity + Status */}
          <div className="glass-card ir-severity-card">
            <div className="ir-sev-num" style={{ color: contextColor }}>
              {[1,2,3,4,5].map(n => (
                <span key={n} style={{ opacity: n <= incident.severity ? 1 : 0.15 }}>⚠️</span>
              ))}
            </div>
            <div className={`sev-badge sev-${incident.severity}`} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
              <span className="pulse-dot" />
              Severity {incident.severity}/5
            </div>
            <div className={`status-pill ${incident.status?.replace('_', '-')}`} style={{ marginTop: 8 }}>
              {incident.status}
            </div>
            <div className="ir-elapsed">⏱️ {formatElapsed(elapsed)}</div>
          </div>

          {/* Location */}
          <div className="glass-card ir-location-card">
            <h3 className="ir-card-title">📍 Location</h3>
            {incident.location?.floor && <div className="ir-info-row"><span>Floor</span><strong>{incident.location.floor}</strong></div>}
            {incident.location?.buildingId && <div className="ir-info-row"><span>Building</span><strong style={{ fontSize: '0.8rem' }}>{incident.location.buildingId}</strong></div>}
            {incident.location?.gps && (
              <div className="ir-info-row">
                <span>GPS</span>
                <strong>{incident.location.gps.lat.toFixed(4)}°N, {incident.location.gps.lng.toFixed(4)}°E</strong>
              </div>
            )}
            {incident.location?.type && <div className="ir-info-row"><span>Type</span><strong style={{ textTransform: 'capitalize' }}>{incident.location.type}</strong></div>}
            {incident.location?.gps && (
              <a
                className="btn btn-ghost"
                style={{ width: '100%', marginTop: 12, fontSize: '0.8rem', padding: '8px 12px' }}
                href={`https://maps.google.com/?q=${incident.location.gps.lat},${incident.location.gps.lng}`}
                target="_blank" rel="noreferrer"
              >
                🗺️ Open in Maps →
              </a>
            )}
          </div>

          {/* Vessel (ship only) */}
          {incident.vessel && (
            <div className="glass-card ir-vessel-card">
              <h3 className="ir-card-title">⚓ Vessel Data</h3>
              <div className="ir-info-row"><span>Name</span><strong>{incident.vessel.name}</strong></div>
              <div className="ir-info-row"><span>Crew</span><strong>{incident.vessel.crewCount} persons</strong></div>
              <div className="ir-info-row"><span>Cargo</span><strong>{incident.vessel.cargoType}</strong></div>
              <div className="ir-info-row"><span>Flag</span><strong>{incident.vessel.flag}</strong></div>
            </div>
          )}

          {/* Reporter */}
          <div className="glass-card ir-reporter-card">
            <h3 className="ir-card-title">🛡️ Reporter</h3>
            <div className="ir-info-row"><span>Role</span><strong style={{ textTransform: 'capitalize' }}>{incident.reporterRole}</strong></div>
            <div className="ir-info-row"><span>Trust Score</span>
              <strong style={{ color: incident.trustScore >= 80 ? '#00ff88' : incident.trustScore >= 60 ? '#ffb800' : '#ff4444' }}>
                {incident.trustScore}/100
              </strong>
            </div>
            <div className="ir-info-row"><span>Verified</span><strong>{incident.verifiedSource ? '✅ Yes' : '⚠️ Pending'}</strong></div>
            {incident.occupantsAtRisk > 0 && (
              <div className="ir-info-row"><span>At Risk</span><strong style={{ color: '#ff4444' }}>👥 {incident.occupantsAtRisk} people</strong></div>
            )}
          </div>
        </div>

        {/* Mid Row */}
        <div className="ir-mid-row">
          {/* Gemini Analysis */}
          {incident.geminiAnalysis && (
            <div className="glass-card ir-gemini-card">
              <h3 className="ir-card-title">🧠 Gemini AI Analysis</h3>
              <div className="ir-gemini-conf">
                <span>Confidence</span>
                <div className="ir-conf-track">
                  <div className="ir-conf-fill" style={{ width: `${(incident.geminiAnalysis.confidence || 0) * 100}%` }} />
                </div>
                <span style={{ color: contextColor, fontWeight: 700 }}>{Math.round((incident.geminiAnalysis.confidence || 0) * 100)}%</span>
              </div>
              <p className="ir-gemini-desc">{incident.geminiAnalysis.description}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {incident.geminiAnalysis.detectedTypes?.map(t => (
                  <span key={t} className="inc-type-tag">{t.replace('_', ' ')}</span>
                ))}
              </div>
              {incident.evacuationRoute && (
                <div className="ir-evac-box">
                  🚪 <strong>Evacuation Route:</strong> {incident.evacuationRoute}
                </div>
              )}
            </div>
          )}

          {/* Agency Status */}
          <div className="glass-card ir-agencies-card">
            <h3 className="ir-card-title">📡 Agency Response Status</h3>
            <div className="ir-agencies">
              {Object.entries(incident.agencyStatus || {}).map(([key, status]) => {
                const agency = AGENCY_CONTACTS[key]
                return (
                  <div key={key} className="ir-agency-row">
                    <div className="ir-agency-icon">{agency?.emoji}</div>
                    <div className="ir-agency-info">
                      <div className="ir-agency-name">{agency?.name}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        {['dashboard', 'whatsapp', 'sms'].map(ch => (
                          <span key={ch} style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: 3, background: 'rgba(0,255,136,0.1)', color: '#00ff88', fontWeight: 600, textTransform: 'uppercase' }}>{ch}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className={`status-pill ${status?.replace('_', '-')}`} style={{ fontSize: '0.7rem' }}>{status?.replace('_', ' ')}</div>
                      {incident.status !== 'resolved' && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                          {status === 'alerted' && (
                            <button className="ir-action-btn" onClick={() => updateIncidentStatus(incident.incidentId, key, 'acknowledged')}>Ack</button>
                          )}
                          {status === 'acknowledged' && (
                            <button className="ir-action-btn" onClick={() => updateIncidentStatus(incident.incidentId, key, 'en_route')}>En Route</button>
                          )}
                          {status === 'en_route' && (
                            <button className="ir-action-btn" onClick={() => updateIncidentStatus(incident.incidentId, key, 'on_scene')}>On Scene</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {incident.status !== 'resolved' && (
              <button className="btn btn-primary-green" style={{ width: '100%', marginTop: 16, fontSize: '0.85rem' }}
                onClick={() => resolveIncident(incident.incidentId)}>
                ✅ Mark Incident Resolved
              </button>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="glass-card ir-timeline-card">
          <h3 className="ir-card-title">⏱️ Live Incident Timeline</h3>
          <div className="timeline ir-timeline">
            {(incident.timeline || []).map((item, i) => (
              <div key={i} className="timeline-item" style={{ color: contextColor, animationDelay: `${i * 0.05}s` }}>
                <div className="timeline-line">
                  <div className="timeline-dot" />
                  {i < (incident.timeline?.length || 0) - 1 && <div className="timeline-connector" />}
                </div>
                <div className="timeline-time">{item.time}</div>
                <div className="timeline-event">{item.event}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Post-Incident Report */}
        {incident.status === 'resolved' && (
          <div className="glass-card ir-report-card">
            <h3 className="ir-card-title">📋 Post-Incident AI Report</h3>
            {!report && !generatingReport && (
              <button className="btn btn-primary-cyan" onClick={handleGenReport}>
                🧠 Generate AI Report (Gemini)
              </button>
            )}
            {generatingReport && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem' }}>
                <div className="step-spinner" />
                Gemini is generating your report...
              </div>
            )}
            {report && (
              <div className="ir-report">
                {Object.entries(report).map(([key, val]) => (
                  <div key={key} className="ir-report-row">
                    <span className="ir-report-key">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    <span className="ir-report-val">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
