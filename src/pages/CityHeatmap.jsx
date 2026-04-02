import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscribeToIncidents } from '../firebase/incidents'
import './CityHeatmap.css'

const CONTEXT_COLORS = { citizen: '#00d4ff', hotel: '#f5a623', ship: '#ff3b30' }
const CONTEXT_ICONS = { citizen: '🆘', hotel: '🏨', ship: '⚓' }

// Convert incident GPS to pixel positions on our map
const gpsToPixel = (lat, lng) => {
  // Map bounds: lat 8-35 (India), lng 68-98
  const x = ((lng - 68) / 30) * 100
  const y = ((35 - lat) / 27) * 100
  return { x: Math.max(2, Math.min(96, x)), y: Math.max(2, Math.min(96, y)) }
}

export default function CityHeatmap() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])
  const [filter, setFilter] = useState('all')
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    return subscribeToIncidents(setIncidents)
  }, [])

  const filtered = filter === 'all' ? incidents : incidents.filter(i => i.context === filter)

  const stats = {
    total: incidents.length,
    active: incidents.filter(i => i.status === 'active').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    citizen: incidents.filter(i => i.context === 'citizen').length,
    hotel: incidents.filter(i => i.context === 'hotel').length,
    ship: incidents.filter(i => i.context === 'ship').length,
  }

  return (
    <div className="heatmap-page">
      <div className="heatmap-bg" />

      {/* Header */}
      <header className="page-header heatmap-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}>← Home</button>
        <div className="logo">
          <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #ff6b35, #ff3b30)' }}>🗺️</div>
          <span className="logo-text">City Emergency Heatmap</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/agency')}>Agency Dashboard →</button>
        </div>
      </header>

      <div className="heatmap-layout">
        {/* Stats Row */}
        <div className="heatmap-stats">
          {[
            { label: 'Total Incidents', value: stats.total, color: '#fff' },
            { label: 'Active', value: stats.active, color: '#ff4444' },
            { label: 'Resolved', value: stats.resolved, color: '#00ff88' },
            { label: '🆘 Citizen', value: stats.citizen, color: '#00d4ff' },
            { label: '🏨 Hotel', value: stats.hotel, color: '#f5a623' },
            { label: '⚓ Ship', value: stats.ship, color: '#ff3b30' },
          ].map((s, i) => (
            <div key={i} className="hmap-stat" style={{ '--hsc': s.color }}>
              <div className="hmap-stat-val">{s.value}</div>
              <div className="hmap-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="heatmap-main">
          {/* Map */}
          <div className="heatmap-container">
            {/* India Outline (simplified) */}
            <svg className="india-outline" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon points="35,5 55,3 65,10 75,8 82,15 85,25 80,35 85,45 80,55 75,65 65,75 55,80 45,95 35,90 25,80 15,70 10,55 12,40 8,30 15,20 25,10" fill="rgba(0,212,255,0.03)" stroke="rgba(0,212,255,0.08)" strokeWidth="0.5" />
            </svg>

            {/* Grid Lines */}
            <div className="map-grid" />

            {/* Labels */}
            <div className="city-label" style={{ left: '37%', top: '20%' }}>Delhi</div>
            <div className="city-label" style={{ left: '28%', top: '62%' }}>Mumbai</div>
            <div className="city-label" style={{ left: '55%', top: '70%' }}>Chennai</div>
            <div className="city-label" style={{ left: '50%', top: '55%' }}>Hyderabad</div>
            <div className="city-label" style={{ left: '35%', top: '42%' }}>Ahmedabad</div>

            {/* Incident Dots */}
            {filtered.map(inc => {
              if (!inc.location?.gps) return null
              const pos = gpsToPixel(inc.location.gps.lat, inc.location.gps.lng)
              const color = CONTEXT_COLORS[inc.context] || '#fff'
              const isHovered = hovered === inc.incidentId

              return (
                <div
                  key={inc.incidentId}
                  className={`incident-dot ${inc.status === 'active' ? 'dot-active' : ''} ${isHovered ? 'dot-hovered' : ''}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, '--dot-color': color, '--dot-size': inc.severity * 3 + 8 }}
                  onMouseEnter={() => setHovered(inc.incidentId)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => navigate(`/incident/${inc.incidentId}`)}
                  title={inc.incidentId}
                >
                  <div className="dot-ring" />
                  <div className="dot-core">{CONTEXT_ICONS[inc.context]}</div>

                  {isHovered && (
                    <div className="dot-tooltip">
                      <div className="tooltip-id">{inc.incidentId}</div>
                      <div className="tooltip-type">{inc.incidentType?.join(', ').replace(/_/g, ' ')}</div>
                      <div className="tooltip-sev">Severity {inc.severity}/5 · {inc.status}</div>
                      {inc.occupantsAtRisk > 0 && <div className="tooltip-risk">👥 {inc.occupantsAtRisk} at risk</div>}
                      <div className="tooltip-open">Click to open →</div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Map Attribution */}
            <div className="map-attribution">India Region · Anonymised Data · EmergencyMesh Live</div>
          </div>

          {/* Right Panel */}
          <div className="heatmap-panel">
            {/* Filter */}
            <div className="glass-card hmap-filter-card">
              <div className="hmap-filter-title">Filter by Context</div>
              <div className="hmap-filters">
                {['all', 'citizen', 'hotel', 'ship'].map(f => (
                  <button
                    key={f}
                    className={`hmap-filter-btn ${filter === f ? 'active' : ''}`}
                    style={filter === f && f !== 'all' ? { background: `${CONTEXT_COLORS[f]}20`, borderColor: CONTEXT_COLORS[f], color: CONTEXT_COLORS[f] } : {}}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? 'All Types' : `${CONTEXT_ICONS[f]} ${f.charAt(0).toUpperCase() + f.slice(1)}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Incident List */}
            <div className="glass-card hmap-list-card">
              <div className="hmap-list-title">Recent Incidents</div>
              <div className="hmap-list">
                {filtered.slice(0, 8).map(inc => (
                  <div
                    key={inc.incidentId}
                    className={`hmap-list-item ${hovered === inc.incidentId ? 'hovered' : ''}`}
                    onMouseEnter={() => setHovered(inc.incidentId)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => navigate(`/incident/${inc.incidentId}`)}
                  >
                    <div className="hmap-item-icon">{CONTEXT_ICONS[inc.context]}</div>
                    <div className="hmap-item-info">
                      <div className="hmap-item-id">{inc.incidentId}</div>
                      <div className="hmap-item-type">{inc.incidentType?.join(', ').replace(/_/g, ' ')}</div>
                    </div>
                    <div className="hmap-item-right">
                      <div className={`sev-badge sev-${inc.severity}`} style={{ padding: '2px 8px', fontSize: '0.65rem' }}>S{inc.severity}</div>
                      <div className={`status-pill ${inc.status?.replace('_', '-')}`} style={{ fontSize: '0.65rem', padding: '2px 7px', marginTop: 4 }}>{inc.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="glass-card hmap-legend">
              <div className="hmap-list-title">Legend</div>
              {[
                { label: 'Citizen Report', color: '#00d4ff', icon: '🆘' },
                { label: 'Hotel Emergency', color: '#f5a623', icon: '🏨' },
                { label: 'Maritime SOS', color: '#ff3b30', icon: '⚓' },
              ].map(l => (
                <div key={l.label} className="legend-row">
                  <div className="legend-dot" style={{ background: l.color, boxShadow: `0 0 8px ${l.color}` }} />
                  <span>{l.icon}</span>
                  <span className="legend-label">{l.label}</span>
                </div>
              ))}
              <div className="legend-note">Larger dots = higher severity</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
