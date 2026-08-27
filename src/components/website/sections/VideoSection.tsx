import { lf } from "./localeField";

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

export function VideoSection({ content, locale }: { content: Record<string, any>; locale: string }) {
  const heading = lf(content, "heading", locale);
  if (!content.videoUrl) return null;

  return (
    <section className="bg-fsa-navy-900 py-[var(--fsa-section-y)]">
      <div className="mx-auto px-[var(--fsa-container-pad)] text-center" style={{ maxWidth: "var(--fsa-container-max)" }}>
        {heading && <h2 className="mb-10 font-fsa-display text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl" dir="auto">{heading}</h2>}
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-fsa-lg shadow-2xl" style={{ paddingTop: "56.25%" }}>
          <iframe
            src={getEmbedUrl(content.videoUrl)}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={heading || "Video"}
          />
        </div>
      </div>
    </section>
  );
}
