import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getApplyOutcomeText, type ApplyOutcome } from "@/lib/apply-outcome";

/**
 * The end of the public application form: one sentence in the middle of the
 * page, written by a Super Admin, plus a way back to the site.
 *
 * Both outcomes share this component because they differ only in colour, icon
 * and which pair of settings they read — the "not eligible" page is not an
 * error state, it is the other half of the same fork.
 */
export async function ApplyOutcomeScreen({
  outcome,
  locale,
}: {
  outcome: ApplyOutcome;
  locale: string;
}) {
  const [{ title, body }, t] = await Promise.all([
    getApplyOutcomeText(outcome, locale),
    getTranslations({ locale, namespace: "apply" }),
  ]);

  const qualified = outcome === "qualified";
  const Icon = qualified ? CheckCircle2 : XCircle;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg text-center">
        <div
          className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full ${
            qualified ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
          }`}
        >
          <Icon className={`h-12 w-12 ${qualified ? "text-green-600" : "text-red-500"}`} />
        </div>
        <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {/* Authored as free text, so blank lines are the only formatting an
            editor has — each paragraph is rendered as one. */}
        <div className="space-y-3 text-gray-600 dark:text-gray-300">
          {body.split(/\n{2,}/).map((paragraph, i) => (
            <p key={i} className="whitespace-pre-line leading-relaxed">{paragraph}</p>
          ))}
        </div>
        <Link
          href={`/${locale}`}
          className="mt-10 inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700"
        >
          <ArrowLeft className="ob-flip-rtl h-4 w-4" /> {t("backToHome")}
        </Link>
      </div>
    </div>
  );
}
