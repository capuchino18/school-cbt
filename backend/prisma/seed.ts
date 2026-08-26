const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // Hash password '123456' secara eksplisit
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Upsert Akun Siswa
  await prisma.user.upsert({
    where: { username: 'siswa1' },
    update: { password: hashedPassword },
    create: {
      username: 'siswa1',
      password: hashedPassword,
      role: 'STUDENT',
    },
  });

  // Upsert Akun Admin
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: hashedPassword },
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('Seeding ulang berhasil: siswa1 & admin (password: 123456)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });