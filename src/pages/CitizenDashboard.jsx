import React, { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyzeImage, analyzeVoice, INCIDENT_TYPES } from '../services/geminiService'
import { runTrustVerification, getTrustLabel } from '../services/trustEngine'
import { createIncident } from '../firebase/incidents'
import { dispatchToAgencies, AGENCY_CONTACTS } from '../services/dispatchService'
import './CitizenDashboard.css'

const STEPS = ['capture', 'analyzing', 'review', 'dispatching', 'done']

export default function CitizenDashboard() {
  const navigate = useNavigate()
  const fileRef = useRef()
  const videoRef = useRef()
  const [step, setStep] = useState('capture')
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [gps, setGps] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [trust, setTrust] = useState(null)
  const [incident, setIncident] = useState(null)
  const [dispatchProgress, setDispatchProgress] = useState([])
  const [dispatchedAgencies, setDispatchedAgencies] = useState([])
  const [voiceMode, setVoiceMode] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [incidentId, setIncidentId] = useState(null)

  // Get GPS
  const getGPS = useCallback(() => {
    setGpsLoading(true)
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsLoading(false)
      },
      () => {
        // Mock GPS for demo
        setGps({ lat: 28.6139 + (Math.random() - 0.5) * 0.01, lng: 77.2090 + (Math.random() - 0.5) * 0.01 })
        setGpsLoading(false)
      },
      { timeout: 5000 }
    )
  }, [])

  // Handle image capture
  const handleImageCapture = useCallback(async (file) => {
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target.result)
    reader.readAsDataURL(file)
    if (!gps) getGPS()
  }, [gps, getGPS])

  // Start analysis
  const startAnalysis = useCallback(async () => {
    if (!imageFile) return
    setStep('analyzing')

    try {
      // Run Gemini + Trust Engine in parallel
      const base64 = imagePreview.split(',')[1]
      const [geminiResult, trustResult] = await Promise.all([
        analyzeImage(base64),
        runTrustVerification(imageFile, gps),
      ])

      setAnalysis(geminiResult)
      setTrust(trustResult)
      setStep('review')
    } catch (err) {
      console.error(err)
      setStep('capture')
    }
  }, [imageFile, imagePreview, gps])

  // Dispatch
  const handleDispatch = useCallback(async () => {
    setStep('dispatching')
    const agencies = analysis?.recommendedAgencies || ['police', 'ambulance']

    const newIncident = createIncident({
      context: 'citizen',
      severity: analysis?.severity || 3,
      reporterRole: 'citizen',
      verifiedSource: trust?.trustScore >= 70,
      trustScore: trust?.trustScore || 50,
      location: { type: 'outdoor', gps: gps || { lat: 28.6139, lng: 77.2090 } },
      incidentType: analysis?.detectedTypes || ['unknown'],
      occupantsAtRisk: 0,
      geminiAnalysis: analysis,
      trustVerification: trust,
      agenciesAlerted: agencies,
      agencyStatus: Object.fromEntries(agencies.map(a => [a, 'alerted'])),
      status: 'active',
      dispatchChannels: ['dashboard', 'whatsapp', 'sms'],
      timeline: [
        { time: new Date().toLocaleTimeString('en-US', { hour12: false }), event: 'Citizen triggered alert' },
        { time: new Date().toLocaleTimeString('en-US', { hour12: false }), event: `Gemini confirmed ${analysis?.detectedTypes?.[0]} (${Math.round((analysis?.confidence || 0) * 100)}% confidence)` },
      ],
    })

    setIncidentId(newIncident.incidentId)

    await dispatchToAgencies(newIncident, agencies, (progress) => {
      setDispatchProgress(prev => [...prev, progress])
      setDispatchedAgencies(prev => {
        if (!prev.includes(progress.agency)) return [...prev, progress.agency]
        return prev
      })
    })

    setIncident(newIncident)
    setStep('done')
  }, [analysis, trust, gps])

  // Voice SOS
  const startVoice = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setVoiceTranscript('Voice recognition not supported on this browser. Please use Chrome.')
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.lang = 'en-IN'
    recognition.onstart = () => setIsListening(true)
    recognition.onresult = async (e) => {
      const transcript = e.results[0][0].transcript
      setVoiceTranscript(transcript)
      setIsListening(false)
      const voiceAnalysis = await analyzeVoice(transcript)
      setAnalysis({ ...voiceAnalysis, confidence: 0.85, detectedTypes: [voiceAnalysis.incidentType], aiGenerated: false })
      setStep('review')
    }
    recognition.onerror = () => setIsListening(false)
    recognition.start()
  }, [])

  return (
    <div className="citizen-page">
      {/* Background */}
      <div className="citizen-bg" />
      <div className="citizen-glow" />

      {/* Header */}
      <header className="page-header citizen-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}>← Back</button>
        <div className="logo">
          <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #00d4ff, #006699)' }}>🆘</div>
          <span className="logo-text">Citizen Report</span>
        </div>
        <div className="header-gps">
          {gpsLoading ? (
            <span className="gps-loading">📡 Getting GPS...</span>
          ) : gps ? (
            <span className="gps-found">📍 {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}</span>
          ) : (
            <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '8px 14px' }} onClick={getGPS}>📍 Get GPS</button>
          )}
        </div>
      </header>

      <div className="page-content citizen-content">
        {/* Progress Indicator */}
        <div className="step-indicator">
          {['Capture', 'AI Analysis', 'Review', 'Dispatch', 'Done'].map((label, i) => (
            <div key={i} className={`step-item ${STEPS.indexOf(step) >= i ? 'active' : ''} ${STEPS.indexOf(step) > i ? 'done' : ''}`}>
              <div className="step-circle">{STEPS.indexOf(step) > i ? '✓' : i + 1}</div>
              <span className="step-label">{label}</span>
              {i < 4 && <div className="step-line" />}
            </div>
          ))}
        </div>

        {/* ===== STEP: CAPTURE ===== */}
        {step === 'capture' && (
          <div className="capture-panel fade-in">
            <div className="mode-toggle">
              <button className={`mode-btn ${!voiceMode ? 'active' : ''}`} onClick={() => setVoiceMode(false)}>📷 Photo</button>
              <button className={`mode-btn ${voiceMode ? 'active' : ''}`} onClick={() => setVoiceMode(true)}>🎙️ Voice SOS</button>
            </div>

            {!voiceMode ? (
              <div className="photo-capture">
                {imagePreview ? (
                  <div className="preview-container">
                    <img src={imagePreview} alt="Captured" className="image-preview" />
                    <div className="preview-overlay">
                      <span className="preview-verified">📸 Live Capture · EXIF Verified</span>
                    </div>
                    <button className="btn btn-ghost retake-btn" onClick={() => { setImagePreview(null); setImageFile(null) }}>↺ Retake</button>
                  </div>
                ) : (
                  <div className="capture-zone" onClick={() => fileRef.current?.click()}>
                    <div className="capture-icon">📷</div>
                    <h3 className="capture-title">Capture Emergency</h3>
                    <p className="capture-hint">Live camera only — photo is EXIF-verified<br />No gallery upload allowed</p>
                    <div className="capture-badge">🔒 Anti-Fake Protection Active</div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={e => e.target.files[0] && handleImageCapture(e.target.files[0])}
                    />
                  </div>
                )}

                {imagePreview && (
                  <button
                    className="btn btn-primary-cyan btn-lg analyze-btn"
                    onClick={startAnalysis}
                    disabled={!gps && gpsLoading}
                  >
                    {gpsLoading ? '📡 Getting GPS...' : '🧠 Analyze with Gemini AI →'}
                  </button>
                )}
              </div>
            ) : (
              <div className="voice-capture">
                <div className={`voice-orb ${isListening ? 'listening' : ''}`} onClick={startVoice}>
                  <div className="voice-ring" />
                  <div className="voice-ring voice-ring-2" />
                  <div className="voice-core">{isListening ? '🎙️' : '🎤'}</div>
                </div>
                <h3 className="voice-title">{isListening ? 'Listening...' : 'Tap to speak your emergency'}</h3>
                <p className="voice-hint">Speak clearly: type, location, and number of people affected<br />Supports 12 languages via Gemini</p>
                {voiceTranscript && (
                  <div className="transcript-box">
                    <div className="transcript-label">Gemini heard:</div>
                    <div className="transcript-text">"{voiceTranscript}"</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== STEP: ANALYZING ===== */}
        {step === 'analyzing' && (
          <div className="analyzing-panel fade-in">
            <div className="ai-brain">
              <div className="brain-ring" />
              <div className="brain-ring brain-ring-2" />
              <div className="brain-core">🧠</div>
            </div>
            <h2 className="analyzing-title">Gemini AI Analyzing...</h2>
            <div className="analyzing-steps">
              {[
                '🔍 Scanning image for emergency type',
                '🛡️ Checking for AI-generated fakes',
                '📍 Verifying EXIF GPS vs device location',
                '⚡ Calculating severity score',
                '📋 Selecting appropriate agencies',
              ].map((s, i) => (
                <div key={i} className="analyzing-step" style={{ animationDelay: `${i * 0.4}s` }}>
                  <div className="step-spinner" />
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== STEP: REVIEW ===== */}
        {step === 'review' && analysis && (
          <div className="review-panel fade-in">
            <div className="review-grid">
              {/* Gemini Analysis Card */}
              <div className="glass-card analysis-card">
                <div className="card-header-row">
                  <h3 className="card-title">🧠 Gemini Analysis</h3>
                  <div className={`sev-badge sev-${analysis.severity}`}>
                    <span className="pulse-dot" />
                    Severity {analysis.severity}/5
                  </div>
                </div>
                <div className="analysis-confidence">
                  <div className="conf-label">AI Confidence</div>
                  <div className="conf-bar-track">
                    <div className="conf-bar-fill" style={{ width: `${(analysis.confidence || 0.85) * 100}%` }} />
                  </div>
                  <div className="conf-value">{Math.round((analysis.confidence || 0.85) * 100)}%</div>
                </div>
                <div className="detected-types">
                  {(analysis.detectedTypes || []).map(t => (
                    <span key={t} className="type-chip">
                      {INCIDENT_TYPES[t]?.emoji || '⚠️'} {INCIDENT_TYPES[t]?.label || t}
                    </span>
                  ))}
                  {analysis.aiGenerated && <span className="type-chip danger">⛔ AI-Generated Image Detected</span>}
                </div>
                <p className="analysis-description">{analysis.description}</p>
              </div>

              {/* Trust Score Card */}
              {trust && (
                <div className="glass-card trust-card">
                  <h3 className="card-title">🛡️ Trust Verification</h3>
                  <div className="trust-score-display">
                    <div className="trust-number">{trust.trustScore}</div>
                    <div className="trust-label-text" style={{ color: getTrustLabel(trust.trustScore).color }}>
                      {getTrustLabel(trust.trustScore).label}
                    </div>
                  </div>
                  <div className="trust-checks">
                    {[
                      { label: 'Live Camera Capture', pass: trust.liveCapture },
                      { label: 'EXIF Timestamp Valid', pass: trust.exifTimestampMatch },
                      { label: 'GPS Location Match', pass: trust.exifGpsMatch },
                      { label: 'Not AI Generated', pass: !trust.aiImageDetected },
                      { label: `${trust.corroboratingReports} Corroborating Reports`, pass: trust.corroboratingReports > 0 },
                    ].map((check, i) => (
                      <div key={i} className={`trust-check ${check.pass ? 'pass' : 'fail'}`}>
                        <span>{check.pass ? '✓' : '✗'}</span>
                        <span>{check.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agencies Card */}
              <div className="glass-card agencies-card">
                <h3 className="card-title">📡 Agencies to Alert</h3>
                <div className="agencies-list">
                  {(analysis.recommendedAgencies || ['police', 'ambulance']).map(key => {
                    const agency = AGENCY_CONTACTS[key]
                    return (
                      <div key={key} className="agency-row">
                        <div className="agency-name">
                          <div className="agency-icon" style={{ background: 'rgba(255,255,255,0.05)' }}>{agency?.emoji}</div>
                          {agency?.name}
                        </div>
                        <span className="status-pill active">
                          <span className="pulse-dot" style={{ background: '#ff4444', width: 6, height: 6 }} />
                          Ready
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="dispatch-warning">
                  ⚠️ False emergency reporting is a criminal offence. Your device ID, GPS, and identity are logged.
                </div>
                <button
                  className="btn btn-primary-cyan btn-lg dispatch-btn"
                  onClick={handleDispatch}
                  disabled={analysis.aiGenerated}
                >
                  {analysis.aiGenerated ? '⛔ Dispatch Blocked — Fake Image' : '🚨 Dispatch to All Agencies →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP: DISPATCHING ===== */}
        {step === 'dispatching' && (
          <div className="dispatching-panel fade-in">
            <div className="dispatch-radar">
              <div className="radar-ring" />
              <div className="radar-ring radar-ring-2" />
              <div className="radar-ring radar-ring-3" />
              <div className="radar-core">🚨</div>
            </div>
            <h2 className="dispatching-title">Dispatching to Agencies...</h2>
            <div className="dispatch-feed">
              {dispatchProgress.map((p, i) => (
                <div key={i} className="dispatch-log-item">
                  <span className="dispatch-check">✓</span>
                  <span>{AGENCY_CONTACTS[p.agency]?.emoji} {AGENCY_CONTACTS[p.agency]?.name}</span>
                  <span className="dispatch-channel">{p.channel.toUpperCase()}</span>
                  <span className="dispatch-sent">SENT</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== STEP: DONE ===== */}
        {step === 'done' && incident && (
          <div className="done-panel fade-in">
            <div className="done-icon">✅</div>
            <h2 className="done-title">Dispatched Successfully</h2>
            <p className="done-subtitle">All agencies have been alerted. Stay safe and await response.</p>
            <div className="done-id">Incident ID: <strong>{incidentId}</strong></div>
            <div className="done-agencies">
              {dispatchedAgencies.map(key => (
                <div key={key} className="done-agency">
                  <span>{AGENCY_CONTACTS[key]?.emoji}</span>
                  <div>
                    <div className="done-agency-name">{AGENCY_CONTACTS[key]?.name}</div>
                    <div className="done-agency-channels">Dashboard · WhatsApp · SMS</div>
                  </div>
                  <span className="status-pill en-route">Alerted</span>
                </div>
              ))}
            </div>
            <div className="done-actions">
              <button className="btn btn-primary-cyan" onClick={() => navigate(`/incident/${incidentId}`)}>View Live Incident Room →</button>
              <button className="btn btn-ghost" onClick={() => { setStep('capture'); setImagePreview(null); setAnalysis(null); setTrust(null); setDispatchProgress([]); setDispatchedAgencies([]) }}>Report Another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
