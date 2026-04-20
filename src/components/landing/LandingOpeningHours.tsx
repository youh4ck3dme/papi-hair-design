const hours = [
  { day: "Pondelok", time: "08:00 – 17:00" },
  { day: "Utorok", time: "08:00 – 17:00" },
  { day: "Streda", time: "08:00 – 17:00" },
  { day: "Štvrtok", time: "08:00 – 17:00" },
  { day: "Piatok", time: "08:00 – 17:00" },
  { day: "Sobota", special: "Na objednávku" },
  { day: "Nedeľa", special: "Zatvorené", isLast: true },
];

export function LandingOpeningHours() {
  return (
    <section className="w-full rounded-[24px] border border-[#dcb773]/40 bg-gradient-to-b from-[#14110e]/85 to-[#0a0806]/95 p-6 pt-8 shadow-[0_10px_30px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(255,255,255,0.05)] backdrop-blur-xl md:p-8">
      <h3 className="mb-1 text-2xl font-bold tracking-wide text-white sm:text-3xl">
        Otváracie hodiny
      </h3>

      <div className="mb-6 mt-2 flex w-full items-center md:mb-8">
        <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.15em] text-[#dcb773]">
          Aktuálna dostupnosť
        </span>
        <div className="ml-4 h-[1px] flex-grow bg-[#dcb773]/30" />
      </div>

      <div className="flex flex-col text-sm">
        {hours.map((row) => (
          <div
            key={row.day}
            className={`-mx-2 flex cursor-default items-center justify-between rounded-lg px-2 py-3.5 transition-colors hover:bg-[#dcb773]/[0.04] md:-mx-3 md:px-3 ${
              !row.isLast ? "border-b border-[#dcb773]/15" : ""
            }`}
          >
            <span className="w-1/2 text-left text-[14px] font-bold uppercase tracking-widest text-[#e6dfd3] sm:text-[15px]">
              {row.day}
            </span>
            {row.special ? (
              <span className="w-1/2 text-right font-serif text-[16px] italic tracking-widest text-[#dcb773] drop-shadow-sm sm:text-[17px]">
                {row.special}
              </span>
            ) : (
              <span className="w-1/2 text-right text-[16px] font-semibold tracking-wide text-[#d6d0c4] sm:text-[17px]">
                {row.time}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
