import { z } from 'zod'

// Login validation schema - matches backend LoginDto
// Backend: @IsString(), @IsNotEmpty() for both username and password
export const loginSchema = z.object({
  username: z
    .string({
      required_error: 'Username is required',
      invalid_type_error: 'Username must be a string',
    })
    .min(1, 'Username cannot be empty')
    .trim(),
  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string',
    })
    .min(1, 'Password cannot be empty'),
})

// Register validation schema - matches backend RegisterDto
// Backend: username: @IsString(), @IsNotEmpty(), @MinLength(3)
// Backend: password: @IsString(), @IsNotEmpty(), @MinLength(6)
export const registerSchema = z.object({
  username: z
    .string({
      required_error: 'Username is required',
      invalid_type_error: 'Username must be a string',
    })
    .min(1, 'Username cannot be empty')
    .min(3, 'Username must be at least 3 characters')
    .trim(),
  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string',
    })
    .min(1, 'Password cannot be empty')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: z
    .string({
      required_error: 'Please confirm your password',
    })
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

// Device creation validation schema - matches backend CreateDeviceDto
export const createDeviceSchema = z.object({
  name: z
    .string({
      required_error: 'Device name is required',
      invalid_type_error: 'Device name must be a string',
    })
    .min(1, 'Device name cannot be empty')
    .max(100, 'Device name must be at most 100 characters')
    .trim(),
  location: z
    .string()
    .optional()
    .transform((val) => val || undefined),
  status: z.enum(['ONLINE', 'OFFLINE']).optional(),
  powerUsage: z
    .number()
    .min(0, 'Power usage must be 0 or greater')
    .optional()
    .transform((val) => (val === undefined ? undefined : val)),
  userIds: z
    .array(z.string())
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type CreateDeviceFormData = z.infer<typeof createDeviceSchema>

