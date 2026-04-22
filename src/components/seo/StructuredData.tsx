import { buildHomeStructuredData, serializeStructuredData } from "@/lib/seoStructuredData";

export function HomeStructuredData() {
  const entries = buildHomeStructuredData();

  return (
    <>
      {entries.map((entry) => (
        <script
          key={String(entry["@id"] ?? entry["@type"])}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeStructuredData(entry) }}
        />
      ))}
    </>
  );
}

