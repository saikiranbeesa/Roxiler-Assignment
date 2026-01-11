import React, { useEffect, useState } from 'react'
import { get, post } from '../api'
import './StoreList.css'

export default function StoreList({ token, user }){
  const [stores, setStores] = useState([])
  const [q,setQ]=useState('')
  const [rating,setRating]=useState(5)

  useEffect(()=>{ fetchStores() }, [])

  async function fetchStores(){
    const r = await get('/stores');
    setStores(r || [])
  }

  async function submitRating(storeId){
    if (!token) { alert('Login as User to rate'); return }
    const r = await post(`/stores/${storeId}/ratings`, { rating }, token)
    alert(JSON.stringify(r))
    fetchStores()
  }

  return (
    <div>
      <h3 className='heading'>Stores</h3>
      <div style={{marginBottom:8}}>
        <input placeholder="search" value={q} onChange={e=>setQ(e.target.value)} />
        <button className='button2' onClick={()=>{ get('/stores?q='+encodeURIComponent(q)).then(r=>setStores(r))}}>Search</button>
        <button className='button2' onClick={fetchStores}>Refresh</button>
      </div>
      <div>
        <label>Rating: <select value={rating} onChange={e=>setRating(Number(e.target.value))}>{[1,2,3,4,5].map(n=> <option key={n} value={n}>{n}</option>)}</select></label>
      </div>
      <ul>
        {stores.map(s=> (
          <li key={s.id} style={{marginBottom:8}}>
            <strong>{s.name}</strong> — {s.address} — Avg: {s.avg_rating || '—'}
            <div>
              <button onClick={()=>submitRating(s.id)}>Rate {s.name}</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
