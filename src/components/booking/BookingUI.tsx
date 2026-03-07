export function GoldText({ children, className = "" }: Readonly<{ children: React.ReactNode; className?: string }>) {
    return <span className={`text-primary ${className}`}>{children}</span>;
}

export function StepHeader({ num, title, extra }: Readonly<{ num: string; title: string; extra?: React.ReactNode }>) {
    return (
        <div className="flex items-center justify-between mt-8 mb-5">
            <div className="flex items-center gap-3.5">
                <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-primary text-primary-foreground dark:text-background shadow-md shadow-primary/30">
                        {num}
                    </div>
                    {/* Subtle glow ring */}
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-sm -z-10" />
                </div>
                <h2 className="text-[17px] font-semibold tracking-wide text-foreground">{title}</h2>
            </div>
            {extra == null ? null : <div>{extra}</div>}
        </div>
    );
}

export function RadioIcon({ selected }: Readonly<{ selected: boolean }>) {
    return (
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${selected ? "border-primary scale-110" : "border-muted-foreground/40"}`}>
            <div className={`rounded-full bg-primary transition-all duration-200 ${selected ? "w-2.5 h-2.5 scale-100" : "w-0 h-0 scale-0"}`} />
        </div>
    );
}
