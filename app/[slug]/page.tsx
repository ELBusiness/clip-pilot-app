import { notFound } from 'next/navigation'
import { SPORTS, bySlug } from '@/sports'
import Game from '@/components/Game'

export function generateStaticParams() {
  return SPORTS.map((sport) => ({ slug: sport.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sport = bySlug(slug)
  if (!sport) return {}
  return {
    title: `${sport.slug} — ${sport.sport} perfect season`,
    description: sport.tagline,
  }
}

export default async function SportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sport = bySlug(slug)
  if (!sport) notFound()
  return <Game sportId={sport.id} />
}
