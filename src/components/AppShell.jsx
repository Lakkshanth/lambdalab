import { cloneElement, useState } from 'react'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import Toast from './Toast.jsx'
import { useSimulation } from '../state/SimulationContext.jsx'
import { icons } from './Icons.jsx'

export default function AppShell({ activePage, onNavigate, children }) {
  const { storageIssue, demoDataLoaded } = useSimulation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (message) => {
    setToast(message)
    window.clearTimeout(showToast.timeout)
    showToast.timeout = window.setTimeout(() => setToast(''), 3200)
  }

  function navigate(page) {
    onNavigate(page)
    setSidebarOpen(false)
  }

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={navigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-area">
        <Topbar activePage={activePage} onMenu={() => setSidebarOpen(true)} onToast={showToast} />
        <main className="page-content">
          {storageIssue && <div className="storage-issue-banner" role="alert"><icons.CircleHelp size={17} /><span>{storageIssue} Avoid saving passwords, API keys, or other sensitive information in function code or test events.</span></div>}
          {demoDataLoaded && <div className="demo-data-banner" role="status"><icons.Database size={15} /><span><strong>DEMO DATA</strong> This workspace includes sample functions and simulated execution records. New invocations are added alongside the samples.</span></div>}
          {cloneElement(children, { onToast: showToast })}
        </main>
      </div>
      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  )
}
