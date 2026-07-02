/** Money formatter: whole numbers stay clean (₺65), decimals show 2 places (₺65.50). */
export const formatTRY = (n: number): string => (Number.isInteger(n) ? `₺${n}` : `₺${n.toFixed(2)}`);
