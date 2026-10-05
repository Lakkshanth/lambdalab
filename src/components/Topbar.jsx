import { icons } from './Icons.jsx'

const pageLabels = {
  dashboard: 'Dashboard',
  functions: 'Functions',
  'function-detail': 'Function details',
  executions: 'Executions',
  analytics: 'Analytics',
  logs: 'Logs',
  settings: 'Settings',
  help: 'Help & support',
  'about-lambda': 'About Lambda',
}

export default function Topbar({ activePage, onMenu, onToast }) {
  return (
    <header className="topbar">
      <button className="icon-button mobile-menu" onClick={onMenu} aria-label="Open navigation">
        <icons.Menu size={20} />
      </button>
      <div className="breadcrumbs">
        <span>Workspace</span><icons.ChevronRight size={14} /><strong>{pageLabels[activePage] ?? 'Dashboard'}</strong>
      </div>
      <div className="topbar-actions">
        <label className="search-field">
          <icons.Search size={16} />
          <input type="search" placeholder="Search anything..." aria-label="Search workspace" />
          <kbd><icons.Command size={11} /> K</kbd>
        </label>
        <span className="topbar-divider" />
        <button className="icon-button notification-button" aria-label="Notifications" onClick={() => onToast('You’re all caught up')}>
          <icons.Bell size={18} /><span className="notification-dot" />
        </button>
        <button className="topbar-avatar" aria-label="Simulator user profile" onClick={() => onToast('Profile settings are not available in this simulator')}>S</button>
      </div>
    </header>
  )
}
