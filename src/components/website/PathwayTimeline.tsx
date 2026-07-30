import * as Icons from "lucide-react";
import { Flag } from "lucide-react";
import { lf } from "./sections/localeField";

export interface PathwayLevelData {
  id: string;
  name: string;
  nameFr?: string | null;
  nameAr?: string | null;
  ageRangeLabel?: string | null;
  ageRangeLabelFr?: string | null;
  ageRangeLabelAr?: string | null;
  color: string;
  icon?: string | null;
  description?: string | null;
  descriptionFr?: string | null;
  descriptionAr?: string | null;
}

export function PathwayTimeline({ levels, locale }: { levels: PathwayLevelData[]; locale: string }) {
  if (levels.length === 0) return null;

  return (
    <div className="relative">
      {/* Connecting line */}
      <div className="absolute start-6 top-6 hidden h-[calc(100%-3rem)] w-0.5 bg-fsa-border md:block lg:start-0 lg:top-6 lg:h-0.5 lg:w-full" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4 lg:gap-6">
        {levels.map((level, i) => {
          const Icon = (level.icon && (Icons as any)[level.icon]) || Flag;
          return (
            <div key={level.id} className="relative flex gap-4 lg:flex-col lg:gap-0 lg:text-center">
              <div
                className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-md lg:mx-auto"
                style={{ backgroundColor: level.color }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 lg:mt-5">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: level.color }}>
                  Stage {i + 1}
                </span>
                <h3 className="mt-0.5 font-fsa-display text-xl font-bold uppercase text-fsa-navy-900">{lf(level as unknown as Record<string, unknown>, "name", locale)}</h3>
                {level.ageRangeLabel && <p className="text-sm font-semibold text-fsa-text-muted">{lf(level as unknown as Record<string, unknown>, "ageRangeLabel", locale)}</p>}
                {level.description && <p className="mt-2 text-sm leading-relaxed text-fsa-text-muted">{lf(level as unknown as Record<string, unknown>, "description", locale)}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
