import { z } from 'zod';

// Login form validation - only checks format, NOT password complexity
// Password complexity rules apply only when creating/updating passwords
export const loginSchema = z.object({
  email: z.string()
    .email({ message: 'Por favor ingresa un email válido' })
    .min(1, { message: 'El email es requerido' }),
  password: z.string()
    .min(1, { message: 'La contraseña es requerida' }),
});

// Password creation/update policy - full complexity rules
export const passwordSchema = z.string()
  .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  .regex(/[a-z]/, { message: 'La contraseña debe contener al menos una letra minúscula' })
  .regex(/[A-Z]/, { message: 'La contraseña debe contener al menos una letra mayúscula' })
  .regex(/[0-9]/, { message: 'La contraseña debe contener al menos un número' });

export type LoginFormValues = z.infer<typeof loginSchema>;
