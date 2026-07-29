import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// Mirrors the driver selection in src/lib/db.ts — Neon's serverless driver
// cannot reach a plain local Postgres, so local URLs use node-postgres.
// Production (*.neon.tech) is unaffected.
const connectionString = process.env.DATABASE_URL!;
const isLocal = /^postgres(ql)?:\/\/[^/@]*@?(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString);
const adapter = isLocal ? new PrismaPg({ connectionString }) : new PrismaNeon({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Create Permissions
  const permissionData = [
    // Leads
    { name: "leads:view", module: "leads", action: "view", description: "View leads" },
    { name: "leads:create", module: "leads", action: "create", description: "Create leads" },
    { name: "leads:edit", module: "leads", action: "edit", description: "Edit leads" },
    { name: "leads:delete", module: "leads", action: "delete", description: "Delete leads" },
    { name: "leads:convert", module: "leads", action: "convert", description: "Convert leads to players" },
    // Players
    { name: "players:view", module: "players", action: "view", description: "View players" },
    { name: "players:create", module: "players", action: "create", description: "Create players" },
    { name: "players:edit", module: "players", action: "edit", description: "Edit players" },
    { name: "players:delete", module: "players", action: "delete", description: "Delete players" },
    // Subscriptions
    { name: "subscriptions:view", module: "subscriptions", action: "view", description: "View subscriptions" },
    { name: "subscriptions:create", module: "subscriptions", action: "create", description: "Create subscriptions" },
    { name: "subscriptions:edit", module: "subscriptions", action: "edit", description: "Edit subscriptions" },
    { name: "subscriptions:delete", module: "subscriptions", action: "delete", description: "Delete subscriptions" },
    // Payments
    { name: "payments:view", module: "payments", action: "view", description: "View payments" },
    { name: "payments:create", module: "payments", action: "create", description: "Create payments" },
    { name: "payments:approve", module: "payments", action: "approve", description: "Approve payments" },
    { name: "payments:reject", module: "payments", action: "reject", description: "Reject payments" },
    // Store
    { name: "store:view", module: "store", action: "view", description: "View store" },
    { name: "store:create", module: "store", action: "create", description: "Create products" },
    { name: "store:edit", module: "store", action: "edit", description: "Edit products" },
    { name: "store:delete", module: "store", action: "delete", description: "Delete products" },
    // Orders
    { name: "orders:view", module: "orders", action: "view", description: "View orders" },
    { name: "orders:edit", module: "orders", action: "edit", description: "Edit orders" },
    { name: "orders:delete", module: "orders", action: "delete", description: "Delete orders" },
    // Reports
    { name: "reports:view", module: "reports", action: "view", description: "View reports" },
    // Settings
    { name: "settings:view", module: "settings", action: "view", description: "View settings" },
    { name: "settings:edit", module: "settings", action: "edit", description: "Edit settings" },
    // Users
    { name: "users:view", module: "users", action: "view", description: "View users" },
    { name: "users:create", module: "users", action: "create", description: "Create users" },
    { name: "users:edit", module: "users", action: "edit", description: "Edit users" },
    { name: "users:delete", module: "users", action: "delete", description: "Delete users" },
    // Roles
    { name: "roles:view", module: "roles", action: "view", description: "View roles" },
    { name: "roles:create", module: "roles", action: "create", description: "Create roles" },
    { name: "roles:edit", module: "roles", action: "edit", description: "Edit roles" },
    { name: "roles:delete", module: "roles", action: "delete", description: "Delete roles" },
    // Website & Applications — these permission *strings* already existed in
    // src/lib/permissions.ts but had never actually been seeded as Permission
    // rows (nor granted to any role), so requirePermission()/hasPermission()
    // could never have returned true for them outside the Super Admin
    // wildcard. Adding them now so the Showcase Website permission retrofit
    // preserves the Admin role's existing (de facto full) access instead of
    // silently locking it out.
    { name: "website:view", module: "website", action: "view", description: "View showcase website content (pages, programmes, venues, header/footer, etc.)" },
    { name: "website:edit", module: "website", action: "edit", description: "Edit showcase website content" },
    { name: "applications:view", module: "applications", action: "view", description: "View website applications/leads" },
    { name: "applications:manage", module: "applications", action: "manage", description: "Manage website applications/leads" },
    { name: "applications:export", module: "applications", action: "export", description: "Export website applications/leads" },
    { name: "file_requirements:manage", module: "file_requirements", action: "manage", description: "Manage application file requirements" },
  ];

  const permissions: Record<string, any> = {};
  for (const p of permissionData) {
    const perm = await db.permission.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
    permissions[p.name] = perm;
  }
  console.log(`✅ ${permissionData.length} permissions created`);

  // Create Roles
  const superAdminRole = await db.role.upsert({
    where: { name: "Super Admin" },
    update: {},
    create: { name: "Super Admin", description: "Full system access", isSystem: true },
  });

  const adminRole = await db.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: { name: "Admin", description: "Academy administrator", isSystem: true },
  });

  const staffRole = await db.role.upsert({
    where: { name: "Staff" },
    update: {},
    create: { name: "Staff", description: "Academy staff member", isSystem: false },
  });

  await db.role.upsert({
    where: { name: "Player" },
    update: {},
    create: { name: "Player", description: "Academy player", isSystem: true },
  });

  // Assign all permissions to Super Admin and Admin
  for (const role of [superAdminRole, adminRole]) {
    for (const perm of Object.values(permissions)) {
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: (perm as any).id } },
        update: {},
        create: { roleId: role.id, permissionId: (perm as any).id },
      });
    }
  }

  // Assign limited permissions to Staff
  const staffPermNames = ["leads:view", "leads:create", "leads:edit", "players:view", "payments:view", "orders:view", "subscriptions:view"];
  for (const name of staffPermNames) {
    if (permissions[name]) {
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: staffRole.id, permissionId: permissions[name].id } },
        update: {},
        create: { roleId: staffRole.id, permissionId: permissions[name].id },
      });
    }
  }
  console.log("✅ Roles created");

  // Create Super Admin User
  const adminPassword = await bcrypt.hash("admin123", 12);
  await db.user.upsert({
    where: { email: "admin@hxacademy.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@hxacademy.com",
      password: adminPassword,
      roleId: superAdminRole.id,
      isActive: true,
    },
  });
  console.log("✅ Super Admin created: admin@hxacademy.com / admin123");

  // Create Secondary Admin
  const adminPassword2 = await bcrypt.hash("12345678", 12);
  await db.user.upsert({
    where: { email: "admin@admin.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@admin.com",
      password: adminPassword2,
      roleId: superAdminRole.id,
      isActive: true,
    },
  });
  console.log("✅ Admin created: admin@admin.com / 12345678");

  // Create Default Settings
  const defaultSettings = [
    { key: "academy_name", value: "Football Skills Academy" },
    { key: "academy_email", value: "contact@footballskillsacademy.com" },
    { key: "academy_phone", value: "+213 000 000 000" },
    { key: "academy_whatsapp", value: "+213 000 000 000" },
    { key: "academy_address", value: "Algiers, Algeria" },
    { key: "academy_logo", value: "" },
    { key: "academy_favicon", value: "" },
    { key: "primary_color", value: "#1e40af" },
    { key: "secondary_color", value: "#0f172a" },
    { key: "footer_text", value: "© 2024 Football Skills Academy. All rights reserved." },
    { key: "currency", value: "DZD" },
    { key: "currency_symbol", value: "DA" },
  ];

  for (const s of defaultSettings) {
    await db.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  console.log("✅ Default settings created");

  // Create Lead Statuses
  const leadStatuses = [
    { name: "New",           color: "#3B82F6", order: 0, isDefault: true,  isTerminal: false },
    { name: "Contacted",     color: "#F59E0B", order: 1, isDefault: false, isTerminal: false },
    { name: "Qualified",     color: "#8B5CF6", order: 2, isDefault: false, isTerminal: false },
    { name: "Proposal Sent", color: "#EC4899", order: 3, isDefault: false, isTerminal: false },
    { name: "Negotiation",   color: "#F97316", order: 4, isDefault: false, isTerminal: false },
    { name: "Won",           color: "#10B981", order: 5, isDefault: false, isTerminal: true  },
    { name: "Lost",          color: "#EF4444", order: 6, isDefault: false, isTerminal: true  },
    { name: "On Hold",       color: "#6B7280", order: 7, isDefault: false, isTerminal: false },
  ];

  for (const s of leadStatuses) {
    const id = s.name.toLowerCase().replace(/\s+/g, "-");
    await db.leadStatus.upsert({
      where: { id },
      update: { isTerminal: s.isTerminal },
      create: { id, ...s },
    });
  }
  console.log("✅ Lead statuses created");

  // Create Order Statuses
  const orderStatuses = [
    { name: "New", color: "#3B82F6", order: 0, isDefault: true },
    { name: "Confirmed", color: "#8B5CF6", order: 1 },
    { name: "Processing", color: "#F59E0B", order: 2 },
    { name: "Shipped", color: "#14B8A6", order: 3 },
    { name: "Delivered", color: "#22C55E", order: 4 },
    { name: "Cancelled", color: "#EF4444", order: 5 },
    { name: "Returned", color: "#6B7280", order: 6 },
  ];

  for (const s of orderStatuses) {
    await db.orderStatus.upsert({
      where: { id: s.name.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: { id: s.name.toLowerCase().replace(/\s+/g, "-"), ...s },
    });
  }
  console.log("✅ Order statuses created");

  // Create Payment Methods
  const paymentMethods = [
    { name: "Cash", instructions: "Pay cash at the academy office.", accountDetails: "", isActive: true },
    { name: "Bank Transfer (CIB/BNA)", instructions: "Transfer to our bank account and upload the receipt.", accountDetails: "Account: 0000-0000-0000-0000\nBank: CIB Algeria", isActive: true },
    { name: "CCP", instructions: "Transfer to CCP and upload the receipt.", accountDetails: "CCP: 000000000000 / Clé: 00", isActive: true },
    { name: "BaridiMob", instructions: "Send payment via BaridiMob and upload screenshot.", accountDetails: "RIP: 00799999000000000000000", isActive: true },
  ];

  for (const m of paymentMethods) {
    const existing = await db.paymentMethod.findFirst({ where: { name: m.name } });
    if (!existing) await db.paymentMethod.create({ data: m });
  }
  console.log("✅ Payment methods created");

  // Create Subscription Plans
  const plans = [
    { name: "Monthly", description: "Monthly membership plan", duration: 1, durationType: "month", price: 3000, color: "#3B82F6" },
    { name: "Half Yearly", description: "6 months membership — 10% discount", duration: 6, durationType: "month", price: 16200, color: "#10B981" },
    { name: "Annual", description: "Full year membership — best value!", duration: 1, durationType: "year", price: 30000, color: "#8B5CF6" },
  ];

  for (const p of plans) {
    const existing = await db.subscriptionPlan.findFirst({ where: { name: p.name } });
    if (!existing) await db.subscriptionPlan.create({ data: p });
  }
  console.log("✅ Subscription plans created");

  // Create Product Categories
  const categories = [
    { name: "Jerseys", description: "Training and match jerseys", order: 0 },
    { name: "Training Kits", description: "Full training equipment sets", order: 1 },
    { name: "Balls", description: "Footballs for training and matches", order: 2 },
    { name: "Shoes", description: "Football boots and training shoes", order: 3 },
    { name: "Accessories", description: "Socks, bags, shin guards and more", order: 4 },
  ];

  for (const c of categories) {
    const existing = await db.productCategory.findFirst({ where: { name: c.name } });
    if (!existing) await db.productCategory.create({ data: c });
  }
  console.log("✅ Product categories created");

  // Create COD Form Fields
  const formFields = [
    { label: "Full Name", fieldName: "fullName", fieldType: "text", placeholder: "Your full name", isRequired: true, isDefault: true, order: 0 },
    { label: "Phone", fieldName: "phone", fieldType: "phone", placeholder: "+213 ...", isRequired: true, isDefault: true, order: 1 },
    { label: "Address", fieldName: "address", fieldType: "text", placeholder: "Street, neighborhood", isRequired: true, isDefault: true, order: 2 },
    { label: "City", fieldName: "city", fieldType: "text", placeholder: "Your city", isRequired: true, isDefault: true, order: 3 },
    { label: "Region/Wilaya", fieldName: "region", fieldType: "text", placeholder: "Wilaya", isRequired: true, isDefault: true, order: 4 },
    { label: "Notes", fieldName: "notes", fieldType: "textarea", placeholder: "Any special instructions...", isRequired: false, isDefault: true, order: 5 },
  ];

  for (const f of formFields) {
    const existing = await db.formField.findFirst({ where: { fieldName: f.fieldName } });
    if (!existing) await db.formField.create({ data: f });
  }
  console.log("✅ COD form fields created");

  // ==================== SHOWCASE WEBSITE DEMO CONTENT ====================
  // Gated behind SEED_DEMO_CONTENT because package.json's build script runs
  // `prisma db push && npm run seed` on EVERY deploy. Without this gate, demo
  // venues/coaches/programmes/news would be injected into the production
  // database — and into the live admin — on every single deploy. Fictional
  // Stations are especially disruptive: leads, players, payments, payroll and
  // finance reports all key off stationId.
  //
  // Everything ABOVE this block (permissions, roles, settings, statuses) is
  // system data and stays unconditional — in particular the website:* /
  // applications:* permissions, which the Showcase Website routes now require.
  if (process.env.SEED_DEMO_CONTENT !== "true") {
    console.log("⏭️  Skipping Showcase Website demo content (set SEED_DEMO_CONTENT=true to seed it)");
  } else {
    // Create Homepage (Showcase Website section builder — see src/components/website/sections)
    // Original Football Skills Academy copy — not derived from any reference site.
    const existingHome = await db.landingPage.findUnique({ where: { slug: "home" } });
    if (!existingHome) {
      await db.landingPage.create({
        data: {
          slug: "home",
          title: "Homepage",
          isPublished: true,
          metaTitle: "Football Skills Academy — Train, Compete, Grow",
          metaDescription: "Football Skills Academy runs year-round programmes, holiday courses and development squads for players aged 6-16, delivered by qualified coaches across our venues.",
          sections: {
            create: [
              {
                type: "hero", order: 0, isEnabled: true,
                content: JSON.stringify({
                  eyebrow: "Football Skills Academy", eyebrowFr: "Football Skills Academy",
                  heading: "Every Player.\nOne Clear Pathway.", headingFr: "Chaque joueur.\nUn seul chemin clair.",
                  subheading: "Year-round football programmes for players aged 6-16, built around technical development, teamwork and a genuine love of the game.",
                  subheadingFr: "Des programmes de football toute l'année pour les joueurs de 6 à 16 ans, centrés sur le développement technique, l'esprit d'équipe et le plaisir de jouer.",
                  imageUrl: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1600&q=80",
                  ctaLabel: "View Programmes", ctaLabelFr: "Voir les programmes", ctaUrl: "/programmes",
                  secondaryCtaLabel: "Book a Trial", secondaryCtaLabelFr: "Réserver un essai", secondaryCtaUrl: "/apply",
                  overlayOpacity: 0.5,
                }),
              },
              {
                type: "stats", order: 1, isEnabled: true,
                content: JSON.stringify({
                  items: [
                    { value: "200", suffix: "+", label: "Players trained", labelFr: "Joueurs formés" },
                    { value: "5", suffix: "+", label: "Years of coaching", labelFr: "Années d'encadrement" },
                    { value: "15", suffix: "", label: "Qualified coaches", labelFr: "Entraîneurs qualifiés" },
                    { value: "3", suffix: "", label: "Venues", labelFr: "Sites d'entraînement" },
                  ],
                }),
              },
              {
                type: "split-content", order: 2, isEnabled: true,
                content: JSON.stringify({
                  imagePosition: "right",
                  eyebrow: "Who we are", eyebrowFr: "Qui sommes-nous",
                  heading: "Built around long-term player development", headingFr: "Pensé pour le développement du joueur sur la durée",
                  body: "Football Skills Academy was founded to give young players a structured, age-appropriate pathway — from their first touch of the ball through to representative squad football. Every session is planned around what a player needs at that stage, not a one-size-fits-all drill sheet.",
                  bodyFr: "Football Skills Academy a été fondée pour offrir aux jeunes joueurs un parcours structuré et adapté à leur âge, des premiers pas avec le ballon jusqu'au football en équipe représentative.",
                  imageUrl: "https://images.unsplash.com/photo-1516731415730-0c607149933a?w=1200&q=80",
                  bulletPoints: [
                    { text: "Qualified, DBS-checked coaches at every session", textFr: "Des entraîneurs qualifiés et vérifiés à chaque séance" },
                    { text: "Small coaching ratios across all age groups", textFr: "Un encadrement en petits groupes pour tous les âges" },
                    { text: "A clear pathway from Foundation to Development Squads", textFr: "Un parcours clair, de la base aux équipes de développement" },
                  ],
                  ctaLabel: "Learn about our methodology", ctaLabelFr: "Découvrir notre méthodologie", ctaUrl: "/methodology",
                }),
              },
              {
                type: "feature-cards", order: 3, isEnabled: true,
                content: JSON.stringify({
                  heading: "Why families choose us", headingFr: "Pourquoi les familles nous choisissent",
                  cards: [
                    { icon: "Trophy", title: "Expert coaching", titleFr: "Coaching expert", body: "Structured sessions delivered by qualified coaches with a consistent academy-wide philosophy.", bodyFr: "Des séances structurées animées par des entraîneurs qualifiés." },
                    { icon: "Users", title: "Team spirit", titleFr: "Esprit d'équipe", body: "Players build lasting friendships and learn what it means to compete as a team.", bodyFr: "Les joueurs tissent des liens durables et apprennent l'esprit d'équipe." },
                    { icon: "Shield", title: "Safe environment", titleFr: "Environnement sûr", body: "Full safeguarding standards and medical support at every venue and session.", bodyFr: "Des normes de protection complètes à chaque séance." },
                    { icon: "Zap", title: "Modern methodology", titleFr: "Méthodologie moderne", body: "Constraints-based coaching that builds decision-making, not just technique.", bodyFr: "Un coaching basé sur la prise de décision, pas seulement la technique." },
                    { icon: "Star", title: "Competitive pathway", titleFr: "Parcours compétitif", body: "Game festivals, fixtures and a route into our Development Squads.", bodyFr: "Des matchs, festivals et un accès à nos équipes de développement." },
                    { icon: "TrendingUp", title: "Real progression", titleFr: "Vraie progression", body: "Every player's development is tracked against clear, age-based milestones.", bodyFr: "Le développement de chaque joueur est suivi selon des étapes claires." },
                  ],
                }),
              },
              {
                type: "pricing-cards", order: 4, isEnabled: true,
                content: JSON.stringify({ heading: "Plans & Pricing", headingFr: "Formules et tarifs", subheading: "Flexible plans to fit your schedule.", subheadingFr: "Des formules flexibles adaptées à votre emploi du temps." }),
              },
              {
                type: "logo-cloud", order: 5, isEnabled: true,
                content: JSON.stringify({ heading: "Sponsors & Partners", headingFr: "Sponsors & Partenaires" }),
              },
              {
                type: "cta-banner", order: 6, isEnabled: true,
                content: JSON.stringify({
                  heading: "Ready to join?", headingFr: "Prêt à nous rejoindre ?",
                  body: "Book a trial session and see what Football Skills Academy is about.", bodyFr: "Réservez une séance d'essai et découvrez Football Skills Academy.",
                  ctaLabel: "Book Now", ctaLabelFr: "Réserver", ctaUrl: "/apply", style: "navy",
                }),
              },
            ],
          },
        },
      });
    }
    console.log("✅ Homepage created");

    // Create Venues (Station extended with Showcase Website marketing fields)
    const venueSeed = [
      {
        name: "City Football Academy", slug: "city-football-academy", wilaya: "Algiers", wilayaCode: 16,
        address: "Bab Ezzouar, Algiers", isPubliclyListed: true, displayOrder: 0,
        heroImageUrl: "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=1200&q=80",
        shortDescription: "Our flagship venue with 3 full-size pitches and a dedicated indoor training hall.",
        facilities: JSON.stringify(["3 full-size pitches", "Indoor training hall", "Floodlit 5-a-side courts", "Clubhouse & changing rooms"]),
        pitchType: "3G artificial turf", changingRooms: "6 changing rooms with showers",
      },
      {
        name: "Riverside Training Centre", slug: "riverside-training-centre", wilaya: "Oran", wilayaCode: 31,
        address: "Riverside Park, Oran", isPubliclyListed: true, displayOrder: 1,
        heroImageUrl: "https://images.unsplash.com/photo-1487466365202-1afdb86c764e?w=1200&q=80",
        shortDescription: "A modern riverside venue used for our weekly programmes and game festivals.",
        facilities: JSON.stringify(["2 full-size pitches", "Parking on site", "Spectator area"]),
        pitchType: "Natural grass", changingRooms: "4 changing rooms",
      },
      {
        name: "Northside Sports Complex", slug: "northside-sports-complex", wilaya: "Constantine", wilayaCode: 25,
        address: "Northside District, Constantine", isPubliclyListed: true, displayOrder: 2,
        heroImageUrl: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1200&q=80",
        shortDescription: "Home to our Development Squads and holiday camp programmes.",
        facilities: JSON.stringify(["4 pitches", "Gym", "Meeting rooms"]),
        pitchType: "3G artificial turf", changingRooms: "6 changing rooms with showers",
      },
    ];
    // Station is an operational entity — leads, players, payments, meetings and
    // payroll all key off stationId — so demo branches are only ever created on
    // a database that has none. On an existing install the real stations are
    // reused for programme/schedule associations and left otherwise untouched;
    // an admin publishes them via Stations → Public / Marketing.
    const venues: Record<string, any> = {};
    const existingStations = await db.station.findMany({ orderBy: { createdAt: "asc" } });

    if (existingStations.length === 0) {
      for (const v of venueSeed) {
        venues[v.slug] = await db.station.create({ data: { ...v, status: "active" } });
      }
      console.log("✅ Demo venues created (database had no stations)");
    } else {
      // Map demo slugs onto real stations so the rest of the seed can reference
      // them, without inventing branches that would appear across the admin.
      venueSeed.forEach((v, i) => {
        venues[v.slug] = existingStations[Math.min(i, existingStations.length - 1)];
      });
      console.log(`⏭️  Kept ${existingStations.length} existing station(s) — no demo venues created`);
    }

    // Create Coaches (public-safe profiles, deliberately separate from StaffProfile/HRM data)
    const coachSeed = [
      { fullName: "Yanis Belkacem", role: "Head of Coaching", bio: "UEFA A-licensed coach with over a decade of youth development experience.", stationSlug: "city-football-academy" },
      { fullName: "Sofia Amrani", role: "Foundation Phase Lead", bio: "Specialist in technical development for players aged 6-10.", stationSlug: "city-football-academy" },
      { fullName: "Karim Ferhat", role: "Development Squad Coach", bio: "Former semi-professional player focused on the transition to competitive football.", stationSlug: "northside-sports-complex" },
    ];
    const coaches: Record<string, any> = {};
    for (const c of coachSeed) {
      const existing = await db.coach.findFirst({ where: { fullName: c.fullName } });
      coaches[c.fullName] = existing ?? (await db.coach.create({ data: { fullName: c.fullName, role: c.role, bio: c.bio, stationId: venues[c.stationSlug]?.id ?? null, isActive: true } }));
    }
    console.log("✅ Coaches created");

    // Create Programme Categories
    const categorySeed = [
      { name: "Weekly Programmes", slug: "weekly-programmes", colorTag: "#3996D6" },
      { name: "Holiday Camps", slug: "holiday-camps", colorTag: "#43C7ED" },
    ];
    const programmeCategories: Record<string, any> = {};
    for (const cat of categorySeed) {
      const existing = await db.programmeCategory.findUnique({ where: { slug: cat.slug } });
      programmeCategories[cat.slug] = existing ?? (await db.programmeCategory.create({ data: cat }));
    }
    console.log("✅ Programme categories created");

    // Create Programmes — original Football Skills Academy content (Phase 15 seed content)
    const existingFootballSchool = await db.programme.findUnique({ where: { slug: "football-school" } });
    if (!existingFootballSchool) {
      const programme = await db.programme.create({
        data: {
          slug: "football-school",
          name: "Football School", nameFr: "École de Football",
          shortDescription: "All abilities welcome. Weekly technical training for players aged 6-16.",
          shortDescriptionFr: "Tous niveaux bienvenus. Entraînement technique hebdomadaire pour les 6-16 ans.",
          fullDescription: "Football School is our year-round weekly programme for boys and girls aged 6-16. Players train and develop at a world-class facility, focusing on technical development, decision-making, confidence and creativity — delivered by our qualified coaches following a single academy-wide methodology. Fun, skills and a long-term love of the game start here.",
          fullDescriptionFr: "L'École de Football est notre programme hebdomadaire pour les garçons et filles de 6 à 16 ans, axé sur le développement technique, la prise de décision, la confiance et la créativité.",
          heroImageUrl: "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=1600&q=80",
          cardImageUrl: "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=800&q=80",
          categoryId: programmeCategories["weekly-programmes"].id,
          ageRangeLabel: "Ages 6-16", ageRangeLabelFr: "6 à 16 ans",
          minAge: 6, maxAge: 16,
          priceLabel: "From 4,000 DA / month", priceLabelFr: "À partir de 4 000 DA / mois", priceFrom: 4000,
          promoBannerText: "Football School Summer", promoBannerTextFr: "École de Football — Été",
          isFeatured: true, isPubliclyListed: true, displayOrder: 0,
          metaTitle: "Football School | Football Skills Academy",
          metaDescription: "Weekly football training for players aged 6-16, delivered by qualified coaches at Football Skills Academy.",
        },
      });
      const rows: [string, number, number, string, string, string, string, string, number][] = [
        ["Under 8", 6, 8, "Skills", "Monday", "17:30", "18:45", "city-football-academy", 4000],
        ["Under 10", 8, 10, "Skills", "Wednesday", "17:30", "18:45", "city-football-academy", 4000],
        ["Under 12", 10, 12, "Skills", "Tuesday", "17:30", "18:45", "city-football-academy", 4500],
        ["Under 14", 12, 14, "Skills", "Thursday", "18:30", "19:45", "city-football-academy", 4500],
        ["Under 16", 14, 16, "Skills", "Thursday", "18:30", "19:45", "city-football-academy", 5000],
      ];
      for (let i = 0; i < rows.length; i++) {
        const [ageGroup, minAge, maxAge, sessionName, day, startTime, endTime, stationSlug, price] = rows[i];
        await db.programmeSchedule.create({
          data: {
            programmeId: programme.id, ageGroup, minAge, maxAge, sessionName, day, startTime, endTime,
            venueId: venues[stationSlug]?.id ?? null, coachId: i < 2 ? coaches["Sofia Amrani"].id : coaches["Yanis Belkacem"].id,
            price, registrationStatus: "open", order: i,
          },
        });
      }
      await db.programmeCoach.create({ data: { programmeId: programme.id, coachId: coaches["Yanis Belkacem"].id, order: 0 } });
      await db.programmeCoach.create({ data: { programmeId: programme.id, coachId: coaches["Sofia Amrani"].id, order: 1 } });
      await db.programmeVenue.create({ data: { programmeId: programme.id, venueId: venues["city-football-academy"].id, order: 0 } });

      await db.faq.createMany({
        data: [
          { question: "Who are the courses aimed at?", answer: "<p>Football School is open to all boys and girls aged 6-16, of all abilities.</p>", programmeId: programme.id, category: "football-school", order: 0 },
          { question: "How much is the course?", answer: "<p>Pricing starts from 4,000 DA per month depending on age group — see the schedule above for full pricing.</p>", programmeId: programme.id, category: "football-school", order: 1 },
          { question: "What should my child bring?", answer: "<p>Please bring boots, shin pads, a water bottle and both light and dark training tops.</p>", programmeId: programme.id, category: "football-school", order: 2 },
        ],
      });
    }

    const existingHolidayCamp = await db.programme.findUnique({ where: { slug: "holiday-football-camp" } });
    if (!existingHolidayCamp) {
      const programme = await db.programme.create({
        data: {
          slug: "holiday-football-camp",
          name: "Holiday Football Camp", nameFr: "Stage de Football",
          shortDescription: "A week of intensive training and match play during the school holidays.",
          shortDescriptionFr: "Une semaine d'entraînement intensif et de matchs pendant les vacances scolaires.",
          fullDescription: "Our Holiday Football Camp gives players a full week of training, small-sided games and tournaments during school holidays, led by our coaching team. A great way to keep progressing — or to try the academy for the first time.",
          heroImageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&q=80",
          cardImageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80",
          categoryId: programmeCategories["holiday-camps"].id,
          ageRangeLabel: "Ages 6-16", minAge: 6, maxAge: 16,
          priceLabel: "From 12,000 DA / week", priceFrom: 12000,
          isFeatured: false, isPubliclyListed: true, displayOrder: 1,
          metaTitle: "Holiday Football Camp | Football Skills Academy",
          metaDescription: "A week of intensive football training and match play during the school holidays for players aged 6-16.",
        },
      });
      await db.programmeSchedule.create({
        data: {
          programmeId: programme.id, ageGroup: "All ages", minAge: 6, maxAge: 16, sessionName: "Full day camp",
          day: "Monday-Friday", startTime: "09:00", endTime: "15:00", venueId: venues["northside-sports-complex"]?.id ?? null,
          coachId: coaches["Karim Ferhat"].id, price: 12000, registrationStatus: "open", order: 0,
        },
      });
      await db.programmeVenue.create({ data: { programmeId: programme.id, venueId: venues["northside-sports-complex"].id, order: 0 } });
    }
    console.log("✅ Programmes created");

    // Create Pathway Levels
    const pathwayCount = await db.pathwayLevel.count();
    if (pathwayCount === 0) {
      const levels = [
        { name: "Foundation", ageRangeLabel: "Ages 6-8", color: "#43C7ED", description: "Introducing the fundamentals of the game in a fun, safe environment.", order: 0 },
        { name: "Development", ageRangeLabel: "Ages 9-12", color: "#3996D6", description: "Building technical ability, decision-making and game understanding.", order: 1 },
        { name: "Advanced", ageRangeLabel: "Ages 13-16", color: "#002B5C", description: "Preparing players for competitive football and representative squads.", order: 2 },
        { name: "Development Squads", ageRangeLabel: "By assessment", color: "#001F49", description: "Our highest level of coaching for players identified through assessment.", order: 3 },
      ];
      await db.pathwayLevel.createMany({ data: levels });
    }
    console.log("✅ Pathway levels created");

    // Create general FAQs (Contact / Squads pages)
    const generalFaqCount = await db.faq.count({ where: { category: "general" } });
    if (generalFaqCount === 0) {
      await db.faq.createMany({
        data: [
          { question: "What age groups do you coach?", answer: "<p>We coach players from age 6 through 16 across our Football School, Holiday Camps and Development Squads.</p>", category: "general", order: 0 },
          { question: "Do you offer trial sessions?", answer: "<p>Yes — contact us or use the Book Now button on any programme page to arrange a trial session.</p>", category: "general", order: 1 },
          { question: "What is your safeguarding policy?", answer: "<p>All coaches are vetted and DBS-checked, and every session follows our full safeguarding policy. Contact us for a copy.</p>", category: "general", order: 2 },
        ],
      });
    }
    console.log("✅ General FAQs created");

    const squadFaqCount = await db.faq.count({ where: { category: "squads" } });
    if (squadFaqCount === 0) {
      await db.faq.createMany({
        data: [
          { question: "How are players selected for Development Squads?", answer: "<p>Players are assessed during their regular weekly sessions. Our coaching team identifies players ready for the next level and invites them to register.</p>", category: "squads", order: 0 },
          { question: "Is there an additional cost for Development Squads?", answer: "<p>Yes — Development Squads have their own pricing, which will be confirmed once your registration is reviewed.</p>", category: "squads", order: 1 },
        ],
      });
    }
    console.log("✅ Squad FAQs created");

    // Create Who We Are / Methodology / Pathway pages (generalized page builder)
    const existingWhoWeAre = await db.landingPage.findUnique({ where: { slug: "who-we-are" } });
    if (!existingWhoWeAre) {
      await db.landingPage.create({
        data: {
          slug: "who-we-are", title: "Who We Are", isPublished: true,
          metaTitle: "Who We Are | Football Skills Academy",
          metaDescription: "Football Skills Academy is built around long-term player development, qualified coaching and a safe, inclusive environment for every player.",
          sections: {
            create: [
              {
                type: "hero", order: 0, isEnabled: true,
                content: JSON.stringify({
                  heading: "Football Programmes\nBuilt Around Development",
                  subheading: "We exist to help every player reach their potential — on the pitch and off it.",
                  imageUrl: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=1600&q=80",
                  ctaLabel: "View Programmes", ctaUrl: "/programmes",
                }),
              },
              {
                type: "split-content", order: 1, isEnabled: true,
                content: JSON.stringify({
                  imagePosition: "right",
                  eyebrow: "Our story",
                  heading: "Founded on one simple idea",
                  body: "Football Skills Academy was founded to give every young player — regardless of starting ability — access to structured, high-quality coaching. We believe development takes time, and that the best results come from a clear, age-appropriate pathway rather than shortcuts.",
                  imageUrl: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1200&q=80",
                  ctaLabel: "Our Methodology", ctaUrl: "/methodology",
                }),
              },
              {
                type: "feature-cards", order: 2, isEnabled: true,
                content: JSON.stringify({
                  heading: "What makes us different",
                  cards: [
                    { icon: "TrendingUp", title: "Long-term development", body: "Every session is planned around a multi-year pathway, not just the next match." },
                    { icon: "Shield", title: "Safeguarding first", body: "Fully vetted coaches and a comprehensive safeguarding policy at every venue." },
                    { icon: "Users", title: "Inclusive environment", body: "All abilities are welcome — our job is to help every player improve from where they are." },
                    { icon: "Award", title: "Coaching standards", body: "A single academy-wide coaching philosophy, consistently delivered across all venues." },
                  ],
                }),
              },
              {
                type: "cta-banner", order: 3, isEnabled: true,
                content: JSON.stringify({ heading: "Find your programme", body: "Explore our programmes and find the right fit for your player.", ctaLabel: "View Programmes", ctaUrl: "/programmes", style: "navy" }),
              },
            ],
          },
        },
      });
    }

    const existingMethodology = await db.landingPage.findUnique({ where: { slug: "methodology" } });
    if (!existingMethodology) {
      await db.landingPage.create({
        data: {
          slug: "methodology", title: "Methodology", isPublished: true,
          metaTitle: "Methodology | Football Skills Academy",
          metaDescription: "Our coaching methodology develops technical, tactical, physical, psychological and social skills through age-appropriate, constraints-based sessions.",
          sections: {
            create: [
              {
                type: "hero", order: 0, isEnabled: true,
                content: JSON.stringify({
                  heading: "Our Methodology", subheading: "A single coaching philosophy, applied consistently across every age group and venue.",
                  imageUrl: "https://images.unsplash.com/photo-1602674809991-8f1b40e0a2c4?w=1600&q=80",
                }),
              },
              {
                type: "richtext", order: 1, isEnabled: true,
                content: JSON.stringify({
                  heading: "Developing the whole player",
                  html: "<p>We coach five interconnected areas of player development: technical, tactical, physical, psychological and social. Sessions are designed around realistic game situations using constraints-based coaching — putting players in scenarios that force them to make decisions, rather than simply repeating drills.</p>",
                }),
              },
              {
                type: "feature-cards", order: 2, isEnabled: true,
                content: JSON.stringify({
                  heading: "The five pillars",
                  cards: [
                    { icon: "Target", title: "Technical", body: "Ball mastery, passing, receiving and finishing built through repetition in game-realistic situations." },
                    { icon: "Trophy", title: "Tactical", body: "Understanding roles, formations and decision-making appropriate to each age group." },
                    { icon: "Zap", title: "Physical", body: "Age-appropriate athletic development including speed, agility and coordination." },
                    { icon: "Star", title: "Psychological", body: "Confidence, resilience and the ability to make decisions under pressure." },
                    { icon: "Users", title: "Social", body: "Teamwork, communication and what it means to support your teammates." },
                  ],
                }),
              },
              {
                type: "cta-banner", order: 3, isEnabled: true,
                content: JSON.stringify({ heading: "See our pathway in action", ctaLabel: "View Pathway", ctaUrl: "/pathway", style: "sky" }),
              },
            ],
          },
        },
      });
    }

    const existingPathwayPage = await db.landingPage.findUnique({ where: { slug: "pathway" } });
    if (!existingPathwayPage) {
      await db.landingPage.create({
        data: {
          slug: "pathway", title: "Pathway", isPublished: true,
          metaTitle: "Player Pathway | Football Skills Academy",
          metaDescription: "From Foundation to Development Squads — a clear, age-based pathway for every Football Skills Academy player.",
          sections: {
            create: [
              {
                type: "hero", order: 0, isEnabled: true,
                content: JSON.stringify({
                  heading: "The Player Pathway", subheading: "A clear route from a player's first session through to competitive Development Squad football.",
                  imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&q=80",
                }),
              },
              {
                type: "richtext", order: 1, isEnabled: true,
                content: JSON.stringify({ html: "<p>Every player progresses through our pathway at their own pace, guided by ongoing assessment from our coaching team. Progression is based on ability and attitude, not just age.</p>" }),
              },
              { type: "pathway-timeline", order: 2, isEnabled: true, content: JSON.stringify({ heading: "" }) },
              { type: "faq-accordion", order: 3, isEnabled: true, content: JSON.stringify({ heading: "Frequently Asked Questions", category: "pathway" }) },
              {
                type: "cta-banner", order: 4, isEnabled: true,
                content: JSON.stringify({ heading: "Ready to start the journey?", ctaLabel: "View Programmes", ctaUrl: "/programmes", style: "navy" }),
              },
            ],
          },
        },
      });
    }
    console.log("✅ Who We Are / Methodology / Pathway pages created");

    const pathwayFaqCount = await db.faq.count({ where: { category: "pathway" } });
    if (pathwayFaqCount === 0) {
      await db.faq.createMany({
        data: [
          { question: "How does my child move to the next stage?", answer: "<p>Our coaches continuously assess players during regular sessions and will discuss progression opportunities directly with parents.</p>", category: "pathway", order: 0 },
          { question: "Can a player skip a stage?", answer: "<p>Progression is based on ability and readiness rather than age alone, so this is possible in some cases following assessment.</p>", category: "pathway", order: 1 },
        ],
      });
    }
    console.log("✅ Pathway FAQs created");

    // Create global Header + Footer config (none existed — the public header/footer
    // render nothing at all without a config row, so this is required, not optional).
    const existingHeader = await db.websiteHeaderConfig.findFirst({ where: { stationId: null } });
    if (!existingHeader) {
      const header = await db.websiteHeaderConfig.create({
        data: {
          stationId: null,
          backgroundColor: "#FFFFFF", textColor: "#001F49", accentColor: "#43C7ED",
          sticky: true, showLanguageSwitcher: true,
          ctaLabel: "Book Now", ctaLabelFr: "Réserver", ctaLabelAr: "احجز الآن",
          ctaUrl: "/apply", ctaStyle: "filled",
        },
      });
      const navSeed = [
        { label: "Programmes", labelFr: "Programmes", labelAr: "البرامج", url: "/programmes", hasDropdown: false, position: 0 },
        { label: "Venues", labelFr: "Sites", labelAr: "المواقع", url: "/venues", hasDropdown: false, position: 1 },
        { label: "Squads", labelFr: "Squads", labelAr: "الفرق", url: "/squads", hasDropdown: false, position: 2 },
        {
          label: "Who We Are", labelFr: "Qui sommes-nous", labelAr: "من نحن", url: null, hasDropdown: true, position: 3,
          dropdownItems: [
            { label: "Who We Are", labelFr: "Qui sommes-nous", labelAr: "من نحن", url: "/who-we-are", position: 0 },
            { label: "Methodology", labelFr: "Méthodologie", labelAr: "المنهجية", url: "/methodology", position: 1 },
            { label: "Pathway", labelFr: "Parcours", labelAr: "المسار", url: "/pathway", position: 2 },
          ],
        },
        { label: "News", labelFr: "Actualités", labelAr: "الأخبار", url: "/news", hasDropdown: false, position: 4 },
        { label: "Contact Us", labelFr: "Contact", labelAr: "اتصل بنا", url: "/contact", hasDropdown: false, position: 5 },
      ];
      for (const item of navSeed) {
        const { dropdownItems, ...navData } = item as typeof navSeed[number] & { dropdownItems?: any[] };
        const navItem = await db.headerNavItem.create({ data: { ...navData, headerId: header.id } });
        if (dropdownItems?.length) {
          await db.headerNavDropdownItem.createMany({ data: dropdownItems.map((d) => ({ ...d, navItemId: navItem.id })) });
        }
      }
      console.log("✅ Header config created");
    }

    const existingFooter = await db.websiteFooterConfig.findFirst({ where: { stationId: null } });
    if (!existingFooter) {
      const footer = await db.websiteFooterConfig.create({
        data: {
          stationId: null,
          backgroundColor: "#001F49", textColor: "#FFFFFF", accentColor: "#43C7ED",
          tagline: "Train, compete and grow with Football Skills Academy.",
          taglineFr: "Entraînez-vous, progressez et grandissez avec Football Skills Academy.",
          copyrightText: `© ${new Date().getFullYear()} Football Skills Academy. All rights reserved.`,
        },
      });
      await db.footerLinkColumn.create({
        data: {
          footerId: footer.id, title: "Explore", titleFr: "Découvrir", position: 0,
          links: { create: [
            { label: "Programmes", url: "/programmes", position: 0 },
            { label: "Venues", url: "/venues", position: 1 },
            { label: "Development Squads", url: "/squads", position: 2 },
            { label: "News", url: "/news", position: 3 },
          ] },
        },
      });
      await db.footerLinkColumn.create({
        data: {
          footerId: footer.id, title: "About", titleFr: "À propos", position: 1,
          links: { create: [
            { label: "Who We Are", url: "/who-we-are", position: 0 },
            { label: "Methodology", url: "/methodology", position: 1 },
            { label: "Pathway", url: "/pathway", position: 2 },
            { label: "Contact Us", url: "/contact", position: 3 },
          ] },
        },
      });
      await db.footerBottomLink.createMany({
        data: [
          { footerId: footer.id, label: "Privacy Policy", labelFr: "Confidentialité", url: "/privacy", position: 0 },
          { footerId: footer.id, label: "Terms", labelFr: "Conditions", url: "/terms", position: 1 },
          { footerId: footer.id, label: "Safeguarding", labelFr: "Protection", url: "/contact#safeguarding", position: 2 },
        ],
      });
      console.log("✅ Footer config created");
    }

    const contactFaqCount = await db.faq.count({ where: { category: "contact" } });
    if (contactFaqCount === 0) {
      await db.faq.createMany({
        data: [
          { question: "How quickly will I get a reply?", answer: "<p>We aim to respond to all enquiries within 1-2 working days.</p>", category: "contact", order: 0 },
          { question: "I have a safeguarding concern — who do I contact?", answer: "<p>Please use the contact form or call us directly and mark your message as \"Safeguarding\" so it is treated as a priority.</p>", category: "contact", order: 1 },
        ],
      });
    }
    console.log("✅ Contact FAQs created");

    // Create News category + articles
    const existingNewsCat = await db.newsCategory.findUnique({ where: { slug: "academy-news" } });
    const newsCategory = existingNewsCat ?? (await db.newsCategory.create({ data: { name: "Academy News", nameFr: "Actualités de l'académie", slug: "academy-news", order: 0 } }));

    const existingArticle1 = await db.newsArticle.findUnique({ where: { slug: "welcome-to-football-skills-academy" } });
    if (!existingArticle1) {
      await db.newsArticle.create({
        data: {
          slug: "welcome-to-football-skills-academy",
          title: "Welcome to Football Skills Academy",
          excerpt: "We're excited to launch our new Showcase Website, with programmes, venues and Development Squads all in one place.",
          body: "<p>We're excited to launch our redesigned website — a single place to explore our programmes, find your nearest venue, and register interest in our Development Squads.</p><p>Whether your player is just starting out or ready for the next step, our team is here to help you find the right fit.</p>",
          coverImageUrl: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&q=80",
          categoryId: newsCategory.id, authorName: "Football Skills Academy",
          isPublished: true, isFeatured: true, publishedAt: new Date(),
        },
      });
    }

    const existingArticle2 = await db.newsArticle.findUnique({ where: { slug: "summer-holiday-camp-dates-announced" } });
    if (!existingArticle2) {
      await db.newsArticle.create({
        data: {
          slug: "summer-holiday-camp-dates-announced",
          title: "Holiday Football Camp Dates Announced",
          excerpt: "Our next Holiday Football Camp is open for registration — a full week of training and match play.",
          body: "<p>Registration is now open for our next Holiday Football Camp. Places are limited, so early registration is recommended.</p><p>See the Programmes page for full pricing and schedule details.</p>",
          coverImageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=80",
          categoryId: newsCategory.id, authorName: "Football Skills Academy",
          isPublished: true, isFeatured: false, publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
    console.log("✅ News articles created");
    console.log("✅ Showcase Website demo content seeded");
  }

  // Create Registration Survey
  const existingSurvey = await db.survey.findFirst({ where: { title: "Registration Survey" } });
  if (!existingSurvey) {
    await db.survey.create({
      data: {
        title: "Registration Survey",
        description: "Questions for new player registrations",
        isActive: true,
        questions: {
          create: [
            { question: "How did you hear about us?", questionType: "select", options: JSON.stringify(["Social Media", "Friend/Family Referral", "Website", "Street Advertisement", "Other"]), isRequired: true, order: 0 },
            { question: "What are your football goals?", questionType: "textarea", isRequired: false, order: 1 },
            { question: "Do you have any previous football training?", questionType: "radio", options: JSON.stringify(["No experience", "Basic training", "Club experience", "Semi-professional"]), isRequired: true, order: 2 },
          ],
        },
      },
    });
  }
  console.log("✅ Registration survey created");

  // Create Wilayas
  const wilayasData = [
    { code: 1, nameFr: "Adrar", nameAr: "أدرار" },
    { code: 2, nameFr: "Chlef", nameAr: "الشلف" },
    { code: 3, nameFr: "Laghouat", nameAr: "الأغواط" },
    { code: 4, nameFr: "Oum El Bouaghi", nameAr: "أم البواقي" },
    { code: 5, nameFr: "Batna", nameAr: "باتنة" },
    { code: 6, nameFr: "Béjaïa", nameAr: "بجاية" },
    { code: 7, nameFr: "Biskra", nameAr: "بسكرة" },
    { code: 8, nameFr: "Béchar", nameAr: "بشار" },
    { code: 9, nameFr: "Blida", nameAr: "البليدة" },
    { code: 10, nameFr: "Bouira", nameAr: "البويرة" },
    { code: 11, nameFr: "Tamanrasset", nameAr: "تمنراست" },
    { code: 12, nameFr: "Tébessa", nameAr: "تبسة" },
    { code: 13, nameFr: "Tlemcen", nameAr: "تلمسان" },
    { code: 14, nameFr: "Tiaret", nameAr: "تيارت" },
    { code: 15, nameFr: "Tizi Ouzou", nameAr: "تيزي وزو" },
    { code: 16, nameFr: "Alger", nameAr: "الجزائر" },
    { code: 17, nameFr: "Djelfa", nameAr: "الجلفة" },
    { code: 18, nameFr: "Jijel", nameAr: "جيجل" },
    { code: 19, nameFr: "Sétif", nameAr: "سطيف" },
    { code: 20, nameFr: "Saïda", nameAr: "سعيدة" },
    { code: 21, nameFr: "Skikda", nameAr: "سكيكدة" },
    { code: 22, nameFr: "Sidi Bel Abbès", nameAr: "سيدي بلعباس" },
    { code: 23, nameFr: "Annaba", nameAr: "عنابة" },
    { code: 24, nameFr: "Guelma", nameAr: "قالمة" },
    { code: 25, nameFr: "Constantine", nameAr: "قسنطينة" },
    { code: 26, nameFr: "Médéa", nameAr: "المدية" },
    { code: 27, nameFr: "Mostaganem", nameAr: "مستغانم" },
    { code: 28, nameFr: "M'Sila", nameAr: "المسيلة" },
    { code: 29, nameFr: "Mascara", nameAr: "معسكر" },
    { code: 30, nameFr: "Ouargla", nameAr: "ورقلة" },
    { code: 31, nameFr: "Oran", nameAr: "وهران" },
    { code: 32, nameFr: "El Bayadh", nameAr: "البيض" },
    { code: 33, nameFr: "Illizi", nameAr: "إليزي" },
    { code: 34, nameFr: "Bordj Bou Arréridj", nameAr: "برج بوعريريج" },
    { code: 35, nameFr: "Boumerdès", nameAr: "بومرداس" },
    { code: 36, nameFr: "El Tarf", nameAr: "الطارف" },
    { code: 37, nameFr: "Tindouf", nameAr: "تندوف" },
    { code: 38, nameFr: "Tissemsilt", nameAr: "تيسمسيلت" },
    { code: 39, nameFr: "El Oued", nameAr: "الوادي" },
    { code: 40, nameFr: "Khenchela", nameAr: "خنشلة" },
    { code: 41, nameFr: "Souk Ahras", nameAr: "سوق أهراس" },
    { code: 42, nameFr: "Tipaza", nameAr: "تيبازة" },
    { code: 43, nameFr: "Mila", nameAr: "ميلة" },
    { code: 44, nameFr: "Aïn Defla", nameAr: "عين الدفلى" },
    { code: 45, nameFr: "Naâma", nameAr: "النعامة" },
    { code: 46, nameFr: "Aïn Témouchent", nameAr: "عين تيموشنت" },
    { code: 47, nameFr: "Ghardaïa", nameAr: "غرداية" },
    { code: 48, nameFr: "Relizane", nameAr: "غليزان" },
    { code: 49, nameFr: "Timimoun", nameAr: "تيميمون" },
    { code: 50, nameFr: "Bordj Badji Mokhtar", nameAr: "برج باجي مختار" },
    { code: 51, nameFr: "Ouled Djellal", nameAr: "أولاد جلال" },
    { code: 52, nameFr: "Béni Abbès", nameAr: "بني عباس" },
    { code: 53, nameFr: "In Salah", nameAr: "عين صالح" },
    { code: 54, nameFr: "In Guezzam", nameAr: "عين قزام" },
    { code: 55, nameFr: "Touggourt", nameAr: "تقرت" },
    { code: 56, nameFr: "Djanet", nameAr: "جانت" },
    { code: 57, nameFr: "El M'Ghair", nameAr: "المغير" },
    { code: 58, nameFr: "El Meniaa", nameAr: "المنيعة" },
  ];
  for (const w of wilayasData) {
    await db.wilaya.upsert({ where: { code: w.code }, update: {}, create: w });
  }
  console.log("✅ 58 Algerian wilayas created");

  // Create Charge Categories (global)
  const chargeCategoriesData = [
    { name: "Rent", color: "#3B82F6", isGlobal: true },
    { name: "Utilities", color: "#F59E0B", isGlobal: true },
    { name: "Equipment", color: "#8B5CF6", isGlobal: true },
    { name: "Marketing", color: "#EC4899", isGlobal: true },
    { name: "Salaries", color: "#10B981", isGlobal: true },
    { name: "Coaching", color: "#F97316", isGlobal: true },
    { name: "Other", color: "#6B7280", isGlobal: true },
  ];
  for (const c of chargeCategoriesData) {
    const existing = await db.chargeCategory.findFirst({ where: { name: c.name, stationId: null } });
    if (!existing) await db.chargeCategory.create({ data: c });
  }
  console.log("✅ Charge categories created");

  // Create Attribute Groups
  const attributeGroupsData = ["Size", "Color", "Level", "Age group"];
  for (const name of attributeGroupsData) {
    const existing = await db.attributeGroup.findFirst({ where: { name, stationId: null } });
    if (!existing) await db.attributeGroup.create({ data: { name } });
  }
  console.log("✅ Attribute groups created");

  console.log("\n🎉 Seeding complete!");
  console.log("   Email:    admin@hxacademy.com");
  console.log("   Password: admin123");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => db.$disconnect());
