const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: hashedPassword },
    create: {
      username: 'admin',
      name: 'Super Administrator',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('==================================================');
  console.log('SEEDER SUCCESS: Super Admin Account Created');
  console.log('Username : admin');
  console.log('Password : admin123');
  console.log('Role     : ADMIN');
  console.log('==================================================');
}

main()
  .catch((e) => {
    console.error('Error Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });