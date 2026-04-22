import { useMemo } from "react";
import { buildHomeStructuredData, serializeStructuredData } from "@/lib/seoStructuredData";

export function HomeStructuredData() {
  const entries = useMemo(() => buildHomeStructuredData(), []);

  return (
    <>
      {entries.map((entry) => (
        <script
          key={String(entry["@id"] ?? entry["@type"])}
          type="application/ld+json"
        >
          {serializeStructuredData(entry)}
        </script>
      ))}
    </>
  );
}
