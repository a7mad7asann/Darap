import { PrismaClient, UserRole } from '@prisma/client';
import { hash, Algorithm } from '@node-rs/argon2';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

async function main() {
  const username = process.env.INITIAL_ADMIN_USERNAME || 'admin.darb';
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const email = process.env.INITIAL_ADMIN_EMAIL || 'admin@darb.local';
  const displayName = process.env.INITIAL_ADMIN_DISPLAY_NAME || 'مدير منصة درب';

  if (!password || password.length < 12) {
    console.error(
      'Error: INITIAL_ADMIN_PASSWORD environment variable is required and must be at least 12 characters.',
    );
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      displayName,
      email,
      isActive: true,
    },
    create: {
      username,
      displayName,
      email,
      passwordHash,
      defaultRole: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log(
    `Initial administrator provisioned successfully: ${admin.username} (${admin.displayName})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
