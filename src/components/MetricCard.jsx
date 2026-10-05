import { icons } from './Icons.jsx'

export default function MetricCard({ label, value, delta, icon, trend = 'up', caption, tone }) {
  const Icon = icons[icon]
  const TrendIcon = trend === 'down' ? icons.ArrowDownRight : icons.ArrowUpRight
  return (
    <article className={`metric-card ${tone ? `metric-${tone}` : ''}`}>
      <div className="metric-card-top">
        <span className="metric-label">{label}</span>
        <span className="metric-icon">{Icon && <Icon size={17} strokeWidth={1.8} />}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">
        {delta && <span className={`metric-delta ${trend === 'down' ? 'delta-neutral' : ''}`}><TrendIcon size={13} />{delta}</span>}
        <span>{caption}</span>
      </div>
    </article>
  )
}
