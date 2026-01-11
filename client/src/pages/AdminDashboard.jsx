import React, { useEffect, useState } from 'react'
import { get, post } from '../api'

export default function AdminDashboard({ token }){
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(()=>{ load(); }, [])

  async function load(){
    const u = await get('/users', token)
    setUsers(u || [])
    const stores = await get('/stores')
    const r = await get('/status')
    setStats({ users: u.length, stores: stores.length })
  }

  return (
    <div>
      <h3>Admin Dashboard</h3>
      {stats && <div>Total users: {stats.users} — stores: {stats.stores}</div>}
      <h4>Users</h4>
      <table border="1" cellPadding="6">
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th></tr></thead>
        <tbody>{users.map(u=> <tr key={u.id}><td>{u.id}</td><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
