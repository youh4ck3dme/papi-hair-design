const PUBLIC_AMBIENT_IMAGE =
  "url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80')";

export function PublicAtmosphereBackground() {
  return (
    <>
      <div
        className="animate-ken-burns fixed inset-0 z-0 origin-center bg-cover bg-center"
        style={{ backgroundImage: PUBLIC_AMBIENT_IMAGE }}
        aria-hidden="true"
      />

      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.80), rgba(24,18,12,0.80), rgba(0,0,0,0.90))",
          backdropFilter: "blur(8px)",
        }}
        aria-hidden="true"
      />
    </>
  );
}
