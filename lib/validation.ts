import { z } from 'zod';
const postalPatterns: Record<string, RegExp> = {
  DE: /^\d{5}$/,
  FR: /^\d{5}$/,
  IT: /^\d{5}$/,
  ES: /^\d{5}$/,
  AT: /^\d{4}$/,
  CH: /^\d{4}$/,
  BE: /^\d{4}$/,
  NL: /^\d{4}\s?[A-Z]{2}$/i,
  PL: /^\d{2}-?\d{3}$/,
  GB: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
  CZ: /^\d{3}\s?\d{2}$/,
  DK: /^\d{4}$/,
  SE: /^\d{3}\s?\d{2}$/,
  NO: /^\d{4}$/,
  PT: /^\d{4}-\d{3}$/,
};
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T12:00:00Z`);
    return !isNaN(+d) && d.toISOString().slice(0, 10) === v;
  }, 'Enter a valid calendar date');
export const tripSchema = z
  .object({
    mode: z.enum(['demo', 'live']),
    postalCode: z.string().trim().min(3).max(12),
    country: z.enum([
      'DE',
      'FR',
      'IT',
      'ES',
      'AT',
      'CH',
      'BE',
      'NL',
      'PL',
      'GB',
      'CZ',
      'DK',
      'SE',
      'NO',
      'PT',
    ]),
    destination: z.string().trim().max(200),
    direction: z.enum(['north', 'south', 'east', 'west']),
    driveHours: z.number().min(0.5).max(12),
    departureDate: date,
    departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    checkIn: date,
    checkOut: date,
    adults: z.number().int().min(1).max(8),
    children: z.number().int().min(0).max(6),
    budget: z.number().min(30).max(3000),
    breakfast: z.boolean(),
    minStars: z.number().int().min(0).max(5),
    minRating: z.number().min(0).max(5),
    maxDetour: z.number().min(5).max(60),
    stopWindow: z.number().min(10).max(90),
    breakEvery: z.number().min(1).max(4),
    breakMinutes: z.number().int().min(5).max(90),
  })
  .superRefine((v, ctx) => {
    if (!postalPatterns[v.country].test(v.postalCode))
      ctx.addIssue({
        code: 'custom',
        path: ['postalCode'],
        message: 'Postal code does not match the selected country',
      });
    if (v.checkOut <= v.checkIn)
      ctx.addIssue({
        code: 'custom',
        path: ['checkOut'],
        message: 'Check-out must be after check-in',
      });
    if (v.checkIn < v.departureDate)
      ctx.addIssue({
        code: 'custom',
        path: ['checkIn'],
        message: 'Check-in cannot be before departure',
      });
    if (v.mode === 'live' && v.departureDate < new Date().toISOString().slice(0, 10))
      ctx.addIssue({
        code: 'custom',
        path: ['departureDate'],
        message: 'Live departure must be today or later',
      });
  });
