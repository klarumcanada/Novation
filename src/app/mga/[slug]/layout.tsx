import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import MgaNav from '@/components/MgaNav'

export default async function MgaLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify this user belongs to this MGA
  const { data: mgaUser } = await supabase
    .from('mga_users')
    .select('role, mgas(id, name, slug)')
    .eq('user_id', user.id)
    .single()

  if (!mgaUser) redirect('/login')

  const mga = mgaUser.mgas as { id: string; name: string; slug: string }
  if (mga.slug !== slug) redirect('/login')

  return (
    <div className="mga-layout">
      <MgaNav
        mgaName={mga.name}
        mgaSlug={mga.slug}
        userEmail={user.email ?? ''}
      />
      {children}
    </div>
  )
}