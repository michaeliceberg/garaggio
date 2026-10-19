// Блок формы: цветная полоска слева + иконка и заголовок — сразу видно, где какая часть формы.
export function Section({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
    return (
        <section className="card flex flex-col gap-3 overflow-hidden p-4" style={{ boxShadow: `inset 4px 0 0 ${color}` }}>
            <div className="flex items-center gap-2 font-black" style={{ color }}>{icon}<span>{title}</span></div>
            {children}
        </section>
    )
}
