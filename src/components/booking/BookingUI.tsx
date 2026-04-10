export function GoldText({ children, className = "" }: Readonly<{ children: React.ReactNode; className?: string }>) {
    return <span className={`text-primary ${className}`}>{children}</span>;
}

export function StepHeader({ num, title, extra }: Readonly<{ num: string; title: string; extra?: React.ReactNode }>) {
    return (
        <div className="mt-8 mb-5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3.5">
                <div className="relative flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C9A84C] text-base font-black text-black shadow-[0_0_16px_rgba(201,168,76,0.5)]">
                        {num}
                    </div>
                    <div className="absolute inset-0 rounded-full bg-[#C9A84C]/30 blur-md -z-10" />
                </div>
                <h2 className="truncate text-base font-black uppercase tracking-widest text-foreground">{title}</h2>
            </div>
            {extra == null ? null : <div className="flex-shrink-0">{extra}</div>}
        </div>
    );
}

export function RadioIcon({ selected }: Readonly<{ selected: boolean }>) {
    return (
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${selected ? "border-[#C9A84C] scale-110 shadow-[0_0_8px_rgba(201,168,76,0.6)]" : "border-muted-foreground/40"}`}>
            <div className={`rounded-full bg-[#C9A84C] transition-all duration-200 ${selected ? "w-2.5 h-2.5 scale-100" : "w-0 h-0 scale-0"}`} />
        </div>
    );
}
