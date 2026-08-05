'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AgoraNav from '@/components/AgoraNav'
import { AgoraProfileView, ProfileData } from '../_components/ProfileView'

const BRAND = { chalk: '#F8F7F4' }

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/agora/profile/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div style={{ background: BRAND.chalk, minHeight: '100vh' }}>
      <AgoraNav />
      {loading ? (
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>Loading…</p>
        </div>
      ) : error ? (
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#9CA3AF' }}>
            {error === 'Forbidden' ? 'You don't have permission to view this profile.' : error}
          </p>
        </div>
      ) : data ? (
        <AgoraProfileView data={data} isSelf={false} />
      ) : null}
    </div>
  )
}
