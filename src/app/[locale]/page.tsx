"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Trophy, Users, Zap, Shield, Star, TrendingUp, Play, ChevronDown, Menu, X, ArrowRight } from "lucide-react";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

const ICON_MAP: Record<string, React.ElementType> = { Trophy, Users, Zap, Shield, Star, TrendingUp };

const DEFAULT_BENEFITS = [
  { icon: "Trophy", title: "Elite Coaching", desc: "UEFA-certified coaches with professional experience" },
  { icon: "Users", title: "Team Spirit", desc: "Build lasting friendships and unbreakable teamwork" },
  { icon: "Zap", title: "Modern Training", desc: "State-of-the-art facilities and innovative methods" },
  { icon: "Shield", title: "Player Safety", desc: "Full medical support and safe training environment" },
  { icon: "Star", title: "Competitive Play", desc: "Local and national tournament participation" },
  { icon: "TrendingUp", title: "Career Development", desc: "Pathways to professional football and beyond" },
];

function getEmbedUrl(url: string): string {
  if (url.includes("youtube.com/watch?v=")) {
    const id = url.split("v=")[1]?.split("&")[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1]?.split("?")[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  return url;
}

export default function LocaleHomePage() {
  const t = useTranslations();
  const { locale } = useParams<{ locale: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [navSolid, setNavSolid] = useState(false);

  useEffect(() => {
    fetch(`/api/public/landing?locale=${locale}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [locale]);

  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 80);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white font-black text-lg">FSA</span>
          </div>
          <div className="text-white text-lg animate-pulse">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  const s = data?.settings ?? {};
  const plans = data?.plans ?? [];
  const academyName = data?.academyName ?? "Foot-Ball Skills Academy";
  const currencySymbol = s.currency_symbol ?? "DZD";

  let benefits = DEFAULT_BENEFITS;
  if (s.lp_benefits) { try { benefits = JSON.parse(s.lp_benefits); } catch {} }

  return (
    <div className="min-h-screen" style={{ scrollBehavior: "smooth" } as React.CSSProperties}>

      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navSolid ? "bg-gray-900/95 backdrop-blur-sm shadow-lg" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center font-bold text-white text-xs">FSA</div>
              <span className="text-white font-semibold text-lg">{academyName}</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#about" className="text-gray-300 hover:text-white text-sm transition-colors">{t("nav.about")}</a>
              <a href="#vsl" className="text-gray-300 hover:text-white text-sm transition-colors">Video</a>
              <a href="#plans" className="text-gray-300 hover:text-white text-sm transition-colors">{t("nav.plans")}</a>
              <a href="#apply" className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">{t("nav.apply")}</a>
              <Link href="/login" className="border border-white/30 hover:border-white/60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/10">Login</Link>
              <LanguageSwitcher variant="public" />
            </div>
            <div className="md:hidden flex items-center gap-2">
              <LanguageSwitcher variant="public" />
              <button className="text-white p-1" onClick={() => setNavOpen(!navOpen)}>
                {navOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
          {navOpen && (
            <div className="md:hidden pb-4 space-y-1 border-t border-white/10 pt-3">
              <a href="#about" className="block text-gray-300 py-2 text-sm" onClick={() => setNavOpen(false)}>{t("nav.about")}</a>
              <a href="#vsl" className="block text-gray-300 py-2 text-sm" onClick={() => setNavOpen(false)}>Video</a>
              <a href="#plans" className="block text-gray-300 py-2 text-sm" onClick={() => setNavOpen(false)}>{t("nav.plans")}</a>
              <a href="#apply" className="block bg-green-600 text-white px-4 py-2 rounded-lg text-center text-sm mt-2 font-medium" onClick={() => setNavOpen(false)}>{t("nav.apply")}</a>
              <Link href="/login" className="block border border-white/30 text-white px-4 py-2 rounded-lg text-center text-sm mt-2 font-medium hover:bg-white/10" onClick={() => setNavOpen(false)}>Login</Link>
            </div>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-green-950/30 to-gray-950 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "40px 40px" } as React.CSSProperties} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-950/60" />
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto pt-16">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 bg-green-600/20 border border-green-500/30 rounded-full px-4 py-1.5 text-green-400 text-sm font-medium mb-8">
              🏆 #1 Football Academy in the Region
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight tracking-tight">
              {s.lp_hero_title ? s.lp_hero_title : <><span>Train Like a</span><br /><span className="text-green-400">Champion</span></>}
            </h1>
            <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              {s.lp_hero_subtitle || "Join Foot-Ball Skills Academy and unlock your football potential with world-class coaching"}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#apply" className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-green-900/40">
                {s.lp_hero_cta || t("hero.cta")} <ArrowRight className="w-5 h-5" />
              </a>
              <a href="#vsl" className="inline-flex items-center justify-center gap-2 border-2 border-white/30 hover:border-white/60 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:bg-white/5">
                <Play className="w-5 h-5 fill-white" /> {t("hero.secondaryCta")}
              </a>
            </div>
          </motion.div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/40" />
        </div>
      </section>

      {/* STATS */}
      <section className="bg-green-700 py-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { num: s.lp_stat_1_value || "200+", label: s.lp_stat_1_label || t("stats.playersTrained") },
              { num: s.lp_stat_2_value || "5+",   label: s.lp_stat_2_label || t("stats.yearsExperience") },
              { num: s.lp_stat_3_value || "15",   label: s.lp_stat_3_label || t("stats.expertCoaches") },
              { num: s.lp_stat_4_value || "98%",  label: s.lp_stat_4_label || t("stats.successRate") },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl md:text-4xl font-black mb-1">{stat.num}</div>
                <div className="text-green-200 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-6">{t("nav.about")}</div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                {s.lp_about_title || "Building Champions On and Off the Field"}
              </h2>
              <p className="text-gray-600 leading-relaxed mb-8 text-lg">
                {s.lp_about_text || "Foot-Ball Skills Academy was founded with a single mission: to develop complete footballers."}
              </p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-8 text-white">
              <h3 className="text-xl font-bold mb-6 text-green-400">Our Values</h3>
              <div className="space-y-3">
                {[{ label: "Excellence", color: "bg-green-500" }, { label: "Teamwork", color: "bg-blue-500" }, { label: "Discipline", color: "bg-yellow-500" }, { label: "Growth", color: "bg-purple-500" }].map((v, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${v.color}`} />
                    <span className="font-medium">{v.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VSL */}
      <section id="vsl" className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{s.lp_vsl_title || "See What We Do"}</h2>
          <div className="max-w-4xl mx-auto mt-10">
            {s.lp_vsl_url ? (
              <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl" style={{ paddingTop: "56.25%" } as React.CSSProperties}>
                <iframe src={getEmbedUrl(s.lp_vsl_url)} className="absolute inset-0 w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              </div>
            ) : (
              <div className="relative w-full rounded-2xl overflow-hidden bg-gray-800 border border-gray-700 flex items-center justify-center" style={{ minHeight: "360px" }}>
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                  </div>
                  <p className="text-gray-400 text-sm">Video coming soon</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{s.lp_benefits_title || t("benefits.title")}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b: any, i: number) => {
              const Icon = ICON_MAP[b.icon] ?? Trophy;
              return (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4"><Icon className="w-6 h-6 text-green-600" /></div>
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">{b.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section id="plans" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{s.lp_plans_title || t("plans.title")}</h2>
          </div>
          {plans.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Subscription plans coming soon.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plans.map((plan: any, i: number) => (
                <div key={plan.id} className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all hover:shadow-lg ${i === 0 ? "border-green-500 shadow-md" : "border-gray-200"}`}>
                  {i === 0 && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">Popular</span></div>}
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-black text-green-600">{currencySymbol} {plan.price.toLocaleString()}</span>
                    <span className="text-gray-400 text-sm ml-1">/ {plan.duration} {plan.durationType}</span>
                  </div>
                  <Link href="/apply" className={`mt-auto block text-center py-3 rounded-xl font-semibold transition-all ${i === 0 ? "bg-green-600 hover:bg-green-700 text-white" : "border-2 border-green-600 text-green-600 hover:bg-green-50"}`}>
                    {t("plans.applyNow")}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section id="apply" className="py-20 bg-gradient-to-br from-green-700 to-green-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{s.lp_cta_title || "Ready to Join?"}</h2>
          <p className="text-green-200 mb-10 text-lg">{s.lp_cta_subtitle || "Start your application today."}</p>
          <Link href="/apply" className="inline-flex items-center gap-2 bg-white text-green-700 hover:bg-green-50 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-xl">
            {t("cta.apply")} <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-950 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center font-bold text-white text-xs">FSA</div>
            <span className="text-white font-bold text-xl">{academyName}</span>
          </div>
          <div className="border-t border-gray-800 mt-6 pt-6">
            <p className="text-gray-600 text-sm">{s.lp_footer_text || `© ${new Date().getFullYear()} ${academyName}. ${t("footer.rights")}`}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
