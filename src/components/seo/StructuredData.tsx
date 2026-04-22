import { useEffect, useMemo } from "react";
import { buildHomeStructuredData, serializeStructuredData } from "@/lib/seoStructuredData";

export function HomeStructuredData() {
  const entries = useMemo(() => buildHomeStructuredData(), []);

  useEffect(() => {
    const scripts = entries.map((entry) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.structuredDataId = String(entry["@id"] ?? entry["@type"]);
      script.text = serializeStructuredData(entry);
      document.head.appendChild(script);
      return script;
    });

    return () => {
      scripts.forEach((script) => script.remove());
    };
  }, [entries]);

  return null;
}
