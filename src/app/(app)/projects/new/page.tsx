'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data, error: insertError } = await supabase
      .from('projects')
      .insert({ name: name.trim(), address: address.trim() || null, created_by: user.id })
      .select('id')
      .single()

    if (insertError || !data) {
      setError('יצירת הפרויקט נכשלה. נסה שוב.')
      setLoading(false)
      return
    }

    router.push(`/projects/${data.id}`)
  }

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="text-gray-400 hover:text-gray-600">
          <ArrowRight size={20} />
        </Link>
        <h1 className="text-xl font-bold">פרויקט חדש</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">שם הפרויקט *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="לדוגמה: אלנבי 47 תל אביב"
            required
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">כתובת</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="רחוב ומספר, עיר"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
          {loading ? 'יוצר...' : 'צור פרויקט'}
        </Button>
      </form>
    </div>
  )
}
