import { icons } from './Icons.jsx'

const stateCopy = {
  loading: { icon: 'Activity', title: 'Loading workspace', detail: 'Fetching your latest simulator data…' },
  error: { icon: 'CircleHelp', title: 'Something went wrong', detail: 'We couldn’t load this view. Please try again.' },
  empty: { icon: 'FileCode2', title: 'Nothing here yet', detail: 'Items will appear here once they are available.' },
}

export default function StatePanel({ state = 'empty', title, detail, action }) {
  const copy = stateCopy[state]
  const Icon = icons[copy.icon]
  return (
    <div className={`state-panel state-${state}`} role={state === 'error' ? 'alert' : 'status'}>
      <div className="state-icon"><Icon size={20} /></div>
      <h3>{title ?? copy.title}</h3>
      <p>{detail ?? copy.detail}</p>
      {action}
    </div>
  )
}
