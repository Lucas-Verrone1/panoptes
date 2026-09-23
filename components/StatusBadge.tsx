export function StatusBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral'|'success'|'warning'|'danger'|'accent'|'info' }) {
  return <span className={`status-badge ${tone}`}>{children}</span>
}
