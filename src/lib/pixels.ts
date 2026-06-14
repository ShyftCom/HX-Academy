import crypto from "crypto";

export function hashSHA256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

type PixelPlatform = "facebook" | "tiktok" | "google" | "snapchat";

interface PixelConfig {
  platform: PixelPlatform;
  pixelId: string;
  accessToken?: string;
  useConversionApi: boolean;
  testEventCode?: string;
}

interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

interface EventData {
  value?: number;
  currency?: string;
  contentName?: string;
  clientId?: string;
}

export async function fireConversionEvent(
  eventName: string,
  userData: UserData,
  eventData: EventData,
  configs: PixelConfig[]
): Promise<void> {
  const activeConfigs = configs.filter((c) => c.useConversionApi && c.pixelId);
  await Promise.allSettled(
    activeConfigs.map((config) => {
      if (config.platform === "facebook") return sendFBEvent(eventName, userData, eventData, config);
      if (config.platform === "tiktok") return sendTikTokEvent(eventName, userData, config);
      if (config.platform === "google") return sendGoogleEvent(eventName, eventData, config);
      return Promise.resolve();
    })
  );
}

async function sendFBEvent(
  eventName: string,
  userData: UserData,
  eventData: EventData,
  config: PixelConfig
) {
  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        user_data: {
          ...(userData.email && { em: hashSHA256(userData.email) }),
          ...(userData.phone && { ph: hashSHA256(userData.phone) }),
          ...(userData.firstName && { fn: hashSHA256(userData.firstName) }),
          ...(userData.lastName && { ln: hashSHA256(userData.lastName) }),
        },
        custom_data: { value: eventData.value, currency: eventData.currency ?? "DZD" },
        ...(config.testEventCode && { test_event_code: config.testEventCode }),
      },
    ],
    access_token: config.accessToken,
  };
  await fetch(`https://graph.facebook.com/v19.0/${config.pixelId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function sendTikTokEvent(eventName: string, userData: UserData, config: PixelConfig) {
  await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
    method: "POST",
    headers: {
      "Access-Token": config.accessToken ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pixel_code: config.pixelId,
      event: eventName,
      timestamp: new Date().toISOString(),
      context: {
        user: {
          ...(userData.email && { email: hashSHA256(userData.email) }),
          ...(userData.phone && { phone_number: hashSHA256(userData.phone) }),
        },
      },
      properties: {},
    }),
  });
}

async function sendGoogleEvent(eventName: string, eventData: EventData, config: PixelConfig) {
  await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${config.pixelId}&api_secret=${config.accessToken}`,
    {
      method: "POST",
      body: JSON.stringify({
        client_id: eventData.clientId ?? "server",
        events: [{ name: eventName, params: { value: eventData.value, currency: "DZD" } }],
      }),
    }
  );
}
