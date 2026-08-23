import Image from "next/image";
import { lf } from "./localeField";

export function GallerySection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const heading = lf(content, "heading", locale);
  const images: any[] = Array.isArray(content.images) ? content.images : [];
  if (images.length === 0) return null;

  return (
    <section className="bg-white py-[var(--fsa-section-y)]">
      <div className="mx-auto px-[var(--fsa-container-pad)]" style={{ maxWidth: "var(--fsa-container-max)" }}>
        {heading && <h2 className="mb-10 font-fsa-display text-3xl font-bold uppercase tracking-tight text-fsa-navy-900 sm:text-4xl" dir="auto">{heading}</h2>}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <figure key={i} className="group relative aspect-square overflow-hidden rounded-fsa-md bg-fsa-pale-bg">
              <Image
                src={img.url}
                alt={lf(img, "caption", locale) || ""}
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {img.caption && (
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {lf(img, "caption", locale)}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
