import { z } from 'zod';

// Shared field rules. Every string is trimmed and length-capped so that
// oversized or whitespace-only input is rejected before it reaches SQLite.
const shortText = (max) => z.string().trim().min(1).max(max);
const optionalText = (max) => z.string().trim().max(max).optional().default('');
const isoDate = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Expected YYYY-MM-DD').optional().default('');

export const registerSchema = z.object({
  name: shortText(80),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(1).max(72),
});

export const CUSTOMER_STATUSES = ['lead', 'prospect', 'customer', 'inactive'];
export const SALE_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
export const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'task', 'note'];

export const customerSchema = z.object({
  name: shortText(100),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email().max(120)]).optional().default(''),
  phone: z.string().trim().regex(/^[0-9+\-\s()]{0,20}$/, 'Invalid phone').optional().default(''),
  company: optionalText(100),
  status: z.enum(CUSTOMER_STATUSES).default('lead'),
  notes: optionalText(2000),
});

export const saleSchema = z.object({
  customer_id: z.number().int().positive(),
  title: shortText(120),
  value: z.number().min(0).max(1e12).default(0),
  stage: z.enum(SALE_STAGES).default('new'),
  expected_close: isoDate,
});

export const activitySchema = z.object({
  customer_id: z.number().int().positive(),
  sale_id: z.number().int().positive().nullable().optional().default(null),
  type: z.enum(ACTIVITY_TYPES),
  subject: shortText(200),
  due_date: isoDate,
  done: z.boolean().default(false),
});

export const idParam = z.coerce.number().int().positive();

/** Express middleware factory: validates req.body against a zod schema. */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    req.body = result.data;
    next();
  };
}
