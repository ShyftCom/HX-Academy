/**
 * SlickPay end-to-end self-test.
 *
 * Proves the money path against whatever credentials are configured, printing
 * the gateway's own answers at each stage — so "is this actually wired up?"
 * has an evidence-based answer instead of a hopeful one.
 *
 *   npx tsx scripts/slickpay-selftest.ts
 *       Read-only. Checks the stored config and that the API key authenticates.
 *       Safe to run in production; charges nothing, creates nothing.
 *
 *   npx tsx scripts/slickpay-selftest.ts --invoice [amount]
 *       Also creates a real invoice and prints the SATIM payment URL. Creating
 *       an invoice does not move money — someone still has to open that URL and
 *       enter a card — so this is safe in production too. Default 200 DA.
 *
 *   npx tsx scripts/slickpay-selftest.ts --check <invoiceId>
 *       Reads one invoice back and prints whether SlickPay considers it paid,
 *       and for how much. Use this after paying the URL from --invoice.
 *
 *   npx tsx scripts/slickpay-selftest.ts --activate <invoiceId>
 *       The full proof: attaches a real (temporary) player and plan to that
 *       invoice, runs the production settlement path, and shows the payment
 *       flipping to approved and the subscription going active. The temporary
 *       player is deleted afterwards. Use a PAID invoice id.
 */
import { db } from "@/lib/db";
import {
  getSlickPayConfig,
  isSlickPayUsable,
  testConnection,
  createInvoice,
  getInvoice,
} from "@/lib/slickpay";
import { settleSlickPayPayment } from "@/lib/slickpay-settle";

const ok = (s: string) => `  \x1b[32m✓\x1b[0m ${s}`;
const bad = (s: string) => `  \x1b[31m✗\x1b[0m ${s}`;
const info = (s: string) => `    ${s}`;
const head = (s: string) => `\n\x1b[1m${s}\x1b[0m`;
const json = (v: unknown) =>
  JSON.stringify(v, null, 2).split("\n").map((l) => "    " + l).join("\n");

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => args.indexOf(name);

  // ---- 1. Configuration ----
  console.log(head("1. Configuration (from the Settings table)"));
  const config = await getSlickPayConfig();
  console.log(info(`enabled          ${config.enabled}`));
  console.log(info(`mode             ${config.mode}${config.mode === "sandbox" ? "  (test money)" : "  (REAL money)"}`));
  console.log(info(`API key          ${config.publicKey ? "set, ending " + config.publicKey.slice(-4) : "MISSING"}`));
  console.log(info(`webhook secret   ${config.webhookSecret ? "set" : "MISSING — save Settings → SlickPay once to generate it"}`));
  console.log(info(`receiving acct   ${config.accountUuid || "(default)"}`));

  if (!config.publicKey) {
    console.log(bad("No API key. Paste one into Settings → SlickPay, then re-run."));
    return;
  }
  console.log(
    isSlickPayUsable(config)
      ? ok("Players will be offered card payment.")
      : bad("Key present but the gateway is switched OFF — players see only manual methods."),
  );

  // ---- 2. Credentials ----
  console.log(head("2. Does the key authenticate?"));
  const conn = await testConnection(config);
  if (!conn.ok) {
    console.log(bad(`SlickPay rejected it: ${conn.error} (HTTP ${conn.status})`));
    return;
  }
  console.log(ok(`SlickPay accepted the key on the ${config.mode} host.`));

  // ---- 3. Create an invoice ----
  const invoiceIdx = flag("--invoice");
  if (invoiceIdx !== -1) {
    const amount = Number(args[invoiceIdx + 1]) || 200;
    console.log(head(`3. Creating a real invoice for ${amount} DA`));
    const created = await createInvoice(config, {
      amount,
      returnUrl: "https://example.com/return",
      firstname: "Self",
      lastname: "Test",
      phone: "0555000000",
      email: "selftest@example.com",
      address: "Algiers",
      note: "SlickPay self-test",
      items: [{ name: "Self test", price: amount, quantity: 1 }],
    });
    console.log(ok(`Invoice ${created.id} created.`));
    console.log(info(`\x1b[1mPay it here:\x1b[0m ${created.url}`));
    console.log(info(`Then: npx tsx scripts/slickpay-selftest.ts --check ${created.id}`));
  }

  // ---- 4. Read an invoice back ----
  const checkIdx = flag("--check");
  if (checkIdx !== -1) {
    const id = args[checkIdx + 1];
    console.log(head(`4. What SlickPay says about invoice ${id}`));
    const inv = await getInvoice(config, id);
    console.log(json({ paid: inv.paid, amountPaid: inv.amount, slickpayStatus: inv.status, payStatus: inv.payStatus, completed: inv.completed }));
    console.log(inv.paid ? ok(`PAID — ${inv.amount} DA received.`) : bad(`Not paid yet (status "${inv.status}").`));
  }

  // ---- 5. Full activation proof ----
  const actIdx = flag("--activate");
  if (actIdx !== -1) {
    const invoiceId = args[actIdx + 1];
    console.log(head(`5. Settling invoice ${invoiceId} into a real subscription`));

    const inv = await getInvoice(config, invoiceId);
    if (!inv.paid) {
      console.log(bad(`That invoice is not paid (status "${inv.status}") — nothing to activate.`));
      return;
    }
    const plan = await db.subscriptionPlan.findFirst({ where: { isActive: true }, orderBy: { price: "asc" } });
    if (!plan) { console.log(bad("No active subscription plan to attach.")); return; }

    const role = await db.role.findFirst({ where: { name: "Player" } }) ?? await db.role.findFirst();
    const user = await db.user.create({ data: { name: "SlickPay Self Test", email: `slickpay-selftest-${Date.now()}@localhost.invalid`, roleId: role!.id, isActive: false } });
    const player = await db.player.create({ data: { userId: user.id, fullName: "SlickPay SelfTest", phone: "0555000000", email: user.email, address: "Algiers", status: "active" } });

    try {
      // amount is set to what the gateway actually took, so the integrity
      // check passes and this exercises the ordinary approved path.
      const payment = await db.payment.create({
        data: {
          playerId: player.id, planId: plan.id, amount: inv.amount ?? plan.price,
          status: "pending", provider: "slickpay", providerRef: invoiceId,
          providerMode: config.mode, providerStatus: "unpaid",
        },
      });
      console.log(info(`Payment ${payment.id} created as "pending" for ${payment.amount} DA.`));
      console.log(info(`Subscriptions for this player before: ${await db.subscription.count({ where: { playerId: player.id } })}`));

      const outcome = await settleSlickPayPayment(payment.id, "slickpay-webhook");
      console.log(info(`\n  settlement returned:`));
      console.log(json(outcome));

      const after = await db.payment.findUnique({ where: { id: payment.id }, include: { subscription: { include: { plan: true } } } });
      console.log(info(`\n  payment row now:`));
      console.log(json({ status: after!.status, amount: after!.amount, paidAt: after!.paidAt, providerStatus: after!.providerStatus, subscriptionId: after!.subscriptionId }));
      console.log(info(`\n  subscription now:`));
      console.log(json(after!.subscription ? { status: after!.subscription.status, plan: after!.subscription.plan.name, startDate: after!.subscription.startDate, endDate: after!.subscription.endDate } : null));

      const good = after!.status === "approved" && after!.subscription?.status === "active";
      console.log(good ? ok("Payment recorded as paid AND the account is active.") : bad("Did not fully activate — see above."));
    } finally {
      await db.notification.deleteMany({ where: { playerId: player.id } });
      await db.payment.deleteMany({ where: { playerId: player.id } });
      await db.subscription.deleteMany({ where: { playerId: player.id } });
      await db.player.delete({ where: { id: player.id } });
      await db.activityLog.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
      console.log(info("\n  (temporary test player removed)"));
    }
  }

  console.log("");
}

main().catch((e) => { console.error("\nself-test failed:", e); process.exit(1); });
