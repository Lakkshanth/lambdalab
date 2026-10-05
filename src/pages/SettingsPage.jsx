import { useEffect, useRef, useState } from 'react'
import { icons } from '../components/Icons.jsx'
import { runtimeOptions } from '../data.js'
import { isValidImportedSimulationState } from '../storage/simulationStorage.js'
import { useSimulation } from '../state/SimulationContext.jsx'

const executionDelayOptions = [
  { value: 35, label: '35 ms · Fast' },
  { value: 55, label: '55 ms · Default' },
  { value: 80, label: '80 ms · Moderate' },
  { value: 100, label: '100 ms · Slow' },
  { value: 120, label: '120 ms · Maximum' },
]

const appVersion = '0.1.0'

export default function SettingsPage({ onToast }) {
  const {
    functions,
    testEvents,
    executions,
    logs,
    schemaVersion,
    settings,
    resetSimulationData,
    loadDemoData,
    updateSettings,
    replaceSimulationData,
    demoDataLoaded,
    storageIssue,
  } = useSimulation()
  const [confirmReset, setConfirmReset] = useState(false)
  const [pendingImport, setPendingImport] = useState(null)
  const [settingsError, setSettingsError] = useState('')
  const [importError, setImportError] = useState('')
  const fileInput = useRef(null)
  const workspaceIsEmpty = functions.length + testEvents.length + executions.length + logs.length === 0

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setConfirmReset(false)
        setPendingImport(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function changeSetting(update) {
    try {
      updateSettings(update)
      setSettingsError('')
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'The setting could not be saved.')
    }
  }

  function handleReset() {
    try {
      resetSimulationData()
      setConfirmReset(false)
      setSettingsError('')
      onToast?.('Local simulator data reset')
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Simulator data could not be reset.')
    }
  }

  function handleLoadDemoData() {
    try {
      loadDemoData()
      setSettingsError('')
      onToast?.('Demo dataset loaded')
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Demo data could not be loaded.')
    }
  }

  function exportApplicationData() {
    try {
      const exportData = {
        schemaVersion,
        functions,
        testEvents,
        executions,
        logs,
        demoDataLoaded,
        settings,
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'lambdalab-simulation-data.json'
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      onToast?.('Application data exported')
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Application data could not be exported.')
    }
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImportError('')
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('The selected file is larger than the 10 MB import limit.')
      const parsed = JSON.parse(await file.text())
      if (!isValidImportedSimulationState(parsed)) {
        throw new Error('This file is not a valid LambdaLab application data export.')
      }
      setPendingImport({ data: parsed, fileName: file.name })
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'The selected file could not be read.')
    }
  }

  function confirmImport() {
    if (!pendingImport) return
    try {
      replaceSimulationData(pendingImport.data)
      setPendingImport(null)
      setImportError('')
      setSettingsError('')
      onToast?.('Application data imported')
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Application data could not be imported.')
    }
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <div className="eyebrow">WORKSPACE PREFERENCES</div>
          <h1>Settings</h1>
          <p className="page-subtitle">Configure this browser-based Lambda simulator and manage its local data.</p>
        </div>
      </div>

      <div className="settings-content settings-page-content">
        <section className="settings-preference-section" aria-labelledby="settings-general-title">
          <div className="settings-section-heading">
            <div><h2 id="settings-general-title">General</h2><p>Application identity and workspace mode.</p></div>
          </div>
          <div className="settings-item">
            <span className="settings-item-icon"><icons.Zap size={18} /></span>
            <div className="settings-item-copy"><strong>Application name</strong><p>The name shown throughout this application.</p></div>
            <span className="settings-value">LambdaLab</span>
          </div>
          <div className="settings-item">
            <span className="settings-item-icon"><icons.ShieldCheck size={18} /></span>
            <div className="settings-item-copy"><strong>Simulation mode</strong><p>Local controlled simulation; no AWS services are connected.</p></div>
            <span className="settings-badge settings-badge-local">Enabled</span>
          </div>
        </section>

        <section className="settings-preference-section" aria-labelledby="settings-simulation-title">
          <div className="settings-section-heading">
            <div><h2 id="settings-simulation-title">Simulation</h2><p>Choose defaults for newly created simulated functions and invocations.</p></div>
          </div>
          <div className="settings-item settings-control-row">
            <span className="settings-item-icon"><icons.Code2 size={18} /></span>
            <div className="settings-item-copy"><strong>Default runtime</strong><p>Used when creating a function. Existing functions are unchanged.</p></div>
            <label className="settings-control">
              <span className="sr-only">Default runtime</span>
              <select value={settings.defaultRuntime} onChange={(event) => changeSetting({ defaultRuntime: event.target.value })}>
                {runtimeOptions.map((runtime) => <option key={runtime} value={runtime}>{runtime}</option>)}
              </select>
            </label>
          </div>
          <div className="settings-item settings-control-row">
            <span className="settings-item-icon"><icons.Clock3 size={18} /></span>
            <div className="settings-item-copy"><strong>Default execution delay</strong><p>Bounded simulator wait applied to normal invocations; simulated timeouts use the maximum delay.</p></div>
            <label className="settings-control">
              <span className="sr-only">Default execution delay</span>
              <select value={settings.defaultExecutionDelayMs} onChange={(event) => changeSetting({ defaultExecutionDelayMs: Number(event.target.value) })}>
                {executionDelayOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
          <div className="settings-item settings-control-row">
            <span className="settings-item-icon"><icons.Database size={18} /></span>
            <div className="settings-item-copy">
              <strong>Demo data</strong>
              <p>{demoDataLoaded ? 'Demo data is already loaded; disabling prevents loading it again but does not remove saved records.' : 'Allow loading the optional sample functions and simulated history.'}</p>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.demoDataEnabled}
                onChange={(event) => changeSetting({ demoDataEnabled: event.target.checked })}
                aria-label="Enable demo data"
              />
              <span>{settings.demoDataEnabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
          {settings.demoDataEnabled && !demoDataLoaded && (
            <div className="settings-demo-row settings-demo-action">
              <span className="settings-item-icon"><icons.ChartNoAxesCombined size={18} /></span>
              <span className="settings-demo-copy"><strong>Explore with demo data</strong><small>Load four sample functions and simulated invocation history. Available only when the workspace is empty.</small></span>
              <button className="button button-secondary" onClick={handleLoadDemoData} disabled={!workspaceIsEmpty}><icons.Plus size={14} />Load Demo Data</button>
            </div>
          )}
        </section>

        <section className="settings-preference-section" aria-labelledby="settings-data-title">
          <div className="settings-section-heading">
            <div><h2 id="settings-data-title">Data</h2><p>Application data stays in this browser unless you explicitly export it.</p></div>
            <span className="settings-badge settings-badge-local">Browser storage</span>
          </div>
          <div className="settings-data-summary">
            <span><strong>{functions.length}</strong><small>Functions</small></span>
            <span><strong>{testEvents.length}</strong><small>Test events</small></span>
            <span><strong>{executions.length}</strong><small>Executions</small></span>
            <span><strong>{logs.length}</strong><small>Log entries</small></span>
          </div>
          <div className="settings-data-actions">
            <button className="button button-secondary" onClick={exportApplicationData}><icons.ArrowDownRight size={14} />Export Data</button>
            <button className="button button-secondary" onClick={() => fileInput.current?.click()}><icons.ArrowUpRight size={14} />Import Data</button>
            <input ref={fileInput} className="settings-file-input" type="file" accept="application/json,.json" onChange={handleImportFile} aria-label="Choose LambdaLab JSON export" />
          </div>
          <p className="settings-data-warning"><icons.ShieldCheck size={14} />Exports include function source text, test events, execution results, and logs. Keep exported files private and never store passwords, API keys, personal data, or other secrets in the simulator.</p>
          {importError && <div className="settings-storage-error" role="alert"><icons.CircleHelp size={15} />{importError}</div>}
          {storageIssue && <div className="settings-storage-error" role="alert"><icons.CircleHelp size={15} />{storageIssue}</div>}
          {settingsError && <div className="settings-storage-error" role="alert"><icons.CircleHelp size={15} />{settingsError}</div>}
          <div className="settings-reset-row">
            <span><strong>Reset all application data</strong><small>Remove functions, test events, executions, logs, and saved preferences from this browser.</small></span>
            <button className="button button-danger" onClick={() => setConfirmReset(true)}><icons.Trash2 size={14} />Reset all data</button>
          </div>
        </section>

        <section className="settings-preference-section" aria-labelledby="settings-about-title">
          <div className="settings-section-heading">
            <div><h2 id="settings-about-title">About</h2><p>Application and project information.</p></div>
          </div>
          <div className="settings-item">
            <span className="settings-item-icon"><icons.BookOpen size={18} /></span>
            <div className="settings-item-copy"><strong>LambdaLab version</strong><p>Application version</p></div>
            <span className="settings-value">v{appVersion}</span>
          </div>
          <div className="settings-item">
            <span className="settings-item-icon"><icons.Cloud size={18} /></span>
            <div className="settings-item-copy"><strong>AWS Lambda Simulation</strong><p>Educational demonstration of Lambda function and observability concepts.</p></div>
            <span className="settings-badge settings-badge-local">Simulation only</span>
          </div>
          <div className="settings-item">
            <span className="settings-item-icon"><icons.GraduationCap size={18} /></span>
            <div className="settings-item-copy"><strong>Project information</strong><p>Individual academic project for BCSE355L Cloud Architecture Design. No AWS account, cloud service, or deployed function is used.</p></div>
          </div>
        </section>

        <div className="settings-local-note"><icons.ShieldCheck size={16} /><span><strong>Simulation Mode</strong><br />LambdaLab models AWS Lambda workflows with local data and controlled behaviors. It is not connected to or powered by AWS infrastructure.</span></div>
      </div>

      {confirmReset && (
        <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setConfirmReset(false)}>
          <section className="action-dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="reset-simulator-title">
            <div className="dialog-heading">
              <span className="dialog-icon dialog-icon-danger"><icons.Trash2 size={18} /></span>
              <div><h2 id="reset-simulator-title">Reset all application data?</h2><p>This permanently removes all locally saved functions, test events, executions, logs, and preferences. This action cannot be undone.</p></div>
              <button className="icon-button dialog-close" onClick={() => setConfirmReset(false)} aria-label="Close dialog"><icons.X size={17} /></button>
            </div>
            {settingsError && <div className="dialog-error" role="alert"><icons.CircleHelp size={15} />{settingsError}</div>}
            <div className="dialog-actions">
              <button className="button button-secondary" onClick={() => setConfirmReset(false)}>Cancel</button>
              <button className="button button-danger" onClick={handleReset}><icons.Trash2 size={14} />Reset all data</button>
            </div>
          </section>
        </div>
      )}

      {pendingImport && (
        <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPendingImport(null)}>
          <section className="action-dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="import-simulator-title">
            <div className="dialog-heading">
              <span className="dialog-icon"><icons.ArrowUpRight size={18} /></span>
              <div><h2 id="import-simulator-title">Replace application data?</h2><p>Import “{pendingImport.fileName}” and replace the current local workspace? This will overwrite saved functions, events, execution history, logs, and preferences.</p></div>
              <button className="icon-button dialog-close" onClick={() => setPendingImport(null)} aria-label="Close dialog"><icons.X size={17} /></button>
            </div>
            {importError && <div className="dialog-error" role="alert"><icons.CircleHelp size={15} />{importError}</div>}
            <div className="dialog-actions">
              <button className="button button-secondary" onClick={() => setPendingImport(null)}>Cancel</button>
              <button className="button button-primary" onClick={confirmImport}><icons.ArrowUpRight size={14} />Replace with imported data</button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

export function HelpPage() {
  return (
    <div className="help-page">
      <div className="eyebrow">AWS LAMBDA SIMULATOR</div>
      <h1>Help & support</h1>
      <p className="page-subtitle">Explore AWS Lambda concepts through a controlled browser-based simulation. No AWS account or cloud services are used.</p>
      <div className="settings-local-note"><icons.ShieldCheck size={16} /><span><strong>Simulation Mode</strong><br />Function source is stored as text. Invocations use predefined simulator behaviors and do not execute user code.</span></div>
      <section className="settings-data-section help-workflow" aria-labelledby="help-workflow-title">
        <div className="settings-section-heading"><div><h2 id="help-workflow-title">Simulated Lambda workflow</h2><p>Follow the same core concepts as a Lambda function lifecycle.</p></div></div>
        <ol>
          <li><strong>Create a simulated function</strong> and choose a supported simulated runtime, handler, and behavior.</li>
          <li><strong>Configure a test event</strong> as a named JSON object associated with the function.</li>
          <li><strong>Run a simulated invocation</strong> to produce a bounded result, status, duration, and invocation ID.</li>
          <li><strong>Review simulated execution logs</strong> and inspect the invocation history.</li>
          <li><strong>Analyze observability data</strong> calculated from the saved simulated executions.</li>
        </ol>
      </section>
    </div>
  )
}
