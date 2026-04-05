import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data, error: dbError } = await supabase
    .from('accounts')
    .select('id,name,currency,color,icon')
    .eq('user_id', user.id)
    .eq('is_hidden', false)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ accounts: data ?? [] })
}
