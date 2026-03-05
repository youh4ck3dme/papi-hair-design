export function GoldText({ children, className = "" }: Readonly<{ children: React.ReactNode; className?: string }>) {
    return <span className={`text-primary ${className}`}>{children}</span>;
}

export function StepHeader({ num, title, extra }: Readonly<{ num: string; title: string; extra?: React.ReactNode }>) {
    return (
        <div className="flex items-center justify-between mt-8 mb-4">
            <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-primary text-primary-foreground dark:text-background">
                    {num}
                </div>
                <h2 className="text-xl font-medium tracking-wide text-foreground">{title}</h2>
            </div>
            {extra == null ? null : <div>{extra}</div>}
        </div>
    );
}

export function RadioIcon({ selected }: Readonly<{ selected: boolean }>) {
    const borderClass = selected ? "border-primary" : "border-muted-foreground/40";
    return (
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${borderClass}`}>
            {selected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
        </div>
    );
}
