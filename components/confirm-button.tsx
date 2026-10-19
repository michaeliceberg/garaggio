'use client'

// Кнопка отправки формы с подтверждением (для удаления).
export function ConfirmButton({ message, className, children }: { message: string; className?: string; children: React.ReactNode }) {
    return <button className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault() }}>{children}</button>
}
