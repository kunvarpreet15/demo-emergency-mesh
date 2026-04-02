import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscribeToIncidents, updateIncidentStatus, resolveIncident } from '../firebase/incidents'
import { AGENCY_CONTACTS } from '../services/dispatchService'
import './AgencyDashboard.css'

const AGENCY_FILTERS = ['all', 'fire_brigade', 'police', 'ambulance', 'coast_guard']
const CONTEXT_FILTERS = ['all', 'citizen', 'hotel', 'ship']
const STATUS_FILTERS = ['all', 'active', 'acknowledged', 'resolved']

const CONTEXT_ICONS = { citizen: '🆘', hotel: '🏨', ship: '⚓' }
const CONTEXT_COLORS = { citizen: '#00d4ff', hotel: '#f5a623', ship: '#ff3b30' }

const SLA_TARGETS = { fire_brigade: 8, police: 10, ambulance: 10, coast_guard: 45, port_hospital: 60, port_authority: 15 }

export default function AgencyDashboard() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])
  const [agencyFilter, setAgencyFilter] = useState('all')
  const [contextFilter, setContextFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [newAlertFlash, setNewAlertFlash] = useState(false)
  const [role] = useState('fire_brigade') // logged-in agency role
  const prevCountRef = useRef(0)
  const audioRef = useRef()

  useEffect(() => {
    const unsubscribe = subscribeToIncidents((data) => {
      setIncidents(data)
      // Flash on new incident
      if (prevCountRef.current > 0 && data.length > prevCountRef.current) {
        setNewAlertFlash(true)
        setTimeout(() => setNewAlertFlash(false), 3000)
        // Play alert tone
        try { audioRef.current?.play() } catch {}
      }
      prevCountRef.current = data.length
    })
    return unsubscribe
  }, [])

  const filtered = incidents.filter(inc => {
    if (contextFilter !== 'all' && inc.context !== contextFilter) return false
    if (statusFilter !== 'all' && inc.status !== statusFilter) return false
    return true
  })

  const activeCount = incidents.filter(i => i.status === 'active').length
  const ackCount = incidents.filter(i => i.status === 'acknowledged').length

  const getElapsedMin = (createdAt) => {
    return Math.round((Date.now() - new Date(createdAt).getTime()) / 60000)
  }

  return (
    <div className={`agency-page ${newAlertFlash ? 'flash-alert' : ''}`}>
      <div className="agency-bg" />
      <audio ref={audioRef} src="data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAYHAAAAAAAAAnFJTtAAAAAAAAAAAAAAAAAAAAD/+1BEAAADkABntAAAAIAAADSDAAABExBCmAACAAAA" preload="auto" />

      {/* Header */}
      <header className="page-header agency-header">
        <div className="logo">
          <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #00ff88, #00cc6a)' }}>🏛️</div>
          <div>
            <div className="logo-text">Agency Command Center</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Real-time Incident Feed · All Contexts</div>
          </div>
        </div>
        <div className="agency-header-stats">
          <div className="aint">
            <div className="aint-dot" style={{ background: '#ff4444' }} />
            <div className="aint-value">{activeCount}</div>
            <div className="aint-label">Active</div>
          </div>
          <div className="aint">
            <div className="aint-dot" style={{ background: '#ffb800' }} />
            <div className="aint-value">{ackCount}</div>
            <div className="aint-label">Acknowledged</div>
          </div>
          <div className="aint">
            <div className="aint-dot" style={{ background: '#00ff88' }} />
            <div className="aint-value">{incidents.length}</div>
            <div className="aint-label">Total</div>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>← Home</button>
      </header>

      {/* New Alert Banner */}
      {newAlertFlash && (
        <div className="new-alert-banner">
          🚨 NEW EMERGENCY INCOMING — CHECK INCIDENT FEED
        </div>
      )}

      <div className="agency-layout">
        {/* Incident Feed */}
        <div className="incident-feed">
          {/* Filters */}
          <div className="filters-bar">
            <div className="filter-group">
              <span className="filter-label">Context</span>
              {CONTEXT_FILTERS.map(f => (
                <button key={f} className={`filter-btn ${contextFilter === f ? 'active' : ''}`}
                  onClick={() => setContextFilter(f)} style={contextFilter === f && f !== 'all' ? { background: `${CONTEXT_COLORS[f]}20`, borderColor: CONTEXT_COLORS[f], color: CONTEXT_COLORS[f] } : {}}>
                  {f === 'all' ? 'All' : `${CONTEXT_ICONS[f]} ${f}`}
                </button>
              ))}
            </div>
            <div className="filter-group">
              <span className="filter-label">Status</span>
              {STATUS_FILTERS.map(f => (
                <button key={f} className={`filter-btn ${statusFilter === f ? 'active' : ''}`}
                  onClick={() => setStatusFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Incident Cards */}
          <div className="incident-cards">
            {filtered.length === 0 && (
              <div className="empty-state">
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>✅</div>
                <div>No incidents match current filters</div>
              </div>
            )}
            {filtered.map(inc => {
              const elapsed = getElapsedMin(inc.createdAt)
              const isSelected = selectedIncident?.incidentId === inc.incidentId
              const contextColor = CONTEXT_COLORS[inc.context] || '#fff'

              return (
                <div
                  key={inc.incidentId}
                  className={`incident-card ${isSelected ? 'selected' : ''} ${inc.status === 'active' ? 'incident-active' : ''}`}
                  onClick={() => setSelectedIncident(isSelected ? null : inc)}
                  style={{ '--ccolor': contextColor }}
                  id={`inc-${inc.incidentId}`}
                >
                  <div className="inc-card-top">
                    <div className="inc-context-badge" style={{ background: `${contextColor}15`, color: contextColor, border: `1px solid ${contextColor}30` }}>
                      {CONTEXT_ICONS[inc.context]} {inc.context?.toUpperCase()}
                    </div>
                    <div className={`sev-badge sev-${inc.severity}`}>
                      <span className="pulse-dot" />
                      Sev {inc.severity}
                    </div>
                    <div className="inc-elapsed">{elapsed}m ago</div>
                    <div className={`status-pill ${inc.status?.replace('_', '-')}`}>
                      {inc.status}
                    </div>
                  </div>

                  <div className="inc-card-mid">
                    <div className="inc-types">
                      {inc.incidentType?.map(t => (
                        <span key={t} className="inc-type-tag">{t.replace('_', ' ')}</span>
                      ))}
                    </div>
                    <div className="inc-id">{inc.incidentId}</div>
                  </div>

                  <div className="inc-card-info">
                    {inc.location?.floor && <span>🏢 Floor {inc.location.floor}</span>}
                    {inc.occupantsAtRisk > 0 && <span>👥 {inc.occupantsAtRisk} at risk</span>}
                    {inc.vessel && <span>⚓ {inc.vessel.name}</span>}
                    {inc.location?.gps && <span>📍 {inc.location.gps.lat.toFixed(3)}, {inc.location.gps.lng.toFixed(3)}</span>}
                    <span>🛡️ Trust: {inc.trustScore}</span>
                  </div>

                  {/* Agency Status Row */}
                  <div className="inc-agencies">
                    {Object.entries(inc.agencyStatus || {}).map(([agency, status]) => (
                      <div key={agency} className={`inc-agency-pill ${status}`}>
                        {AGENCY_CONTACTS[agency]?.emoji} {status.replace('_', ' ')}
                      </div>
                    ))}
                  </div>

                  {/* Expanded Detail */}
                  {isSelected && (
                    <div className="inc-expanded" onClick={e => e.stopPropagation()}>
                      {inc.geminiAnalysis && (
                        <div className="inc-analysis">
                          <div className="inc-analysis-label">🧠 Gemini: {inc.geminiAnalysis.description}</div>
                          <div className="inc-conf">Confidence: {Math.round((inc.geminiAnalysis.confidence || 0) * 100)}%</div>
                        </div>
                      )}
                      {inc.evacuationRoute && (
                        <div className="inc-evac">🚪 Evacuation: {inc.evacuationRoute}</div>
                      )}
                      <div className="inc-actions">
                        {inc.status === 'active' && (
                          <button className="btn btn-primary-green" style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                            onClick={() => updateIncidentStatus(inc.incidentId, role, 'acknowledged')}>
                            ✓ Acknowledge
                          </button>
                        )}
                        {inc.status === 'acknowledged' && (
                          <button className="btn btn-primary-cyan" style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                            onClick={() => updateIncidentStatus(inc.incidentId, role, 'en_route')}>
                            🚒 Mark En Route
                          </button>
                        )}
                        {inc.status !== 'resolved' && (
                          <button className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                            onClick={() => resolveIncident(inc.incidentId)}>
                            ✅ Resolve
                          </button>
                        )}
                        <button className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                          onClick={() => navigate(`/incident/${inc.incidentId}`)}>
                          📋 Incident Room →
                        </button>
                      </div>
                      {/* Timeline */}
                      <div className="inc-timeline">
                        {(inc.timeline || []).slice(-4).map((t, i) => (
                          <div key={i} className="inc-timeline-item">
                            <span className="inc-timeline-time">{t.time}</span>
                            <span className="inc-timeline-event">{t.event}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Panel — Map + Summary */}
        <div className="agency-right">
          {/* Mini Map Placeholder */}
          <div className="glass-card agency-map-card">
            <h3 className="agency-panel-title">📍 Incident Locations</h3>
            <div className="agency-map-placeholder">
              {filtered.map(inc => inc.location?.gps && (
                <div key={inc.incidentId} className="map-dot"
                  style={{
                    left: `${((inc.location.gps.lng - 72) / 10) * 100}%`,
                    top: `${((30 - inc.location.gps.lat) / 15) * 100}%`,
                    background: CONTEXT_COLORS[inc.context],
                    boxShadow: `0 0 8px ${CONTEXT_COLORS[inc.context]}`,
                  }} title={inc.incidentId}
                />
              ))}
              <div className="map-label">India Region · Live</div>
            </div>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 12, fontSize: '0.82rem' }} onClick={() => navigate('/heatmap')}>
              🗺️ Open Full Heatmap →
            </button>
          </div>

          {/* Context Breakdown */}
          <div className="glass-card agency-breakdown">
            <h3 className="agency-panel-title">📊 Context Breakdown</h3>
            {['citizen', 'hotel', 'ship'].map(ctx => {
              const count = incidents.filter(i => i.context === ctx).length
              const pct = incidents.length > 0 ? (count / incidents.length) * 100 : 0
              return (
                <div key={ctx} className="breakdown-row">
                  <span className="breakdown-icon">{CONTEXT_ICONS[ctx]}</span>
                  <span className="breakdown-label">{ctx.charAt(0).toUpperCase() + ctx.slice(1)}</span>
                  <div className="breakdown-bar-track">
                    <div className="breakdown-bar-fill" style={{ width: `${pct}%`, background: CONTEXT_COLORS[ctx] }} />
                  </div>
                  <span className="breakdown-count">{count}</span>
                </div>
              )
            })}
          </div>

          {/* Agency Contacts */}
          <div className="glass-card agency-contacts-card">
            <h3 className="agency-panel-title">📡 Pre-Registered Agencies</h3>
            {Object.entries(AGENCY_CONTACTS).slice(0, 4).map(([key, agency]) => (
              <div key={key} className="contact-row">
                <span className="contact-emoji">{agency.emoji}</span>
                <div className="contact-info">
                  <div className="contact-name">{agency.name}</div>
                  <div className="contact-channels">Dashboard · WhatsApp · SMS · Voice</div>
                </div>
                <div className="contact-dot-live" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
