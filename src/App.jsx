import { useEffect, useState } from 'react'
import AppShell from './components/AppShell.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ResourcePage from './pages/ResourcePage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import SettingsPage, { HelpPage } from './pages/SettingsPage.jsx'
import AboutLambdaPage from './pages/AboutLambdaPage.jsx'
import { SimulationProvider } from './state/SimulationContext.jsx'
import FunctionDetailsPage from './pages/FunctionDetailsPage.jsx'

const validPages = ['dashboard', 'functions', 'executions', 'analytics', 'logs', 'settings', 'help', 'about-lambda']

function readRoute() {
  const [page, functionId] = window.location.hash.slice(2).split('/')
  if (page === 'functions' && functionId) {
    try {
      return { page: 'function-detail', functionId: decodeURIComponent(functionId) }
    } catch {
      return { page: 'functions', functionId: null }
    }
  }
  return { page: validPages.includes(page) ? page : 'dashboard', functionId: null }
}

export default function App() {
  const [route, setRoute] = useState(readRoute)
  const { page: activePage, functionId } = route

  useEffect(() => {
    function syncPage() {
      setRoute(readRoute())
    }
    window.addEventListener('hashchange', syncPage)
    return () => window.removeEventListener('hashchange', syncPage)
  }, [])

  function navigate(page, id) {
    if (page === 'function-detail' && typeof id === 'string' && id) {
      window.location.hash = `/functions/${encodeURIComponent(id)}`
      setRoute({ page, functionId: id })
      return
    }
    if (!validPages.includes(page) || activePage === page) return
    window.location.hash = `/${page}`
    setRoute({ page, functionId: null })
  }

  let content
  if (activePage === 'dashboard') content = <DashboardPage onNavigate={navigate} />
  else if (activePage === 'function-detail') content = <FunctionDetailsPage key={functionId} functionId={functionId} onNavigate={navigate} />
  else if (['functions', 'executions', 'logs'].includes(activePage)) content = <ResourcePage key={activePage} page={activePage} onNavigate={navigate} />
  else if (activePage === 'analytics') content = <AnalyticsPage />
  else if (activePage === 'settings') content = <SettingsPage />
  else if (activePage === 'about-lambda') content = <AboutLambdaPage />
  else content = <HelpPage />

  return (
    <SimulationProvider>
      <AppShell activePage={activePage} onNavigate={navigate}>{content}</AppShell>
    </SimulationProvider>
  )
}
