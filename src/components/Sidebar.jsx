import { navigation } from '../data.js'
import { useSimulation } from '../state/SimulationContext.jsx'
import { icons } from './Icons.jsx'

export default function Sidebar({ activePage, onNavigate, isOpen, onClose }) {
  const { executions } = useSimulation()
  const selectedPage = activePage === 'function-detail' ? 'functions' : activePage
  return (
    <>
      {isOpen && <button className="sidebar-scrim" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation">
        <button className="brand" onClick={() => onNavigate('dashboard')} aria-label="LambdaLab home">
          <span className="brand-mark"><icons.Zap size={18} fill="currentColor" strokeWidth={2.2} /></span>
          <span className="brand-name">Lambda<span>Lab</span></span>
        </button>

        <div className="workspace-picker">
          <span className="workspace-avatar">S</span>
          <span className="workspace-text"><strong>Simulation Mode</strong><small>Browser-only workspace</small></span>
          <icons.ChevronDown size={15} className="muted-icon" />
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="primary-nav">
          {navigation.map(({ id, label, icon }) => {
            const Icon = icons[icon]
            return (
              <button
                key={id}
                className={`nav-item ${selectedPage === id ? 'nav-item-active' : ''}`}
                onClick={() => onNavigate(id)}
                aria-current={selectedPage === id ? 'page' : undefined}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
                {id === 'executions' && <span className="nav-count">{executions.length}</span>}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-bottom-links">
          <button className={`nav-item ${activePage === 'settings' ? 'nav-item-active' : ''}`} onClick={() => onNavigate('settings')}>
            <icons.Settings size={18} strokeWidth={1.8} /><span>Settings</span>
          </button>
          <button className={`nav-item ${activePage === 'about-lambda' ? 'nav-item-active' : ''}`} onClick={() => onNavigate('about-lambda')}>
            <icons.BookOpen size={18} strokeWidth={1.8} /><span>About Lambda</span>
          </button>
          <button className="nav-item" onClick={() => onNavigate('help')}>
            <icons.CircleHelp size={18} strokeWidth={1.8} /><span>Help & support</span>
            <icons.ArrowUpRight size={13} className="external-icon" />
          </button>
        </div>
        <div className="sidebar-footer">
          <span className="avatar avatar-user">S</span>
          <span className="user-details"><strong>Simulator User</strong><small>Local profile</small></span>
          <button className="icon-button user-menu" aria-label="Open profile menu" onClick={() => onNavigate('settings')}>
            <icons.MoreHorizontal size={19} />
          </button>
        </div>
      </aside>
    </>
  )
}
