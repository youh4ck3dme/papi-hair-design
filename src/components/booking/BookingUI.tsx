export function GoldText({ children, className = "" }: Readonly<{ children: React.ReactNode; className?: string }>) {
    return <span className={`text-primary ${className}`}>{children}</span>;
}

export function StepHeader({ num, title, extra }: Readonly<{ num: string; title: string; extra?: React.ReactNode }>) {
    return (
        <div className="mt-8 mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
                <div className="relative flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground shadow-md shadow-primary/30 dark:text-background">
                        {num}
                    </div>
                    {/* Subtle glow ring */}
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-sm -z-10" />
                </div>
                <h2 className="text-lg font-semibold leading-tight tracking-wide text-foreground sm:text-[19px]">{title}</h2>
            </div>
            {extra == null ? null : <div className="w-full sm:w-auto">{extra}</div>}
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
