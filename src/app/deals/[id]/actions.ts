'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Required DB migration before using this action:
//   ALTER TABLE deal_clients ADD COLUMN IF NOT EXISTS carrier   text;
//   ALTER TABLE deal_clients ADD COLUMN IF NOT EXISTS policy_id text;
//   ALTER TABLE deal_clients ADD COLUMN IF NOT EXISTS source    text;

// ── Contracting validation ────────────────────────────────────────────────────

export type CarrierContractingRow = {
  carrier:        string
  sellerPolicies: number
  buyerStatus:    'active' | 'pending' | 'missing'
}

const CONTRACTING_SEED: CarrierContractingRow[] = [
  { carrier: 'Canada Life',   sellerPolicies: 14, buyerStatus: 'active'  },
  { carrier: 'Sun Life',      sellerPolicies: 11, buyerStatus: 'active'  },
  { carrier: 'Manulife',      sellerPolicies: 9,  buyerStatus: 'pending' },
  { carrier: 'iA Financial',  sellerPolicies: 8,  buyerStatus: 'active'  },
  { carrier: 'Empire Life',   sellerPolicies: 5,  buyerStatus: 'missing' },
  { carrier: 'RBC Insurance', sellerPolicies: 3,  buyerStatus: 'missing' },
]

// ── Book transfer complete ────────────────────────────────────────────────────
// Required DB migration:
//   ALTER TABLE deals ADD COLUMN IF NOT EXISTS book_transfer_completed_at timestamptz;

export async function completeBookTransfer(dealId: string): Promise<void> {
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
  if (!user) throw new Error('Unauthorized')

  const { data: deal } = await supabase
    .from('deals')
    .select('seller_id, buyer_id, status')
    .eq('id', dealId)
    .single()

  if (!deal) throw new Error('Deal not found')
  if (deal.seller_id !== user.id && deal.buyer_id !== user.id) throw new Error('Unauthorized')
  if (deal.status !== 'book_transfer') throw new Error('Deal is not in the book transfer stage')

  const { error } = await supabase
    .from('deals')
    .update({
      status: 'closed',
      book_transfer_completed_at: new Date().toISOString(),
    })
    .eq('id', dealId)

  if (error) throw new Error(error.message)
}

export async function validateContracting(dealId: string): Promise<{ carriers: CarrierContractingRow[] }> {
  // Simulate third-party authority API latency
  await new Promise(r => setTimeout(r, 1400))

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
  if (!user) throw new Error('Unauthorized')

  const { data: deal } = await supabase
    .from('deals')
    .select('seller_id, buyer_id')
    .eq('id', dealId)
    .single()

  if (!deal || (deal.seller_id !== user.id && deal.buyer_id !== user.id)) {
    throw new Error('Unauthorized')
  }

  return { carriers: CONTRACTING_SEED }
}

export type ImportedClient = {
  id: string
  client_name: string
  client_email: string
  carrier: string | null
  policy_id: string | null
  consent_status: 'pending' | 'consented' | 'refused'
  consent_responded_at: string | null
  email_sent_at: string | null
}

const SEED_CLIENTS = [
  { client_name: 'James & Patricia Holloway',   client_email: 'james.holloway@email.com',  carrier: 'Sun Life',     policy_id: 'SL-10042'  },
  { client_name: 'Nicole Osborne',              client_email: 'n.osborne@email.com',        carrier: 'Manulife',     policy_id: 'ML-88321'  },
  { client_name: 'Robert Tran',                 client_email: 'r.tran@email.com',           carrier: 'Canada Life',  policy_id: 'CL-55910'  },
  { client_name: 'Priya & Raj Mehta',           client_email: 'priya.mehta@email.com',      carrier: 'iA Financial', policy_id: 'IA-20034'  },
  { client_name: 'Sandra Kowalski',             client_email: 's.kowalski@email.com',       carrier: 'Sun Life',     policy_id: 'SL-33871'  },
  { client_name: 'David & Lynn Nguyen',         client_email: 'd.nguyen@email.com',         carrier: 'Manulife',     policy_id: 'ML-44290'  },
  { client_name: 'Catherine Mbeki',             client_email: 'c.mbeki@email.com',          carrier: 'Canada Life',  policy_id: 'CL-19832'  },
  { client_name: 'Thomas & Rose Petrov',        client_email: 't.petrov@email.com',         carrier: 'RBC Insurance',policy_id: 'RBC-77123' },
  { client_name: 'Amara Osei',                  client_email: 'a.osei@email.com',           carrier: 'Sun Life',     policy_id: 'SL-60214'  },
  { client_name: 'George & Helen Papadopoulos', client_email: 'g.papadopoulos@email.com',   carrier: 'iA Financial', policy_id: 'IA-55302'  },
  { client_name: 'Michelle Fontaine',           client_email: 'm.fontaine@email.com',       carrier: 'Manulife',     policy_id: 'ML-92817'  },
  { client_name: 'Kevin & Susan Blackwood',     client_email: 'k.blackwood@email.com',      carrier: 'Canada Life',  policy_id: 'CL-38871'  },
  { client_name: 'Fatima Al-Rashid',            client_email: 'f.alrashid@email.com',       carrier: 'Sun Life',     policy_id: 'SL-77430'  },
  { client_name: 'Daniel & Monica Varga',       client_email: 'd.varga@email.com',          carrier: 'RBC Insurance',policy_id: 'RBC-20019' },
  { client_name: 'Lydia Chambers',              client_email: 'l.chambers@email.com',       carrier: 'Manulife',     policy_id: 'ML-61109'  },
  { client_name: 'Samuel & Joy Okonkwo',        client_email: 's.okonkwo@email.com',        carrier: 'iA Financial', policy_id: 'IA-40321'  },
  { client_name: 'Anna Leclerc',                client_email: 'a.leclerc@email.com',        carrier: 'Canada Life',  policy_id: 'CL-88123'  },
  { client_name: 'Paul & Diane Westbrook',      client_email: 'p.westbrook@email.com',      carrier: 'Sun Life',     policy_id: 'SL-51002'  },
  { client_name: 'Harpreet Singh',              client_email: 'h.singh@email.com',          carrier: 'Manulife',     policy_id: 'ML-30045'  },
  { client_name: 'Carol & Frank Dimitriou',     client_email: 'c.dimitriou@email.com',      carrier: 'Canada Life',  policy_id: 'CL-72991'  },
  { client_name: 'Marcus Webb',                 client_email: 'm.webb@email.com',           carrier: 'RBC Insurance',policy_id: 'RBC-44210' },
  { client_name: 'Ling & Wei Zhang',            client_email: 'l.zhang@email.com',          carrier: 'Sun Life',     policy_id: 'SL-29871'  },
  { client_name: 'Brigitte Moreau',             client_email: 'b.moreau@email.com',         carrier: 'iA Financial', policy_id: 'IA-61204'  },
  { client_name: 'Anthony & Sara Russo',        client_email: 'a.russo@email.com',          carrier: 'Manulife',     policy_id: 'ML-50034'  },
  { client_name: 'Ingrid Halvorsen',            client_email: 'i.halvorsen@email.com',      carrier: 'Canada Life',  policy_id: 'CL-44321'  },
  { client_name: 'Winston & Gloria Baptiste',   client_email: 'w.baptiste@email.com',       carrier: 'Sun Life',     policy_id: 'SL-83920'  },
  { client_name: 'Mei-Ling Cho',               client_email: 'ml.cho@email.com',           carrier: 'RBC Insurance',policy_id: 'RBC-31102' },
  { client_name: 'Patrick & Louise Brennan',    client_email: 'p.brennan@email.com',        carrier: 'iA Financial', policy_id: 'IA-70219'  },
  { client_name: 'Yusuf Ibrahim',               client_email: 'y.ibrahim@email.com',        carrier: 'Manulife',     policy_id: 'ML-19023'  },
  { client_name: 'Dorothy & Earl Hutchinson',   client_email: 'd.hutchinson@email.com',     carrier: 'Canada Life',  policy_id: 'CL-60441'  },
  { client_name: 'Carmen Reyes',                client_email: 'c.reyes@email.com',          carrier: 'Sun Life',     policy_id: 'SL-44812'  },
  { client_name: 'Bernard & Colette Lavoie',    client_email: 'b.lavoie@email.com',         carrier: 'RBC Insurance',policy_id: 'RBC-55671' },
  { client_name: 'Nadia Volkov',                client_email: 'n.volkov@email.com',         carrier: 'iA Financial', policy_id: 'IA-88012'  },
  { client_name: 'Raymond & Alice Thibodeau',   client_email: 'r.thibodeau@email.com',      carrier: 'Manulife',     policy_id: 'ML-73301'  },
  { client_name: 'Josephine Adeyemi',           client_email: 'j.adeyemi@email.com',        carrier: 'Canada Life',  policy_id: 'CL-29110'  },
  { client_name: 'Stuart & Pamela Forsyth',     client_email: 's.forsyth@email.com',        carrier: 'Sun Life',     policy_id: 'SL-91230'  },
  { client_name: 'Kenji Nakamura',              client_email: 'k.nakamura@email.com',       carrier: 'RBC Insurance',policy_id: 'RBC-60034' },
  { client_name: 'Cecile & Marc Beaumont',      client_email: 'c.beaumont@email.com',       carrier: 'iA Financial', policy_id: 'IA-33019'  },
  { client_name: 'Trevor Olawale',              client_email: 't.olawale@email.com',        carrier: 'Manulife',     policy_id: 'ML-84412'  },
  { client_name: 'Irene & Frank Kozlowski',     client_email: 'i.kozlowski@email.com',      carrier: 'Canada Life',  policy_id: 'CL-51209'  },
  { client_name: 'Simone Tremblay',             client_email: 's.tremblay@email.com',       carrier: 'Sun Life',     policy_id: 'SL-70034'  },
  { client_name: 'Harold & Ruth Mackenzie',     client_email: 'h.mackenzie@email.com',      carrier: 'RBC Insurance',policy_id: 'RBC-43901' },
  { client_name: 'Anika Sharma',               client_email: 'a.sharma@email.com',         carrier: 'iA Financial', policy_id: 'IA-22341'  },
  { client_name: 'Lionel & Grace Dupont',       client_email: 'l.dupont@email.com',         carrier: 'Manulife',     policy_id: 'ML-60912'  },
  { client_name: 'Theresa Mwangi',              client_email: 't.mwangi@email.com',         carrier: 'Canada Life',  policy_id: 'CL-38401'  },
  { client_name: 'Conrad & Sylvia Baxter',      client_email: 'c.baxter@email.com',         carrier: 'Sun Life',     policy_id: 'SL-55091'  },
  { client_name: 'Roxanne Leblanc',             client_email: 'r.leblanc@email.com',        carrier: 'RBC Insurance',policy_id: 'RBC-71230' },
  { client_name: 'Olivier & Martine Gagnon',    client_email: 'o.gagnon@email.com',         carrier: 'iA Financial', policy_id: 'IA-49012'  },
  { client_name: 'Winona Clearsky',             client_email: 'w.clearsky@email.com',       carrier: 'Manulife',     policy_id: 'ML-33219'  },
  { client_name: 'Edgar & Florence Whitmore',   client_email: 'e.whitmore@email.com',       carrier: 'Canada Life',  policy_id: 'CL-80341'  },
]

const SEED_POLICIES = [
  { product_type: 'life',             annual_premium: 42_000, status: 'active',   carrier: 'Canada Life'   },
  { product_type: 'life',             annual_premium: 31_500, status: 'active',   carrier: 'Sun Life'      },
  { product_type: 'life',             annual_premium: 18_200, status: 'active',   carrier: 'Manulife'      },
  { product_type: 'life',             annual_premium: 9_800,  status: 'lapsed',   carrier: 'iA Financial'  },
  { product_type: 'disability',       annual_premium: 27_600, status: 'active',   carrier: 'Sun Life'      },
  { product_type: 'disability',       annual_premium: 14_400, status: 'active',   carrier: 'Manulife'      },
  { product_type: 'disability',       annual_premium: 8_100,  status: 'lapsed',   carrier: 'Canada Life'   },
  { product_type: 'critical_illness', annual_premium: 19_500, status: 'active',   carrier: 'iA Financial'  },
  { product_type: 'critical_illness', annual_premium: 11_200, status: 'active',   carrier: 'Manulife'      },
  { product_type: 'health',           annual_premium: 24_800, status: 'active',   carrier: 'Canada Life'   },
  { product_type: 'health',           annual_premium: 16_300, status: 'active',   carrier: 'Sun Life'      },
  { product_type: 'seg_funds',        annual_premium: 38_000, status: 'active',   carrier: 'Canada Life'   },
  { product_type: 'seg_funds',        annual_premium: 22_500, status: 'active',   carrier: 'Manulife'      },
  { product_type: 'seg_funds',        annual_premium: 7_200,  status: 'lapsed',   carrier: 'RBC Insurance' },
]

export async function importPoliciesFromMGA(advisorId: string): Promise<void> {
  await new Promise(r => setTimeout(r, 900))

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: existing } = await admin
    .from('advisor_policies')
    .select('id')
    .eq('advisor_id', advisorId)
    .limit(1)

  if (existing && existing.length > 0) return

  const rows = SEED_POLICIES.map(p => ({ advisor_id: advisorId, ...p }))
  const { error } = await admin.from('advisor_policies').insert(rows)
  if (error) throw new Error(error.message)
}

export async function importClientsFromMGA(dealId: string): Promise<{ clients: ImportedClient[] }> {
  // Simulate MGA API latency
  await new Promise(r => setTimeout(r, 1200))

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
  if (!user) throw new Error('Unauthorized')

  // Verify the caller is a participant in this deal
  const { data: deal } = await supabase
    .from('deals')
    .select('seller_id, buyer_id')
    .eq('id', dealId)
    .single()

  if (!deal || (deal.seller_id !== user.id && deal.buyer_id !== user.id)) {
    throw new Error('Unauthorized')
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // If clients already exist for this deal, return them as-is
  const { data: existing } = await admin
    .from('deal_clients')
    .select('id, client_name, client_email, carrier, policy_id, consent_status, consent_responded_at, email_sent_at')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: true })

  if (existing && existing.length > 0) {
    return { clients: existing as ImportedClient[] }
  }

  // First import — insert seed rows
  const rows = SEED_CLIENTS.map(c => ({
    deal_id:        dealId,
    client_name:    c.client_name,
    client_email:   c.client_email,
    carrier:        c.carrier,
    policy_id:      c.policy_id,
    consent_status: 'pending' as const,
    source:         'mga_import',
  }))

  const { data: inserted, error } = await admin
    .from('deal_clients')
    .insert(rows)
    .select('id, client_name, client_email, carrier, policy_id, consent_status, consent_responded_at, email_sent_at')

  if (error) throw new Error(error.message)

  return { clients: (inserted ?? []) as ImportedClient[] }
}
