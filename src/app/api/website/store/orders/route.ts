import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function generateWebsiteOrderNumber(): string {
  const date = new Date();
  const d = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${d}-${seq}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const stationId = searchParams.get("stationId") ?? "";

  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ orderNumber: { contains: q } }, { customerName: { contains: q } }, { customerPhone: { contains: q } }];
  if (status) where.status = status;
  if (stationId) where.stationId = stationId;

  const [data, total] = await Promise.all([
    db.websiteOrder.findMany({
      where,
      include: { items: { include: { product: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.websiteOrder.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerName, customerPhone, customerEmail, wilaya, city, address, deliveryNotes, items, stationId } = body;

  if (!customerName || !customerPhone || !items?.length) {
    return NextResponse.json({ error: "Name, phone, and items are required" }, { status: 400 });
  }

  const shippingFeeSetting = await db.setting.findFirst({ where: { key: "store_shipping_fee" } });
  const freeThresholdSetting = await db.setting.findFirst({ where: { key: "store_free_shipping_threshold" } });
  const shippingFeeValue = parseFloat(shippingFeeSetting?.value ?? "0");
  const freeThreshold = parseFloat(freeThresholdSetting?.value ?? "0");

  let subtotal = 0;
  const orderItems: Array<{ productId: string; variantId?: string; variantInfo?: string; quantity: number; price: number }> = [];

  for (const item of items) {
    const product = await db.product.findUnique({ where: { id: item.productId } });
    if (!product) return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 404 });

    let price = Number(product.discountPrice ?? product.price);

    if (item.variantId) {
      const variant = await db.productVariant.findUnique({ where: { id: item.variantId } });
      if (variant?.price) price = Number(variant.price);
    }

    subtotal += price * item.quantity;
    orderItems.push({
      productId: item.productId,
      variantId: item.variantId ?? undefined,
      variantInfo: item.variantInfo ?? undefined,
      quantity: item.quantity,
      price,
    });
  }

  const shippingFee = (freeThreshold > 0 && subtotal >= freeThreshold) ? 0 : shippingFeeValue;
  const total = subtotal + shippingFee;

  let leadId: string | null = null;
  const existingLead = await db.lead.findFirst({ where: { phone: customerPhone } });
  const itemsSummary = orderItems.map(i => `${i.quantity}x ${i.productId}`).join(", ");
  const orderNumber = generateWebsiteOrderNumber();

  const defaultStatus = await db.leadStatus.findFirst({ where: { isDefault: true } });

  if (existingLead) {
    leadId = existingLead.id;
  } else {
    const lead = await db.lead.create({
      data: {
        fullName: customerName,
        phone: customerPhone,
        email: customerEmail ?? null,
        source: "website_store",
        stationId: stationId ?? null,
        statusId: defaultStatus?.id ?? null,
        notes: `Order ${orderNumber}: ${itemsSummary}`,
      },
    });
    leadId = lead.id;
  }

  const order = await db.websiteOrder.create({
    data: {
      orderNumber,
      stationId: stationId ?? null,
      customerName,
      customerPhone,
      customerEmail: customerEmail ?? null,
      wilaya: wilaya ?? null,
      city: city ?? null,
      address: address ?? null,
      deliveryNotes: deliveryNotes ?? null,
      subtotal,
      shippingFee,
      total,
      leadId,
      items: {
        create: orderItems.map(i => ({
          productId: i.productId,
          variantId: i.variantId ?? null,
          variantInfo: i.variantInfo ?? null,
          quantity: i.quantity,
          price: i.price,
        })),
      },
    },
    include: { items: true },
  });

  // Fire pixels
  try {
    const pixelConfigs = await db.pixelConfig.findMany({
      where: { isActive: true, ...(stationId ? { stationId } : {}) },
    });
    if (pixelConfigs.length > 0) {
      const { fireConversionEvent } = await import("@/lib/pixels");
      await fireConversionEvent(
        "Purchase",
        { phone: customerPhone, firstName: customerName },
        { value: total, currency: "DZD" },
        pixelConfigs as Parameters<typeof fireConversionEvent>[3]
      );
    }
  } catch {}

  // Notify admin
  try {
    const admins = await db.user.findMany({ where: { role: { name: "super_admin" } }, select: { id: true } });
    await Promise.all(
      admins.map(a =>
        db.notification.create({
          data: {
            userId: a.id,
            title: "New store order",
            message: `${customerName} placed order ${orderNumber} — ${total} DA`,
            type: "info",
            link: "/dashboard/store/orders",
          },
        })
      )
    );
  } catch {}

  return NextResponse.json({ order }, { status: 201 });
}
