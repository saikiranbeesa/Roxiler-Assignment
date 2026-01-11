import React, { useState } from 'react'
import { post } from '../api'

export default function Register({ onLogin }){
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [address,setAddress]=useState('')
  const [err,setErr]=useState(null)

  async function submit(e){
    e.preventDefault()
    const r = await post('/auth/register', { name, email, password, address })
    if (r.token) onLogin(r.token, r.user)
    else setErr(JSON.stringify(r))
  }

  return (
    <form onSubmit={submit} style={{maxWidth:480}}>
      <h3>Register (User)</h3>
      <div><input placeholder="Full name (20-60 chars)" value={name} onChange={e=>setName(e.target.value)} /></div>
      <div><input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div><input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
      <div><input placeholder="address" value={address} onChange={e=>setAddress(e.target.value)} /></div>
      <div><button className='button2' type="submit">Register</button></div>
      {err && <div style={{color:'red'}}>{err}</div>}
    </form>
  )
}
