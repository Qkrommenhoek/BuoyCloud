import { StrictMode } from 'react'
import { useState } from 'react'
import './index.css'
import App from './App.tsx'
import Login from './Login.tsx'
import Register from './Register.tsx'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { clearStoredToken, getValidStoredToken } from './auth'

function Root() {
  const [token, setToken] = useState<string | null>(getValidStoredToken)

  function handleAuthError() {
    clearStoredToken()
    setToken(null)
  }

  function handleLogout() {
    clearStoredToken()
    setToken(null)
  }

  return(
    <BrowserRouter>
      <Routes>
      <Route
        path="/"
        element={<App token = {token} onAuthError={handleAuthError} onLogout={handleLogout} />}/>
      <Route path="/login" element={token ? <Navigate to="/" /> : <Login onLogin={setToken} />} />
      <Route path="/register" element={token ? <Navigate to="/" /> : <Register onRegister={setToken} />} />
        
      </Routes>
    </BrowserRouter>
  );
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
)