import { z } from 'zod'

export const inviteCodeSchema = z.object({
  code: z.string().min(1, 'Invite code is required'),
})

export const registrationSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().regex(/^\d{10}$/, 'Enter a 10-digit phone number'),
  province: z.string().min(1, 'Province is required'),
  years_in_practice: z.coerce.number().min(0).max(60),
})

const PROVINCES = [
  'AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'
] as const

const SPECIALTIES = [
  'Life insurance',
  'Group benefits',
  'Investments',
  'Disability insurance',
  'Critical illness',
  'Long-term care',
  'Segregated funds',
  'Annuities',
] as const

const CARRIERS = [
  'Canada Life',
  'Sun Life',
  'Manulife',
  'Desjardins',
  'Empire Life',
  'Equitable Life',
  'Industrial Alliance',
  'BMO Insurance',
  'RBC Insurance',
  'SSQ Insurance',
] as const

export const onboardingSchema = z.object({
  intent: z.enum(['selling', 'buying']),
  specialties: z.array(z.enum(SPECIALTIES)).min(1, 'Select at least one specialty'),
  carrier_affiliations: z.array(z.enum(CARRIERS)).min(1, 'Select at least one carrier'),
  bio: z.string().max(500, 'Bio must be 500 characters or fewer').optional(),
})

const sellerFields = z.object({
  aum_value: z.coerce.number().positive().optional().nullable(),
  aum_unit: z.enum(['thousands', 'millions']).optional().nullable(),
  client_count: z.coerce.number().int().positive().optional().nullable(),
  transition_duration: z.string().optional().nullable(),
  stay_on_postsale: z.boolean().optional().nullable(),
  buyer_geo_pref: z.array(z.string()).optional().nullable(),
})

const buyerFields = z.object({
  acq_budget_value: z.coerce.number().positive().optional().nullable(),
  acq_budget_unit: z.enum(['thousands', 'millions']).optional().nullable(),
  acq_geo_pref: z.array(z.string()).optional().nullable(),
  financing_status: z.string().optional().nullable(),
  acq_timeline: z.string().optional().nullable(),
})

export const profileEditSchema = z.object({
  intent: z.enum(['selling', 'buying']),
  specialties: z.array(z.enum(SPECIALTIES)).min(1, 'Select at least one specialty'),
  carrier_affiliations: z.array(z.enum(CARRIERS)).min(1, 'Select at least one carrier'),
  bio: z.string().max(500).optional().nullable(),
  avatar_url: z.string().optional().nullable(),
}).and(
  z.discriminatedUnion('intent', [
    z.object({ intent: z.literal('selling') }).merge(sellerFields),
    z.object({ intent: z.literal('buying') }).merge(buyerFields),
  ])
)

export { PROVINCES, SPECIALTIES, CARRIERS }
export type OnboardingData = z.infer<typeof onboardingSchema>
export type ProfileEditData = z.infer<typeof profileEditSchema>