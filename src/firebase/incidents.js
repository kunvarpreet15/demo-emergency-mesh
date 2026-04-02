import { mockDB } from '../firebase/mockDB'

// =============================================
// INCIDENTS SERVICE — Firestore CRUD (Mock)
// =============================================

export const subscribeToIncidents = (callback) => {
  return mockDB.subscribe(callback)
}

export const getIncident = (id) => {
  return mockDB.getIncident(id)
}

export const createIncident = (data) => {
  return mockDB.addIncident(data)
}

export const updateIncidentStatus = (id, agencyName, newStatus) => {
  const incident = mockDB.getIncident(id)
  if (!incident) return

  const updatedAgencyStatus = {
    ...incident.agencyStatus,
    [agencyName]: newStatus,
  }

  const timelineEntry = {
    time: new Date().toLocaleTimeString('en-US', { hour12: false }),
    event: `${agencyName.replace('_', ' ')} → ${newStatus.replace('_', ' ')}`,
  }

  mockDB.updateIncident(id, {
    agencyStatus: updatedAgencyStatus,
    timeline: [...(incident.timeline || []), timelineEntry],
  })
}

export const resolveIncident = (id) => {
  const incident = mockDB.getIncident(id)
  if (!incident) return

  mockDB.updateIncident(id, {
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
    timeline: [
      ...(incident.timeline || []),
      {
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        event: 'Incident marked as RESOLVED',
      },
    ],
  })
}
