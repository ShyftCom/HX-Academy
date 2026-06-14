import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
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
    { key: "academy_name", value: "Foot-Ball Skills Academy" },
    { key: "academy_email", value: "contact@footballskillsacademy.com" },
    { key: "academy_phone", value: "+213 000 000 000" },
    { key: "academy_whatsapp", value: "+213 000 000 000" },
    { key: "academy_address", value: "Algiers, Algeria" },
    { key: "academy_logo", value: "" },
    { key: "academy_favicon", value: "" },
    { key: "primary_color", value: "#1e40af" },
    { key: "secondary_color", value: "#0f172a" },
    { key: "footer_text", value: "© 2024 Foot-Ball Skills Academy. All rights reserved." },
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

  // Create Landing Page
  const existingPage = await db.landingPage.findFirst();
  if (!existingPage) {
    await db.landingPage.create({
      data: {
        isPublished: false,
        sections: {
          create: [
            { type: "hero", title: "Hero Section", content: JSON.stringify({ heading: "Join Foot-Ball Skills Academy", subheading: "Train like a champion.", buttonText: "Register Now", buttonUrl: "#registration" }), order: 0, isEnabled: true },
            { type: "about", title: "About Us", content: JSON.stringify({ title: "About Foot-Ball Skills Academy", text: "We are a premier football academy dedicated to developing young talent." }), order: 1, isEnabled: true },
            { type: "plans", title: "Membership Plans", content: JSON.stringify({ title: "Choose Your Plan", subtitle: "Flexible plans to fit your schedule and budget." }), order: 2, isEnabled: true },
            { type: "registration", title: "Registration Form", content: JSON.stringify({ title: "Register Now", subtitle: "Fill out the form below and we'll get back to you shortly." }), order: 3, isEnabled: true },
            { type: "footer", title: "Footer", content: JSON.stringify({ copyright: "© 2024 Foot-Ball Skills Academy. All rights reserved.", email: "contact@footballskillsacademy.com", phone: "+213 000 000 000" }), order: 4, isEnabled: true },
          ],
        },
      },
    });
  }
  console.log("✅ Landing page created");

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
