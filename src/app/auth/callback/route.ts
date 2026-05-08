import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    console.error('Auth callback error:', error?.message)
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
  }

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // Check allowlist
  const { data: allowed } = await admin
    .from('allowlist')
    .select('email')
    .eq('email', user.email!)
    .single()

  if (!allowed) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/access-denied`)
  }

  // Determine role: first user ever = owner, otherwise inspector
  const { count } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  const role = (count === 0 || count === null) ? 'owner' : 'inspector'

  // Upsert profile
  await admin.from('profiles').upsert({
    id: user.id,
    email: user.email!,
    display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    role,
  }, { onConflict: 'id', ignoreDuplicates: false })

  return NextResponse.redirect(`${origin}/`)
}
