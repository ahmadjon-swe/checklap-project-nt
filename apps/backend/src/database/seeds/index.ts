import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

async function upsertUser(
  repo: any,
  email: string,
  fields: object,
): Promise<any> {
  const existing = await repo.findOneBy({ email });
  if (existing) {
    console.log(`  ↳ user already exists: ${email}`);
    return existing;
  }
  const user = repo.create({ email, ...fields });
  await repo.save(user);
  console.log(`  ↳ created: ${email}`);
  return user;
}

async function upsertPlan(repo: any, name: string, fields: object) {
  const existing = await repo.findOneBy({ name });
  if (existing) {
    console.log(`  ↳ plan already exists: ${name}`);
    return existing;
  }
  const plan = repo.create({ name, ...fields });
  await repo.save(plan);
  console.log(`  ↳ created plan: ${name}`);
  return plan;
}

/* ─── core seed (runs in ALL environments) ────────────────────────────────── */
// Reference data + the real admin (from env). Safe for production: contains NO
// demo accounts or known-password users.

async function seedCore(): Promise<any> {
  /* ── 1. Subscription plans ─────────────────────────────────────────────── */
  console.log('\n[1/6] Subscription plans…');
  const plansRepo = AppDataSource.getRepository('subscription_plans');

  const _freePlan = await upsertPlan(plansRepo, 'free', {
    price: 0,
    billingPeriod: 'monthly',
    maxTestsPerDay: 3,
    maxQuestionsPerTest: 20,
    maxGroups: 1,
    canExport: false,
    canUseAnalytics: false,
    canImport: false,
  });
  const premiumPlan = await upsertPlan(plansRepo, 'premium', {
    price: 9.99,
    billingPeriod: 'monthly',
    maxTestsPerDay: null,
    maxQuestionsPerTest: null,
    maxGroups: null,
    canExport: true,
    canUseAnalytics: true,
    canImport: true,
  });
  await upsertPlan(plansRepo, 'premium_yearly', {
    price: 89.99,
    billingPeriod: 'yearly',
    maxTestsPerDay: null,
    maxQuestionsPerTest: null,
    maxGroups: null,
    canExport: true,
    canUseAnalytics: true,
    canImport: true,
  });

  /* ── 2. Users ──────────────────────────────────────────────────────────── */
  console.log('\n[2/6] Users…');
  const usersRepo = AppDataSource.getRepository('users');

  // Admin from env (production path)
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    await upsertUser(usersRepo, adminEmail, {
      passwordHash: await bcrypt.hash(adminPassword, 12),
      firstName: process.env.ADMIN_FIRST_NAME ?? 'Admin',
      lastName: process.env.ADMIN_LAST_NAME ?? 'User',
      role: 'admin',
      isVerified: true,
      isActive: true,
    });
  } else {
    console.log('  ↳ ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin seed');
  }

  return { premiumPlan };
}

/* ─── demo seed (NON-PRODUCTION ONLY) ─────────────────────────────────────── */
// Known-password accounts and sample data so devs can log in immediately. This
// MUST NOT run in production — gated by the NODE_ENV check in seed() below.

async function seedDemo({ premiumPlan }: { premiumPlan: any }): Promise<void> {
  const usersRepo = AppDataSource.getRepository('users');

  // Dev demo accounts
  const _demoAdmin = await upsertUser(usersRepo, 'admin@demo.com', {
    passwordHash: await bcrypt.hash('Admin1234!', 12),
    firstName: 'Admin',
    lastName: 'Demo',
    role: 'admin',
    isVerified: true,
    isActive: true,
  });

  const demoTeacher = await upsertUser(usersRepo, 'teacher@demo.com', {
    passwordHash: await bcrypt.hash('Teacher1234!', 12),
    firstName: 'Alex',
    lastName: 'Teacher',
    role: 'teacher',
    isVerified: true,
    isActive: true,
  });

  const demoStudent = await upsertUser(usersRepo, 'student@demo.com', {
    passwordHash: await bcrypt.hash('Student1234!', 12),
    firstName: 'Sam',
    lastName: 'Student',
    role: 'student',
    isVerified: true,
    isActive: true,
  });

  await upsertUser(usersRepo, 'moderator@demo.com', {
    passwordHash: await bcrypt.hash('Moderator1234!', 12),
    firstName: 'Morgan',
    lastName: 'Moderator',
    role: 'moderator',
    isVerified: true,
    isActive: true,
  });

  await upsertUser(usersRepo, 'support@demo.com', {
    passwordHash: await bcrypt.hash('Support1234!', 12),
    firstName: 'Sara',
    lastName: 'Support',
    role: 'support',
    isVerified: true,
    isActive: true,
  });

  /* ── 3. Premium subscription for demo teacher ──────────────────────────── */
  console.log('\n[3/6] Subscriptions…');
  const subsRepo = AppDataSource.getRepository('subscriptions');
  const existingSub = await subsRepo.findOneBy({ userId: demoTeacher.id });
  if (!existingSub) {
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setFullYear(endsAt.getFullYear() + 1);
    await subsRepo.save(
      subsRepo.create({
        userId: demoTeacher.id,
        planId: premiumPlan.id,
        status: 'active',
        paymentMethod: 'manual',
        startsAt: now,
        endsAt,
      }),
    );
    console.log('  ↳ premium subscription created for teacher@demo.com');
  } else {
    console.log('  ↳ teacher subscription already exists');
  }

  /* ── 4. Demo group ─────────────────────────────────────────────────────── */
  console.log('\n[4/6] Groups & members…');
  const groupsRepo = AppDataSource.getRepository('groups');
  const membersRepo = AppDataSource.getRepository('group_members');

  let demoGroup = await groupsRepo.findOneBy({ teacherId: demoTeacher.id });
  if (!demoGroup) {
    demoGroup = await groupsRepo.save(
      groupsRepo.create({
        teacherId: demoTeacher.id,
        name: 'Demo Class',
        description: 'A sample class for exploring QuizApp features.',
        inviteCode: 'DEMO2025',
        isActive: true,
      }),
    );
    console.log('  ↳ created group: Demo Class (code DEMO2025)');
  } else {
    console.log('  ↳ group already exists');
  }

  const memberExists = await membersRepo.findOneBy({
    groupId: demoGroup.id,
    studentId: demoStudent.id,
  });
  if (!memberExists) {
    await membersRepo.save(
      membersRepo.create({
        groupId: demoGroup.id,
        studentId: demoStudent.id,
        isActive: true,
      }),
    );
    console.log('  ↳ added student@demo.com to Demo Class');
  } else {
    console.log('  ↳ student already in group');
  }

  /* ── 5. Demo tests ─────────────────────────────────────────────────────── */
  console.log('\n[5/6] Tests, questions, options…');
  const testsRepo = AppDataSource.getRepository('tests');
  const questionsRepo = AppDataSource.getRepository('questions');
  const optionsRepo = AppDataSource.getRepository('options');
  const testGroupsRepo = AppDataSource.getRepository('test_groups');

  const testDefinitions = [
    {
      title: 'General Knowledge Quiz',
      description: 'A broad mix of trivia questions to warm up.',
      timeLimitMinutes: 15,
      passingThreshold: 60,
      isPublished: true,
      questions: [
        {
          body: 'What is the capital of France?',
          difficulty: 'easy',
          topic: 'Geography',
          options: [
            { body: 'London', isCorrect: false },
            { body: 'Berlin', isCorrect: false },
            { body: 'Paris', isCorrect: true },
            { body: 'Madrid', isCorrect: false },
          ],
        },
        {
          body: 'Which planet is known as the Red Planet?',
          difficulty: 'easy',
          topic: 'Science',
          options: [
            { body: 'Venus', isCorrect: false },
            { body: 'Mars', isCorrect: true },
            { body: 'Jupiter', isCorrect: false },
            { body: 'Saturn', isCorrect: false },
          ],
        },
        {
          body: 'Who wrote "Romeo and Juliet"?',
          difficulty: 'easy',
          topic: 'Literature',
          options: [
            { body: 'Charles Dickens', isCorrect: false },
            { body: 'Mark Twain', isCorrect: false },
            { body: 'William Shakespeare', isCorrect: true },
            { body: 'Jane Austen', isCorrect: false },
          ],
        },
        {
          body: 'What is 12 × 12?',
          difficulty: 'easy',
          topic: 'Math',
          options: [
            { body: '124', isCorrect: false },
            { body: '144', isCorrect: true },
            { body: '132', isCorrect: false },
            { body: '148', isCorrect: false },
          ],
        },
        {
          body: 'Which element has the chemical symbol "O"?',
          difficulty: 'easy',
          topic: 'Science',
          options: [
            { body: 'Gold', isCorrect: false },
            { body: 'Osmium', isCorrect: false },
            { body: 'Oxygen', isCorrect: true },
            { body: 'Oganesson', isCorrect: false },
          ],
        },
      ],
    },
    {
      title: 'Web Development Fundamentals',
      description: 'Test your knowledge of HTML, CSS, and JavaScript basics.',
      timeLimitMinutes: 20,
      passingThreshold: 70,
      isPublished: true,
      questions: [
        {
          body: 'What does HTML stand for?',
          difficulty: 'easy',
          topic: 'HTML',
          options: [
            { body: 'Hyper Text Markup Language', isCorrect: true },
            { body: 'High Transfer Markup Language', isCorrect: false },
            { body: 'Hyper Transfer Mode Language', isCorrect: false },
            { body: 'Home Tool Markup Language', isCorrect: false },
          ],
        },
        {
          body: 'Which CSS property controls the text size?',
          difficulty: 'easy',
          topic: 'CSS',
          options: [
            { body: 'text-size', isCorrect: false },
            { body: 'font-weight', isCorrect: false },
            { body: 'font-size', isCorrect: true },
            { body: 'text-style', isCorrect: false },
          ],
        },
        {
          body: 'Which keyword declares a block-scoped variable in JavaScript?',
          difficulty: 'medium',
          topic: 'JavaScript',
          options: [
            { body: 'var', isCorrect: false },
            { body: 'let', isCorrect: true },
            { body: 'define', isCorrect: false },
            { body: 'set', isCorrect: false },
          ],
        },
        {
          body: 'What is the correct way to select an element with id "header" in CSS?',
          difficulty: 'easy',
          topic: 'CSS',
          options: [
            { body: '.header', isCorrect: false },
            { body: '*header', isCorrect: false },
            { body: '#header', isCorrect: true },
            { body: 'header', isCorrect: false },
          ],
        },
        {
          body: 'Which HTTP method is used to submit form data to a server?',
          difficulty: 'medium',
          topic: 'HTTP',
          options: [
            { body: 'GET', isCorrect: false },
            { body: 'PUT', isCorrect: false },
            { body: 'DELETE', isCorrect: false },
            { body: 'POST', isCorrect: true },
          ],
        },
        {
          body: 'What does "API" stand for?',
          difficulty: 'easy',
          topic: 'Concepts',
          options: [
            { body: 'Application Programming Interface', isCorrect: true },
            { body: 'Advanced Programming Index', isCorrect: false },
            { body: 'Automated Program Integration', isCorrect: false },
            { body: 'Application Process Interface', isCorrect: false },
          ],
        },
        {
          body: 'Which of these is NOT a JavaScript framework?',
          difficulty: 'medium',
          topic: 'JavaScript',
          options: [
            { body: 'React', isCorrect: false },
            { body: 'Angular', isCorrect: false },
            { body: 'Django', isCorrect: true },
            { body: 'Vue', isCorrect: false },
          ],
        },
      ],
    },
    {
      title: 'Mathematics – Algebra Basics',
      description: 'Fundamental algebra concepts and problem-solving.',
      timeLimitMinutes: 25,
      passingThreshold: 65,
      isPublished: false,
      questions: [
        {
          body: 'Solve for x: 2x + 4 = 12',
          difficulty: 'easy',
          topic: 'Equations',
          options: [
            { body: 'x = 2', isCorrect: false },
            { body: 'x = 4', isCorrect: true },
            { body: 'x = 6', isCorrect: false },
            { body: 'x = 8', isCorrect: false },
          ],
        },
        {
          body: 'What is the value of 3² + 4²?',
          difficulty: 'easy',
          topic: 'Exponents',
          options: [
            { body: '25', isCorrect: true },
            { body: '49', isCorrect: false },
            { body: '14', isCorrect: false },
            { body: '30', isCorrect: false },
          ],
        },
        {
          body: 'Factor: x² - 9',
          difficulty: 'medium',
          topic: 'Factoring',
          options: [
            { body: '(x + 3)(x - 3)', isCorrect: true },
            { body: '(x - 3)(x - 3)', isCorrect: false },
            { body: '(x + 9)(x - 1)', isCorrect: false },
            { body: '(x + 3)²', isCorrect: false },
          ],
        },
        {
          body: 'What is the slope of the line y = 3x + 5?',
          difficulty: 'easy',
          topic: 'Linear Equations',
          options: [
            { body: '5', isCorrect: false },
            { body: '3', isCorrect: true },
            { body: '8', isCorrect: false },
            { body: '15', isCorrect: false },
          ],
        },
      ],
    },
  ];

  for (const def of testDefinitions) {
    const existing = await testsRepo.findOneBy({
      teacherId: demoTeacher.id,
      title: def.title,
    });
    if (existing) {
      console.log(`  ↳ test already exists: "${def.title}"`);
      continue;
    }

    const { questions: qDefs, ...testFields } = def;
    const test = await testsRepo.save(
      testsRepo.create({
        ...testFields,
        teacherId: demoTeacher.id,
        randomizeQuestions: true,
        shuffleOptions: true,
        resultVisibility: 'full_review',
      }),
    );
    console.log(`  ↳ created test: "${def.title}" (${qDefs.length} questions)`);

    for (let qi = 0; qi < qDefs.length; qi++) {
      const { options: optDefs, ...qFields } = qDefs[qi];
      const question = await questionsRepo.save(
        questionsRepo.create({
          ...qFields,
          testId: test.id,
          orderIndex: qi,
          score: 1,
        }),
      );
      for (let oi = 0; oi < optDefs.length; oi++) {
        await optionsRepo.save(
          optionsRepo.create({
            ...optDefs[oi],
            questionId: question.id,
            orderIndex: oi,
          }),
        );
      }
    }

    // Assign published tests to the demo group
    if (def.isPublished) {
      const alreadyLinked = await testGroupsRepo.findOneBy({
        testId: test.id,
        groupId: demoGroup.id,
      });
      if (!alreadyLinked) {
        await testGroupsRepo.save(
          testGroupsRepo.create({
            testId: test.id,
            groupId: demoGroup.id,
            assignedBy: demoTeacher.id,
          }),
        );
        console.log(`    ↳ linked to Demo Class`);
      }
    }
  }

  /* ── 6. Summary ────────────────────────────────────────────────────────── */
  console.log('\n[6/6] Done! 🎉');
  console.log('\n──────────────────────────────────────────────────');
  console.log('  Demo accounts (all pre-verified):');
  console.log('  Admin     → admin@demo.com     / Admin1234!');
  console.log('  Teacher   → teacher@demo.com   / Teacher1234!');
  console.log('  Student   → student@demo.com   / Student1234!');
  console.log('  Moderator → moderator@demo.com / Moderator1234!');
  console.log('  Support   → support@demo.com   / Support1234!');
  console.log('──────────────────────────────────────────────────\n');
}

/* ─── seed entry ──────────────────────────────────────────────────────────── */

async function seed() {
  await AppDataSource.initialize();

  const core = await seedCore();

  // Demo accounts have known passwords and must NEVER exist in production.
  if (process.env.NODE_ENV === 'production') {
    console.log('\nNODE_ENV=production → skipping demo data.');
    console.log(
      'Done! Seeded plans + admin (from ADMIN_EMAIL/ADMIN_PASSWORD).',
    );
  } else {
    await seedDemo(core);
  }

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
