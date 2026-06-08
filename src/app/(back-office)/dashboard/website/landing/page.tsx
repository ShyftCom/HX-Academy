"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Globe } from "lucide-react";

const FIELDS: { key: string; label: string; type?: "textarea" | "text" | "url"; placeholder?: string }[] = [
  { key: "lp_hero_headline", label: "Hero Headline", type: "textarea", placeholder: "Join the Next Generation of Football Stars" },
  { key: "lp_hero_subheadline", label: "Hero Sub-headline", type: "textarea", placeholder: "Professional training programs designed to develop elite players" },
  { key: "lp_hero_cta", label: "Hero CTA Button Text", placeholder: "Apply Now" },
  { key: "lp_hero_secondary_cta", label: "Hero Secondary CTA", placeholder: "Learn More" },
  { key: "lp_about_title", label: "About Title", placeholder: "About Our Academy" },
  { key: "lp_about_text", label: "About Text", type: "textarea", placeholder: "We are dedicated to developing..." },
  { key: "lp_about_badge", label: "About Badge Text", placeholder: "Est. 2010" },
  { key: "lp_vsl_url", label: "Video URL (YouTube)", type: "url", placeholder: "https://youtube.com/watch?v=..." },
  { key: "lp_vsl_title", label: "Video Section Title", placeholder: "See How We Train Champions" },
  { key: "lp_benefits_title", label: "Benefits Section Title", placeholder: "Why Choose Us" },
  { key: "lp_benefit_1_title", label: "Benefit 1 Title", placeholder: "Expert Coaches" },
  { key: "lp_benefit_1_text", label: "Benefit 1 Text", type: "textarea", placeholder: "Our coaches have international experience..." },
  { key: "lp_benefit_2_title", label: "Benefit 2 Title", placeholder: "Modern Facilities" },
  { key: "lp_benefit_2_text", label: "Benefit 2 Text", type: "textarea", placeholder: "State of the art training grounds..." },
  { key: "lp_benefit_3_title", label: "Benefit 3 Title", placeholder: "Proven Results" },
  { key: "lp_benefit_3_text", label: "Benefit 3 Text", type: "textarea", placeholder: "100+ players signed to professional clubs..." },
  { key: "lp_benefit_4_title", label: "Benefit 4 Title", placeholder: "Youth Development" },
  { key: "lp_benefit_4_text", label: "Benefit 4 Text", type: "textarea", placeholder: "Specialized programs for all age groups..." },
  { key: "lp_benefit_5_title", label: "Benefit 5 Title", placeholder: "Mental Coaching" },
  { key: "lp_benefit_5_text", label: "Benefit 5 Text", type: "textarea", placeholder: "Develop the mental strength of a champion..." },
  { key: "lp_benefit_6_title", label: "Benefit 6 Title", placeholder: "Community" },
  { key: "lp_benefit_6_text", label: "Benefit 6 Text", type: "textarea", placeholder: "Join a family of passionate footballers..." },
  { key: "lp_plans_title", label: "Plans Section Title", placeholder: "Choose Your Path" },
  { key: "lp_cta_title", label: "Apply CTA Title", placeholder: "Ready to Start?" },
  { key: "lp_cta_subtitle", label: "Apply CTA Subtitle", type: "textarea", placeholder: "Join hundreds of players who've taken the first step..." },
  { key: "lp_stat_1_value", label: "Stat 1 Value", placeholder: "500+" },
  { key: "lp_stat_1_label", label: "Stat 1 Label", placeholder: "Players Trained" },
  { key: "lp_stat_2_value", label: "Stat 2 Value", placeholder: "15+" },
  { key: "lp_stat_2_label", label: "Stat 2 Label", placeholder: "Years Experience" },
  { key: "lp_stat_3_value", label: "Stat 3 Value", placeholder: "30+" },
  { key: "lp_stat_3_label", label: "Stat 3 Label", placeholder: "Expert Coaches" },
  { key: "lp_stat_4_value", label: "Stat 4 Value", placeholder: "95%" },
  { key: "lp_stat_4_label", label: "Stat 4 Label", placeholder: "Success Rate" },
  { key: "lp_footer_tagline", label: "Footer Tagline", placeholder: "Developing Champions On and Off the Field" },
  { key: "lp_contact_phone", label: "Contact Phone", placeholder: "+213 000 000 000" },
  { key: "lp_contact_email", label: "Contact Email", placeholder: "contact@hxacademy.com" },
  { key: "lp_contact_address", label: "Contact Address", placeholder: "Algiers, Algeria" },
  { key: "academy_name", label: "Academy Name", placeholder: "HX Academy" },
  { key: "currency_symbol", label: "Currency Symbol", placeholder: "DZD" },
];

const GROUPS = [
  { label: "Hero Section", keys: ["lp_hero_headline", "lp_hero_subheadline", "lp_hero_cta", "lp_hero_secondary_cta"] },
  { label: "Stats Bar", keys: ["lp_stat_1_value", "lp_stat_1_label", "lp_stat_2_value", "lp_stat_2_label", "lp_stat_3_value", "lp_stat_3_label", "lp_stat_4_value", "lp_stat_4_label"] },
  { label: "About Section", keys: ["lp_about_title", "lp_about_text", "lp_about_badge"] },
  { label: "Video Section", keys: ["lp_vsl_title", "lp_vsl_url"] },
  { label: "Benefits Section", keys: ["lp_benefits_title", "lp_benefit_1_title", "lp_benefit_1_text", "lp_benefit_2_title", "lp_benefit_2_text", "lp_benefit_3_title", "lp_benefit_3_text", "lp_benefit_4_title", "lp_benefit_4_text", "lp_benefit_5_title", "lp_benefit_5_text", "lp_benefit_6_title", "lp_benefit_6_text"] },
  { label: "Plans Section", keys: ["lp_plans_title"] },
  { label: "Apply CTA Section", keys: ["lp_cta_title", "lp_cta_subtitle"] },
  { label: "Footer & Contact", keys: ["lp_footer_tagline", "lp_contact_phone", "lp_contact_email", "lp_contact_address"] },
  { label: "General", keys: ["academy_name", "currency_symbol"] },
];

export default function LandingPageEditor() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/website-settings")
      .then((r) => r.json())
      .then((d) => { setValues(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/website-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      if (res.ok) toast.success("Landing page saved");
      else toast.error("Save failed");
    } catch { toast.error("Save failed"); }
    setSaving(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Landing Page</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">Edit the content shown on your public website.</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" target="_blank" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Globe className="w-4 h-4" /> Preview
          </a>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </div>

      {GROUPS.map((group) => (
        <div key={group.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{group.label}</h2>
          </div>
          <div className="p-5 space-y-4">
            {group.keys.map((key) => {
              const field = FIELDS.find((f) => f.key === key);
              if (!field) return null;
              return (
                <div key={key}>
                  <label className={labelClass}>{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea rows={3} className={inputClass} value={values[key] ?? ""} onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))} placeholder={field.placeholder} />
                  ) : (
                    <input type={field.type === "url" ? "url" : "text"} className={inputClass} value={values[key] ?? ""} onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))} placeholder={field.placeholder} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex justify-end pb-8">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
        </button>
      </div>
    </div>
  );
}
