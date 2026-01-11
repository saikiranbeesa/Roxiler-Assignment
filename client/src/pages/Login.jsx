import React, { useState } from 'react'
import { post } from '../api'

export default function Login({ onLogin }){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [err,setErr]=useState(null)

  async function submit(e){
    e.preventDefault()
    const r = await post('/auth/login', { email, password })
    if (r.token) onLogin(r.token, r.user)
    else setErr(r.message || JSON.stringify(r))
  }

  return (
    <form onSubmit={submit} style={{maxWidth:360}}>
      <h3>Login</h3>
      <div><input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div><input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
      <div><button className='button2' type="submit">Login</button></div>
      {err && <div style={{color:'red'}}>{err}</div>}
    </form>
  )
}
