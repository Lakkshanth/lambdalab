import { icons } from './Icons.jsx'

export default function Toast({ message, onClose }) {
  if (!message) return null
  const Check = icons.Check
  const X = icons.X

  return (
    <div className="toast" role="status">
      <span className="toast-icon"><Check size={15} /></span>
      <span>{message}</span>
      <button className="icon-button toast-close" onClick={onClose} aria-label="Dismiss notification">
        <X size={15} />
      </button>
    </div>
  )
}
