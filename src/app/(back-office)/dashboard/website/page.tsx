"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, PanelsTopLeft, UploadCloud, Inbox, ArrowRight, Users, Clock, Layers, Store, Star, Navigation, Sun } from "lucide-react";

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
    { href: "/dashboard/website/landing", icon: PanelsTopLeft, title: "Landing Page", desc: "Edit hero text, about section, benefits, VSL video URL, and footer content.", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30" },
    { href: "/dashboard/website/header", icon: Navigation, title: "Header Editor", desc: "Configure navigation, logo, CTA button, and mobile menu.", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" },
    { href: "/dashboard/website/footer", icon: Layers, title: "Footer Editor", desc: "Customize footer links, social icons, colors, and copyright text.", color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30" },
    { href: "/dashboard/website/store", icon: Store, title: "Store Settings", desc: "Enable the product store, configure shipping fees and page content.", color: "text-orange-600 bg-orange-50 dark:bg-orange-900/30" },
    { href: "/dashboard/website/reviews", icon: Star, title: "Reviews", desc: "Moderate customer reviews, reply to feedback, and feature top reviews.", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30" },
    { href: "/dashboard/website/summer-camp", icon: Sun, title: "Summer Camp Page", desc: "Configure the Summer Camp landing page title, hero image, description, and CTA button.", color: "text-orange-600 bg-orange-50 dark:bg-orange-900/30" },
    { href: "/dashboard/website/file-requirements", icon: UploadCloud, title: "File Requirements", desc: "Manage documents applicants must upload (ID, birth certificate, photo, etc.).", color: "text-teal-600 bg-teal-50 dark:bg-teal-900/30" },
    { href: "/dashboard/website/applications", icon: Inbox, title: "Applications", desc: "View, filter, and manage all applications submitted through the public website.", color: "text-green-600 bg-green-50 dark:bg-green-900/30" },
    { href: "/dashboard/surveys", icon: Globe, title: "Survey Builder", desc: "Build the questionnaire shown to applicants during the application process.", color: "text-purple-600 bg-purple-50 dark:bg-purple-900/30" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Website &amp; Applications</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your public website and incoming applications from one place.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Applications", value: stats.total, icon: Inbox, color: "text-blue-600" },
          { label: "Pending Review", value: stats.pending, icon: Clock, color: "text-yellow-600" },
          { label: "Converted", value: stats.converted, icon: Users, color: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
            <div className={`${s.color} bg-gray-50 dark:bg-gray-700 rounded-lg p-3`}><s.icon className="w-5 h-5" /></div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all group">
            <div className="flex items-start gap-4">
              <div className={`${c.color} rounded-lg p-3 flex-shrink-0`}><c.icon className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors flex items-center gap-1">
                  {c.title} <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{c.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Public link */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-300 text-sm">Your landing page is live</p>
            <p className="text-green-600 dark:text-green-400 text-xs">Visit your website to see how it looks to visitors.</p>
          </div>
        </div>
        <a href="/" target="_blank" className="text-xs font-semibold text-green-700 dark:text-green-300 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1">
          <Globe className="w-3 h-3" /> View Site
        </a>
      </div>
    </div>
  );
}
