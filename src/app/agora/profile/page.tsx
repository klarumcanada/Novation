'use client'

import { useEffect, useState } from 'react'
import AgoraNav from '@/components/AgoraNav'
import { AgoraProfileView, ProfileData } from './_components/ProfileView'

const BRAND = { chalk: '#F8F7F4', midnight: '#0D1B3E' }

export default function OwnProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/agora/profile')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh' }}>
      <AgoraNav />
      {loading ? (
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Loading…</p>
        </div>
      ) : error ? (
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>{error}</p>
        </div>
      ) : data ? (
        <AgoraProfileView data={data} isSelf />
      ) : null}
    </div>
  )
}
