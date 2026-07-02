import { environment } from '../../../environments/environment';

// Artık URL burada sabit yazılı değil.
// ng serve  → environment.ts      → localhost:3000
// ng build  → environment.prod.ts → Render URL
export const API_BASE_URL = environment.apiBaseUrl;
