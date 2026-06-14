"use client";

import { I18nProvider } from "@/components/providers/i18n-provider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 p-4">
        {children}
      </div>
    </I18nProvider>
  );
}
