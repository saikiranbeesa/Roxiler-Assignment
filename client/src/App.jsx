import React, { useState } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import StoreList from './pages/StoreList'
import AdminDashboard from './pages/AdminDashboard'
import './App.css'

export default function App(){
  const [page, setPage] = useState('stores')
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')||'null'))

  function handleLogin(tok, u){
    setToken(tok); setUser(u); localStorage.setItem('token', tok); localStorage.setItem('user', JSON.stringify(u));
  }
  function logout(){ setToken(null); setUser(null); localStorage.removeItem('token'); localStorage.removeItem('user'); }

  return (
    <div className='main-container'>
      <nav style={{marginBottom:12}}>
        <button className='button' onClick={()=>setPage('stores')}>Stores</button>
        <button className='button' onClick={()=>setPage('login')}>Login</button>
        <button className='button' onClick={()=>setPage('register')}>Register</button>
        {user && user.role==='Admin' && <button className='button' onClick={()=>setPage('admin')}>Admin</button>}
        {user && <button className='button2' onClick={logout}>Logout</button>}
      </nav>
      <div>
        {page==='login' && <Login onLogin={handleLogin} />}
        {page==='register' && <Register onLogin={handleLogin} />}
        {page==='stores' && <StoreList token={token} user={user} />}
        {page==='admin' && user && user.role==='Admin' && <AdminDashboard token={token} />}
      </div>
    </div>
  )
}
