import { z } from 'zod';

// User schema validation
const userSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().min(18).max(120),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
});

// Login form validation
const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
});

// Example usage
const validateUser = (userData: unknown) => {
  try {
    const validatedUser = userSchema.parse(userData);
    return { success: true, data: validatedUser };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    throw error;
  }
};

export { userSchema, loginSchema, validateUser };