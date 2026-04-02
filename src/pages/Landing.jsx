import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Landing.css'

const roles = [
  {
    id: 'citizen',
    emoji: '🆘',
    title: 'Public Citizen',
    subtitle: 'Report accidents, fires & emergencies',
    description: 'Capture live photo or use voice — Gemini AI tags the emergency and dispatches all relevant agencies simultaneously.',
    accent: '#00d4ff',
    accentDim: 'rgba(0,212,255,0.12)',
    border: 'rgba(0,212,255,0.25)',
    features: ['Live photo capture', 'AI incident tagging', 'GPS auto-locate', 'Multi-agency dispatch'],
    path: '/citizen',
  },
  {
    id: 'hotel',
    emoji: '🏨',
    title: 'Hotel Manager',
    subtitle: 'Floor-by-floor emergency control',
    description: 'Tap any floor to raise an alert. The system knows occupancy, draws evacuation routes, and alerts fire brigade, police & hospital in 3 seconds.',
    accent: '#f5a623',
    accentDim: 'rgba(245,166,35,0.12)',
    border: 'rgba(245,166,35,0.25)',
    features: ['Interactive floor plan', 'Guest evacuation push', 'Occupancy tracking', 'Agency handoff protocol'],
    path: '/hotel',
  },
  {
    id: 'ship',
    emoji: '⚓',
    title: 'Ship Captain',
    subtitle: 'Maritime SOS — works offline at sea',
    description: 'One SOS tap auto-sends GPS, vessel type, crew count & cargo to coast guard, port hospital, and port authority. Works with zero signal — queued offline.',
    accent: '#ff3b30',
    accentDim: 'rgba(255,59,48,0.12)',
    border: 'rgba(255,59,48,0.25)',
    features: ['Offline-first SOS queue', 'Auto GPS capture', 'Vessel data broadcast', 'Coast Guard dispatch'],
    path: '/ship',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const [hoveredRole, setHoveredRole] = useState(null)
  const [visible, setVisible] = useState(false)
  const [stats] = useState({ incidents: 2847, agencies: 312, cities: 48, lives: '12K+' })

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="landing">
      {/* Background grid */}
      <div className="landing-grid" />
      <div className="landing-glow landing-glow-1" />
      <div className="landing-glow landing-glow-2" />
      <div className="landing-glow landing-glow-3" />

      {/* Header */}
      <header className={`landing-header ${visible ? 'visible' : ''}`}>
        <div className="logo">
          <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #ff3b30, #ff6b35)' }}>🚨</div>
          <span className="logo-text">EmergencyMesh</span>
          <span className="logo-badge" style={{ background: 'rgba(255,59,48,0.15)', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.3)' }}>BETA</span>
        </div>
        <nav className="landing-nav">
          <button className="btn btn-ghost" onClick={() => navigate('/agency')}>Agency Dashboard</button>
          <button className="btn btn-ghost" onClick={() => navigate('/heatmap')}>City Heatmap</button>
        </nav>
      </header>

      {/* Hero */}
      <section className={`landing-hero ${visible ? 'visible' : ''}`}>
        <div className="hero-tag">
          <span className="pulse-dot" style={{ background: '#ff3b30' }} />
          Powered by Gemini AI · Firebase Real-time · 6-Layer Trust Engine
        </div>
        <h1 className="hero-title">
          One Platform.<br />
          <span className="hero-title-gradient">Every Emergency.</span>
        </h1>
        <p className="hero-subtitle">
          Hotel fires, maritime SOS, or roadside accidents — EmergencyMesh dispatches all relevant agencies in under 3 seconds using Gemini AI, regardless of internet connectivity.
        </p>

        {/* Stats Row */}
        <div className="stats-row">
          {[
            { value: stats.incidents.toLocaleString(), label: 'Incidents Handled' },
            { value: stats.agencies, label: 'Agencies Connected' },
            { value: stats.cities, label: 'Cities Covered' },
            { value: stats.lives, label: 'Lives Impacted' },
          ].map((s, i) => (
            <div key={i} className="stat-item" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Role Cards */}
      <section className={`roles-section ${visible ? 'visible' : ''}`}>
        <p className="roles-hint">Select your role to begin</p>
        <div className="roles-grid">
          {roles.map((role, i) => (
            <button
              key={role.id}
              className={`role-card ${hoveredRole === role.id ? 'hovered' : ''}`}
              style={{
                '--accent': role.accent,
                '--accent-dim': role.accentDim,
                '--accent-border': role.border,
                animationDelay: `${i * 0.12}s`,
              }}
              onMouseEnter={() => setHoveredRole(role.id)}
              onMouseLeave={() => setHoveredRole(null)}
              onClick={() => navigate(role.path)}
              id={`role-${role.id}`}
            >
              <div className="role-card-glow" />
              <div className="role-emoji">{role.emoji}</div>
              <div className="role-content">
                <h2 className="role-title">{role.title}</h2>
                <p className="role-subtitle">{role.subtitle}</p>
                <p className="role-desc">{role.description}</p>
                <ul className="role-features">
                  {role.features.map((f, j) => (
                    <li key={j} className="role-feature">
                      <span className="feature-check">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="role-cta">
                <span>Enter Dashboard</span>
                <span className="role-arrow">→</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* SDG Badges */}
      <section className={`sdg-section ${visible ? 'visible' : ''}`}>
        <p className="sdg-label">Addressing UN Sustainable Development Goals</p>
        <div className="sdg-row">
          {[
            { num: 3, label: 'Good Health', color: '#4CAF50' },
            { num: 11, label: 'Sustainable Cities', color: '#FF9800' },
            { num: 14, label: 'Life Below Water', color: '#2196F3' },
            { num: 10, label: 'Reduced Inequalities', color: '#E91E63' },
            { num: 13, label: 'Climate Action', color: '#009688' },
          ].map(sdg => (
            <div key={sdg.num} className="sdg-badge" style={{ '--sdg-color': sdg.color }}>
              <span className="sdg-num">SDG {sdg.num}</span>
              <span className="sdg-name">{sdg.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>Built for Google Solution Challenge 2026 · EmergencyMesh © 2026</p>
      </footer>
    </div>
  )
}
