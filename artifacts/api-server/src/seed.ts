/* One-time idempotent seed: admin user, curriculum, credit costs, brand kit. */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  learnModulesTable,
  lessonsTable,
  lessonResourcesTable,
  creditCostsTable,
  brandKitTable,
  creditTransactionsTable,
} from "@workspace/db";
import { logger } from "./lib/logger";

export async function seed(): Promise<void> {
  const [existingAdmin] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, "admin@digiproducts.local"));
  if (existingAdmin) return;

  logger.info("Seeding initial data");
  const passwordHash = await bcrypt.hash("admin1234", 10);
  const [admin] = await db
    .insert(usersTable)
    .values({
      email: "admin@digiproducts.local",
      fullName: "Alex Morgan",
      passwordHash,
      role: "admin",
      onboardingComplete: true,
      creditsBalance: 500,
    })
    .returning();
  await db.insert(creditTransactionsTable).values({
    userId: admin.id,
    amount: 500,
    balanceAfter: 500,
    kind: "grant",
    actionKey: "grant",
    note: "Initial admin allocation",
  });

  const costs = [
    { actionKey: "outline", cost: 1, label: "Generate outline" },
    { actionKey: "chapter", cost: 1, label: "Generate chapter" },
    { actionKey: "rewrite", cost: 1, label: "Rewrite chapter" },
    { actionKey: "sales_copy", cost: 2, label: "Generate sales copy" },
    { actionKey: "lead_magnet", cost: 3, label: "Generate lead magnet" },
  ];
  for (const c of costs) {
    await db.insert(creditCostsTable).values(c).onConflictDoNothing();
  }

  await db
    .insert(brandKitTable)
    .values({ id: "default", defaultAuthor: "DigiProducts Studio" })
    .onConflictDoNothing();

  const [m1] = await db
    .insert(learnModulesTable)
    .values({
      title: "Welcome to DigiProducts",
      description: "How the studio works and what great products look like.",
      orderIndex: 0,
    })
    .returning();
  const [m2] = await db
    .insert(learnModulesTable)
    .values({
      title: "Creating Products That Sell",
      description: "The full workflow: brief, outline, generate, polish, export.",
      orderIndex: 1,
    })
    .returning();

  const lessons = [
    {
      moduleId: m1.id,
      title: "Platform Tour",
      description: "A quick walkthrough of the dashboard, library, and credits.",
      videoProvider: "youtube",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      durationSeconds: 240,
      orderIndex: 0,
      bodyMd:
        "Welcome aboard. This lesson walks through the dashboard, your product library, and how credits work.\n\n- Every AI action costs credits\n- Your products are private to you until submitted for review\n- Approved products can be exported and shared",
    },
    {
      moduleId: m1.id,
      title: "Quality Standards & Review",
      description: "What reviewers look for before a product is approved.",
      videoProvider: "youtube",
      videoUrl: "https://www.youtube.com/embed/ysz5S6PUM-U",
      durationSeconds: 300,
      orderIndex: 1,
      bodyMd:
        "Our review checklist:\n\n1. Accurate, practical content\n2. Consistent tone matching the brief\n3. Clean structure with a strong opening chapter\n4. A cover that matches the brand kit",
    },
    {
      moduleId: m2.id,
      title: "Writing a Great Brief",
      description: "The brief drives everything the AI writes — make it count.",
      videoProvider: "youtube",
      videoUrl: "https://www.youtube.com/embed/jNQXAC9IVRw",
      durationSeconds: 360,
      orderIndex: 0,
      bodyMd:
        "A strong brief includes a sharp topic, a specific audience, and 3-5 key points you want covered. Vague briefs produce generic books.",
    },
    {
      moduleId: m2.id,
      title: "From Outline to Export",
      description: "Editing chapters, designing covers, and exporting PDFs.",
      videoProvider: "youtube",
      videoUrl: "https://www.youtube.com/embed/aqz-KE-bpKQ",
      durationSeconds: 420,
      orderIndex: 1,
      bodyMd:
        "Review every generated chapter before export. Use the AI actions (expand, shorten, add examples) to polish, then design your cover and export.",
    },
  ];
  for (const l of lessons) {
    const [lesson] = await db.insert(lessonsTable).values(l).returning();
    await db.insert(lessonResourcesTable).values({
      lessonId: lesson.id,
      label: "Written recap (this page)",
      externalUrl: null,
    });
  }
  logger.info("Seed complete");
}
