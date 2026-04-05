import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const type = request.nextUrl.searchParams.get('type')

  let query = supabase
    .from('categories')
    .select('id,name,color,icon,is_income,user_id')
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (type === 'income') {
    query = query.eq('is_income', true)
  }

  if (type === 'expense') {
    query = query.eq('is_income', false)
  }

  const { data, error: dbError } = await query

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ categories: data ?? [] })
}
