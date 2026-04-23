export const PLATFORM_VERTICAL_KEYS = [
  "treatments",
  "allTreatments",
  "hairStyling",
  "nails",
  "hairRemoval",
  "browsLashes",
  "faceSkinCare",
  "massage",
  "makeup",
  "aesthetics",
  "barbershop",
  "spaWellness",
  "bodySkin",
  "tattooPiercing",
  "holisticHealth",
  "dentalCare",
  "medical",
  "pets",
  "fitness",
  "physiotherapy",
  "counsellingTherapy",
  "other",
] as const;

export type PlatformVerticalKey = (typeof PLATFORM_VERTICAL_KEYS)[number];

export const PLATFORM_VERTICAL_GROUPS = [
  {
    id: "beauty",
    verticals: [
      "treatments",
      "allTreatments",
      "hairStyling",
      "nails",
      "hairRemoval",
      "browsLashes",
      "faceSkinCare",
      "makeup",
      "aesthetics",
      "barbershop",
      "bodySkin",
    ],
  },
  {
    id: "wellness",
    verticals: ["massage", "spaWellness", "holisticHealth"],
  },
  {
    id: "health",
    verticals: ["dentalCare", "medical", "physiotherapy"],
  },
  {
    id: "lifestyle",
    verticals: ["tattooPiercing", "pets", "fitness", "counsellingTherapy", "other"],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  verticals: ReadonlyArray<PlatformVerticalKey>;
}>;

export const PLATFORM_VERTICAL_COUNT = PLATFORM_VERTICAL_KEYS.length;
