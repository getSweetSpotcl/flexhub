import { z } from 'zod'
import { validateRUT } from './rut'

export const onboardingSchema = z.object({
  role: z.enum(['HOST', 'GUEST']),
  firstName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede tener más de 50 caracteres'),
  lastName: z
    .string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede tener más de 50 caracteres'),
  phone: z
    .string()
    .regex(/^\+56[0-9]{8,9}$/, 'Formato inválido. Ejemplo: +56912345678'),
  rut: z
    .string()
    .transform((val) => val.replace(/[.-]/g, '').toUpperCase())
    .refine(validateRUT, 'RUT inválido'),
  acceptsTerms: z
    .boolean()
    .refine((val) => val === true, 'Debes aceptar los términos y condiciones'),
})

export type OnboardingFormData = z.infer<typeof onboardingSchema>