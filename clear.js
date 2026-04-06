import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearUsers() {
  console.log('Clearing users...')
  // Cannot delete from UI anon key like this easily if RLS is on
  // Let's use postgres direct connection via node pg
}
