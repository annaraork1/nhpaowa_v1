import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  await p.$executeRawUnsafe(`
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flats' AND column_name = 'wing'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flats' AND column_name = 'tower'
  ) THEN
    ALTER TABLE flats RENAME COLUMN wing TO tower;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flats' AND column_name = 'flat_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flats' AND column_name = 'apartment_type'
  ) THEN
    ALTER TABLE flats RENAME COLUMN flat_type TO apartment_type;
  END IF;
END $$;
`);
  await p.$executeRawUnsafe(
    `ALTER TABLE flats ADD COLUMN IF NOT EXISTS configuration TEXT`
  );
  await p.$executeRawUnsafe(
    `ALTER TABLE flats ADD COLUMN IF NOT EXISTS super_built_up_area INTEGER`
  );

  // Drop old unique if present; prisma db push will recreate
  await p.$executeRawUnsafe(`
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'flats_association_id_wing_flat_number_key'
  ) THEN
    ALTER TABLE flats DROP CONSTRAINT flats_association_id_wing_flat_number_key;
  END IF;
END $$;
`);

  console.log('Column migration done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
