/** "Günaydın" / "İyi günler" / "İyi akşamlar" by local hour. */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

/** "2 Tem, 14:32" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse an "08:00 - 20:00" style string and tell if now is within range. */
export function isOpenNow(openHours: string | null | undefined): boolean {
  if (!openHours) return false;
  const m = openHours.match(/(\d{1,2}):(\d{2}).*?(\d{1,2}):(\d{2})/);
  if (!m) return false;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const open = Number(m[1]) * 60 + Number(m[2]);
  const close = Number(m[3]) * 60 + Number(m[4]);
  return cur >= open && cur <= close;
}
