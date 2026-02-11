import { db } from './index';
import { questions, adminUsers } from './schema';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

async function seed() {
  console.log('Seeding database...');

  // Seed questions
  await db.insert(questions).values([
    {
      questionText: 'なぜSNS版「令和の虎」に応募したのですか？',
      orderNumber: 1,
      isRequired: true,
      maxDurationSeconds: 180
    },
    {
      questionText: 'あなたの事業プランについて、具体的に教えてください。',
      orderNumber: 2,
      isRequired: true,
      maxDurationSeconds: 300
    },
    {
      questionText: 'その事業でどのような未来を見据えていますか？',
      orderNumber: 3,
      isRequired: true,
      maxDurationSeconds: 180
    },
    {
      questionText: '今、SNS運営で最も苦戦していることは何ですか？',
      orderNumber: 4,
      isRequired: true,
      maxDurationSeconds: 180
    },
    {
      questionText: 'あなたの強みと、それを事業にどう活かすかを教えてください。',
      orderNumber: 5,
      isRequired: true,
      maxDurationSeconds: 180
    },
  ]).onDuplicateKeyUpdate({ set: { questionText: questions.questionText } });

  console.log('Questions seeded.');

  // Seed admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  await db.insert(adminUsers).values({
    username: 'admin',
    passwordHash,
    email: 'admin@reiwa-no-tora.com',
  }).onDuplicateKeyUpdate({ set: { email: adminUsers.email } });

  console.log('Admin user seeded (username: admin, password: admin123)');

  console.log('Seeding completed.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
