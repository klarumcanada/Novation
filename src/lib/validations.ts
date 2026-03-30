import { z } from 'zod'

export const inviteCodeSchema = z.object({
  code: z.string().min(1, 'Please enter your invite code'),
})

export const registrationSchema = z.object({
  full_name: z.string().min(2, 'Please enter your full name'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Please enter a 10-digit Canadian phone number'),
  province: z.string().min(1, 'Please select your province'),
  years_in_practice: z.coerce
    .number()
    .min(0)
    .max(60),
})

export type RegistrationData = z.infer<typeof registrationSchema>
