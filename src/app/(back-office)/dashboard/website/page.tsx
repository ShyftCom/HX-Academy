"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, PanelsTopLeft, UploadCloud, Inbox, ArrowRight, Users, Clock } from "lucide-react";

export default function WebsiteHubPage() {
  const [stats, setStats] = useState({ total: 0, pending: 0, converted: 0 });

  useEffect(() => {
    Promise.all([
      fetch("/api/applications?perPage=1").then((r) => r.json()),
      fetch("/api/applications?perPage=1&converted=false").then((r) => r.json()),
    ]).then(([all, open]) => {
      setStats({ total: all.total ?? 0, pending: open.total ?? 0, converted: (all.total ?? 0) - (open.total ?? 0) });
    }).catch(() => {});
  }, []);

  const cards = [
    { href: "/dashboard/website/landing", icon: PanelsTopLeft, title: "Landing Page", desc: "Edit hero text, about section, benefits, VSL video URL, and footer content.", color: "text-blue-600 bg-blue-50" },
    { href: "/dashboard/website/file-requirements", icon: UploadCloud, title: "File Requirements", desc: "Manage documents applicants must upload (ID, birth certificate, photo, etc.).", color: "text-yellow-600 bg-yellow-50" },
    { href: "/dashboard/website/applications", icon: Inbox, title: "Applications", desc: "View, filter, and manage all applications submitted through the public website.", color: "text-green-600 bg-green-50" },
    { href: "/dashboard/surveys", icon: Globe, title: "Survey Builder", desc: "Build the questionnaire shown to applicants during the application process.", color: "text-purple-600 bg-purple-50" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Website &amp; Applications</h1>
        <p className="text-gray-500 mt-1">Manage your public website and incoming applications from one place.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Applications", value: stats.total, icon: Inbox, color: "text-blue-600" },
          { label: "Pending Review", value: stats.pending, icon: Clock, color: "text-yellow-600" },
          { label: "Converted", value: stats.converted, icon: Users, color: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`${s.color} bg-gray-50 rounded-lg p-3`}><s.icon className="w-5 h-5" /></div>
            <div><div className="text-2xl font-bold text-gray-900">{s.value}</div><div className="text-xs text-gray-500">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all group">
            <div className="flex items-start gap-4">
              <div className={`${c.color} rounded-lg p-3 flex-shrink-0`}><c.icon className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors flex items-center gap-1">{c.title} <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" /></h3>
                <p className="text-sm text-gray-500 mt-1">{c.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Public link */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <div>
            <p className="font-semibold text-green-800 text-sm">Your landing page is live</p>
            <p className="text-green-600 text-xs">Visit your website to see how it looks to visitors.</p>
          </div>
        </div>
        <a href="/" target="_blank" className="text-xs font-semibold text-green-700 bg-white border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors flex items-center gap-1">
          <Globe className="w-3 h-3" /> View Site
        </a>
      </div>
    </div>
  );
}
