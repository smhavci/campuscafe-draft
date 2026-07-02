import { Prisma } from '@prisma/client';

/**
 * Convert a Prisma Decimal (money column) to a plain number for JSON responses.
 * The API contract exposes money as numbers (e.g. 48, 5.5).
 */
export function num(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value);
}
