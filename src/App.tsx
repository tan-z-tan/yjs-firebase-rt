import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Editor } from './Editor'

function RedirectToRandomDoc() {
  // Simple random ID generator
  const randomId = Math.random().toString(36).substring(2, 15)
  return <Navigate to={`/doc/${randomId}`} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RedirectToRandomDoc />} />
        <Route path="/doc/:docId" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
