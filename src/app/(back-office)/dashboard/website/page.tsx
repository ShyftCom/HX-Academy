"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, CalendarClock, PanelsTopLeft, UploadCloud, Inbox, ArrowRight, Users, Clock, Layers, Store, Star, Navigation, Sun, Trophy, MapPin, Users2, UserCheck, TrendingUp, HelpCircle, Newspaper, Mail, ArrowRightLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function WebsiteHubPage() {
  const { t } = useTranslation("website");
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
    { href: "/dashboard/website/pages", icon: PanelsTopLeft, title: t("common:bo.hub.pages"), desc: t("common:bo.hub.pages_desc"), color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30" },
    { href: "/dashboard/website/programmes", icon: Trophy, title: t("common:bo.hub.programmes"), desc: t("common:bo.hub.programmes_desc"), color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30" },
    { href: "/dashboard/website/schedule", icon: CalendarClock, title: t("common:bo.hub.schedules"), desc: t("common:bo.hub.schedules_desc"), color: "text-teal-600 bg-teal-50 dark:bg-teal-900/30" },
    { href: "/dashboard/website/venues", icon: MapPin, title: t("common:bo.hub.venues"), desc: t("common:bo.hub.venues_desc"), color: "text-rose-600 bg-rose-50 dark:bg-rose-900/30" },
    { href: "/dashboard/website/squads", icon: Users2, title: t("common:bo.hub.squads"), desc: t("common:bo.hub.squads_desc"), color: "text-violet-600 bg-violet-50 dark:bg-violet-900/30" },
    { href: "/dashboard/website/contact", icon: Mail, title: t("common:bo.hub.contact"), desc: t("common:bo.hub.contact_desc"), color: "text-sky-600 bg-sky-50 dark:bg-sky-900/30" },
    { href: "/dashboard/website/coaches", icon: UserCheck, title: t("common:bo.hub.coaches"), desc: t("common:bo.hub.coaches_desc"), color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" },
    { href: "/dashboard/website/pathway", icon: TrendingUp, title: t("common:bo.hub.pathway"), desc: t("common:bo.hub.pathway_desc"), color: "text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/30" },
    { href: "/dashboard/website/faqs", icon: HelpCircle, title: t("common:bo.hub.faqs"), desc: t("common:bo.hub.faqs_desc"), color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30" },
    { href: "/dashboard/website/news", icon: Newspaper, title: t("common:bo.hub.news"), desc: t("common:bo.hub.news_desc"), color: "text-lime-600 bg-lime-50 dark:bg-lime-900/30" },
    { href: "/dashboard/website/redirects", icon: ArrowRightLeft, title: t("common:bo.hub.redirects"), desc: t("common:bo.hub.redirects_desc"), color: "text-slate-600 bg-slate-50 dark:bg-slate-900/30" },
    { href: "/dashboard/website/header", icon: Navigation, title: t("common:bo.hub.header"), desc: t("common:bo.hub.header_desc"), color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" },
    { href: "/dashboard/website/footer", icon: Layers, title: t("common:bo.hub.footer"), desc: t("common:bo.hub.footer_desc"), color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30" },
    { href: "/dashboard/website/store", icon: Store, title: t("common:bo.hub.store"), desc: t("common:bo.hub.store_desc"), color: "text-orange-600 bg-orange-50 dark:bg-orange-900/30" },
    { href: "/dashboard/website/reviews", icon: Star, title: t("common:bo.hub.reviews"), desc: t("common:bo.hub.reviews_desc"), color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30" },
    { href: "/dashboard/website/summer-camp", icon: Sun, title: t("common:bo.hub.summer_camp"), desc: t("common:bo.hub.summer_camp_desc"), color: "text-orange-600 bg-orange-50 dark:bg-orange-900/30" },
    { href: "/dashboard/website/file-requirements", icon: UploadCloud, title: t("common:bo.hub.file_requirements"), desc: t("common:bo.hub.file_requirements_desc"), color: "text-teal-600 bg-teal-50 dark:bg-teal-900/30" },
    { href: "/dashboard/website/applications", icon: Inbox, title: t("common:bo.hub.applications"), desc: t("common:bo.hub.applications_desc"), color: "text-green-600 bg-green-50 dark:bg-green-900/30" },
    { href: "/dashboard/surveys", icon: Globe, title: t("common:bo.hub.surveys"), desc: t("common:bo.hub.surveys_desc"), color: "text-purple-600 bg-purple-50 dark:bg-purple-900/30" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("common:bo.hub.title")}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t("hub.subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t("common:bo.hub.total_applications"), value: stats.total, icon: Inbox, color: "text-blue-600" },
          { label: t("common:bo.hub.pending_review"), value: stats.pending, icon: Clock, color: "text-yellow-600" },
          { label: t("common:bo.hub.converted"), value: stats.converted, icon: Users, color: "text-green-600" },
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
            <p className="font-semibold text-green-800 dark:text-green-300 text-sm">{t("hub.live")}</p>
            <p className="text-green-600 dark:text-green-400 text-xs">{t("hub.live_body")}</p>
          </div>
        </div>
        <a href="/" target="_blank" className="text-xs font-semibold text-green-700 dark:text-green-300 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1">
          <Globe className="w-3 h-3" /> {t("hub.view_site")}
        </a>
      </div>
    </div>
  );
}
