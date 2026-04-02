import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import CitizenDashboard from './pages/CitizenDashboard'
import HotelDashboard from './pages/HotelDashboard'
import ShipDashboard from './pages/ShipDashboard'
import AgencyDashboard from './pages/AgencyDashboard'
import IncidentRoom from './pages/IncidentRoom'
import CityHeatmap from './pages/CityHeatmap'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/citizen" element={<CitizenDashboard />} />
        <Route path="/hotel" element={<HotelDashboard />} />
        <Route path="/ship" element={<ShipDashboard />} />
        <Route path="/agency" element={<AgencyDashboard />} />
        <Route path="/incident/:id" element={<IncidentRoom />} />
        <Route path="/heatmap" element={<CityHeatmap />} />
      </Routes>
    </BrowserRouter>
  )
}
