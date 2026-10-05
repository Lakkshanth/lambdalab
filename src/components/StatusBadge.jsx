export default function StatusBadge({ children, tone }) {
  const statusTone =
    tone ??
    (children === 'Success' || children === 'SUCCESS' || children === 'Active'
      ? 'success'
      : children === 'Failed' || children === 'ERROR'
        ? 'danger'
        : children === 'Inactive'
          ? 'neutral'
          : 'info')

  return (
    <span className={`status-badge status-${statusTone}`}>
      <span className="status-dot" />
      {children}
    </span>
  )
}
