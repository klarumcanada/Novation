import type { Metadata } from 'next'
import HomeClient from './HomeClient'

export const metadata: Metadata = {
  title: 'Klarum — We handle the tech. You handle the business.',
}

export default function Page() {
  return <HomeClient />
}
