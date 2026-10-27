"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { PublicAdConfig } from "@/lib/ad-tracking/config";
import { initAdProviders, setActiveAdConfig, trackAdLead, trackAdPageView } from "@/lib/ad-tracking/client";
import { LEAD_REGISTRATION_COMPLETED, type LeadRegistrationCompletedDetail } from "@/lib/ad-tracking/lead-event";

/**
 * Loads the enabled TikTok / Google Ads / Snapchat tags after hydration, sends
 * a page view on each client-side navigation, and turns the app's
 * lead-registration-completed event into one conversion per provider.
 */
export function AdTrackingClient({ config }: { config: PublicAdConfig }) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    setActiveAdConfig(config);
    initAdProviders(config);
  }, [config]);

  useEffect(() => {
    // The first path's view is sent by each provider's init.
    if (lastPath.current !== null && lastPath.current !== pathname) trackAdPageView();
    lastPath.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const onLead = (e: Event) => {
      const leadId = (e as CustomEvent<LeadRegistrationCompletedDetail>).detail?.leadId;
      if (leadId) trackAdLead(leadId);
    };
    window.addEventListener(LEAD_REGISTRATION_COMPLETED, onLead);
    return () => window.removeEventListener(LEAD_REGISTRATION_COMPLETED, onLead);
  }, []);

  return null;
}
