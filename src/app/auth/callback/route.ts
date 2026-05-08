import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      // Check allowlist
      const { data: allowed } = await supabase
        .from('allowlist')
        .select('email')
        .eq('email', user.email)
        .single()

      if (!allowed) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/access-denied`)
      }

      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
