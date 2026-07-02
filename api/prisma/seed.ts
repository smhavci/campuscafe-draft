/**
 * CampusCafe — database seed
 *
 * DELIBERATELY EMPTY of business data.
 *
 * The database is intended to run with REAL cafes and REAL products entered
 * through the application (cafe-owner registration + menu management), not with
 * demo/fixture rows. This keeps production and development identical and avoids
 * shipping fake "Antalya cafe" data.
 *
 * If you ever need local test data, add it behind an explicit flag, e.g.:
 *   SEED_DEMO=true npm run seed
 * and guard the inserts with `if (process.env.SEED_DEMO === 'true') { ... }`.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Intentionally no-op. The schema/migrations define the structure;
  // real data is created at runtime via the API.
  console.log('✅ Seed complete — no demo data inserted (empty database by design).');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
