import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDuration, formatTime, getBehaviorExampleEvent, getStarterTemplate } from '../data.js'
import { useSimulation } from '../state/SimulationContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import StatePanel from '../components/StatePanel.jsx'
import CodeEditor from '../components/CodeEditor.jsx'
import { icons } from '../components/Icons.jsx'
import { createInvocationId } from '../simulator/executionEngine.js'

function formatJsonSyntaxError(error, source) {
  const explicitLocation = error.message.match(/line\s+(\d+)\s+column\s+(\d+)/i)
  if (explicitLocation) return `Invalid JSON at line ${explicitLocation[1]}, column ${explicitLocation[2]}: ${error.message}`

  const position = error.message.match(/position\s+(\d+)/i)
  if (position) {
    const offset = Number(position[1])
    const precedingText = source.slice(0, offset)
    const line = precedingText.split('\n').length
    const column = offset - precedingText.lastIndexOf('\n')
    return `Invalid JSON at line ${line}, column ${column}: ${error.message}`
  }
  return `Invalid JSON: ${error.message}`
}

export default function FunctionDetailsPage({ functionId, onNavigate, onToast }) {
  const {
    functions,
    executions,
    testEvents,
    updateFunction,
    deleteFunction,
    createTestEvent,
    updateTestEvent,
    deleteTestEvent,
    invokeFunction,
  } = useSimulation()
  const fn = functions.find((item) => item.id === functionId)
  const functionTestEvents = useMemo(
    () => testEvents.filter((item) => item.functionId === functionId),
    [testEvents, functionId],
  )
  const initialTestEvent = functionTestEvents[0]
  const [codeDraft, setCodeDraft] = useState(fn?.code ?? '')
  const [selectedTestEventId, setSelectedTestEventId] = useState(initialTestEvent?.id ?? '')
  const [isNewTestEvent, setIsNewTestEvent] = useState(!initialTestEvent)
  const [testEventName, setTestEventName] = useState(initialTestEvent?.name ?? '')
  const [testEventJson, setTestEventJson] = useState(JSON.stringify(initialTestEvent?.event ?? getBehaviorExampleEvent(fn?.behavior), null, 2))
  const [failureScenario, setFailureScenario] = useState('none')
  const [showTestEvent, setShowTestEvent] = useState(true)
  const [jsonValidation, setJsonValidation] = useState(null)
  const [testEventError, setTestEventError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [invokeError, setInvokeError] = useState('')
  const [isInvoking, setIsInvoking] = useState(false)
  const invocationInProgress = useRef(false)
  const [activeInvocation, setActiveInvocation] = useState(null)
  const [latestInvocation, setLatestInvocation] = useState(null)
  const [savedMessage, setSavedMessage] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const recentExecutions = executions
    .filter((execution) => execution.functionId === functionId)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .slice(0, 5)

  useEffect(() => {
    setCodeDraft(fn?.code ?? '')
  }, [fn?.code])

  useEffect(() => {
    const selected = functionTestEvents.find((item) => item.id === selectedTestEventId)
    if (selected) {
      setIsNewTestEvent(false)
      setTestEventName(selected.name)
      setTestEventJson(JSON.stringify(selected.event, null, 2))
      setJsonValidation(null)
      setTestEventError('')
      return
    }
    if (functionTestEvents.length) {
      const [first] = functionTestEvents
      setSelectedTestEventId(first.id)
      setIsNewTestEvent(false)
      setTestEventName(first.name)
      setTestEventJson(JSON.stringify(first.event, null, 2))
    } else {
      setSelectedTestEventId('')
      setIsNewTestEvent(true)
      setTestEventName('')
      setTestEventJson(JSON.stringify(getBehaviorExampleEvent(fn?.behavior), null, 2))
    }
    setJsonValidation(null)
    setTestEventError('')
  }, [functionId, functionTestEvents, selectedTestEventId, fn?.behavior])

  if (!fn) {
    return (
      <>
        <button className="text-button function-back-link" onClick={() => onNavigate('functions')}><icons.ArrowRight className="back-arrow" size={14} />Back to functions</button>
        <section className="table-card"><StatePanel state="empty" title="Function not found" detail="It may have been deleted. Return to the functions list to choose another." action={<button className="button button-primary dashboard-empty-action" onClick={() => onNavigate('functions')}>View functions</button>} /></section>
      </>
    )
  }

  function saveCode() {
    setSaveError('')
    setSavedMessage('')
    try {
      if (!codeDraft.trim()) throw new Error('Function code cannot be empty.')
      const updated = updateFunction(fn.id, { ...fn, code: codeDraft })
      setCodeDraft(updated.code)
      setSavedMessage(`Saved at ${new Date(updated.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`)
      onToast(`Code for “${updated.name}” saved`)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The code could not be saved.')
    }
  }

  function removeFunction() {
    try {
      deleteFunction(fn.id)
      setConfirmDelete(false)
      onToast(`Function “${fn.name}” deleted. Its execution history was retained.`)
      onNavigate('functions')
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'The function could not be deleted.')
    }
  }

  function parseTestEvent() {
    try {
      const event = JSON.parse(testEventJson)
      if (!event || typeof event !== 'object' || Array.isArray(event)) {
        throw new Error('Test event must be a JSON object.')
      }
      setJsonValidation({ valid: true, message: 'Valid JSON object' })
      setInvokeError('')
      return event
    } catch (error) {
      const message = error instanceof SyntaxError
        ? formatJsonSyntaxError(error, testEventJson)
        : error instanceof Error
          ? error.message
          : 'Invalid JSON.'
      setJsonValidation({ valid: false, message })
      throw new Error(message)
    }
  }

  function validateTestEvent() {
    setTestEventError('')
    try {
      parseTestEvent()
    } catch {
      // The specific parse or shape error is already shown beside the editor.
    }
  }

  function saveTestEvent() {
    setTestEventError('')
    setInvokeError('')
    try {
      const event = parseTestEvent()
      const input = { name: testEventName, event }
      const saved = isNewTestEvent
        ? createTestEvent(fn.id, input)
        : updateTestEvent(fn.id, selectedTestEventId, input)
      setSelectedTestEventId(saved.id)
      setIsNewTestEvent(false)
      setTestEventName(saved.name)
      setTestEventJson(JSON.stringify(saved.event, null, 2))
      setTestEventError('')
      onToast(`Test event “${saved.name}” saved`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The test event could not be saved.'
      setTestEventError(message)
    }
  }

  function removeTestEvent() {
    try {
      const removed = deleteTestEvent(fn.id, selectedTestEventId)
      const next = functionTestEvents.find((item) => item.id !== removed.id)
      setSelectedTestEventId(next?.id ?? '')
      setIsNewTestEvent(!next)
      setTestEventName(next?.name ?? '')
      setTestEventJson(JSON.stringify(next?.event ?? getBehaviorExampleEvent(fn.behavior), null, 2))
      setJsonValidation(null)
      setTestEventError('')
      setInvokeError('')
      onToast(`Test event “${removed.name}” deleted`)
    } catch (error) {
      setTestEventError(error instanceof Error ? error.message : 'The test event could not be deleted.')
    }
  }

  function startNewTestEvent() {
    setIsNewTestEvent(true)
    setSelectedTestEventId('')
    setTestEventName('')
    setTestEventJson(JSON.stringify(getBehaviorExampleEvent(fn.behavior), null, 2))
    setJsonValidation(null)
    setTestEventError('')
    setInvokeError('')
  }

  function selectTestEvent(eventId) {
    if (eventId === 'new') {
      startNewTestEvent()
      return
    }
    const selected = functionTestEvents.find((item) => item.id === eventId)
    if (!selected) return
    setSelectedTestEventId(selected.id)
    setIsNewTestEvent(false)
    setTestEventName(selected.name)
    setTestEventJson(JSON.stringify(selected.event, null, 2))
    setJsonValidation(null)
    setTestEventError('')
    setInvokeError('')
  }

  async function runInvocation() {
    if (invocationInProgress.current) return
    setInvokeError('')
    setJsonValidation(null)
    let event
    if (failureScenario === 'invalid-json') {
      event = '{"invalid": '
      setJsonValidation({ valid: false, message: 'Invalid JSON: this controlled scenario submits malformed JSON to the simulator.' })
    } else {
      try {
        event = JSON.parse(testEventJson)
        if (!event || typeof event !== 'object' || Array.isArray(event)) {
          setJsonValidation({ valid: false, message: 'Test event must be a JSON object.' })
        } else {
          setJsonValidation({ valid: true, message: 'Valid JSON object' })
        }
      } catch (error) {
        event = testEventJson
        setJsonValidation({ valid: false, message: error instanceof SyntaxError ? formatJsonSyntaxError(error, testEventJson) : 'Invalid JSON.' })
      }
      if (failureScenario !== 'none' && typeof event === 'object' && event !== null && !Array.isArray(event)) {
        event = { ...event, simulateFailure: failureScenario }
      } else if (failureScenario !== 'none' && typeof event === 'string') {
        event = { simulateFailure: failureScenario }
      } else if (failureScenario !== 'none') {
        event = { simulateFailure: failureScenario }
      }
    }

    const savedEvent = failureScenario === 'none' ? functionTestEvents.find((item) => item.id === selectedTestEventId) : null
    const matchesSavedEvent = !isNewTestEvent &&
      savedEvent &&
      testEventName.trim() === savedEvent.name &&
      JSON.stringify(event) === JSON.stringify(savedEvent.event)
    const invocationId = createInvocationId()
    const startedAt = new Date().toISOString()
    invocationInProgress.current = true
    setIsInvoking(true)
    setLatestInvocation(null)
    setActiveInvocation({ invocationId, startedAt })
    try {
      const execution = await invokeFunction(fn.id, event, {
        ...(matchesSavedEvent ? { testEventId: savedEvent.id } : {}),
        testEventName: testEventName.trim() || (savedEvent?.name ?? 'Ad hoc test event'),
        invocationId,
      })
      setLatestInvocation(execution)
      onToast(`${execution.status === 'SUCCESS' || execution.status === 'Success' ? 'Invocation succeeded' : 'Invocation failed'} · ${formatDuration(execution.durationMs)}`)
    } catch (error) {
      setInvokeError(error instanceof Error ? error.message : 'The invocation could not be recorded.')
    } finally {
      invocationInProgress.current = false
      setIsInvoking(false)
      setActiveInvocation(null)
    }
  }

  return (
    <>
      <button className="text-button function-back-link" onClick={() => onNavigate('functions')}><icons.ArrowRight className="back-arrow" size={14} />Back to functions</button>
      <div className="function-detail-heading">
        <div className="function-detail-title">
          <span className={`function-avatar function-avatar-large function-${fn.color}`}>{fn.initials}</span>
          <div>
            <div className="function-title-line"><h1>{fn.name}</h1><StatusBadge>{fn.status}</StatusBadge></div>
            <p>{fn.description}</p>
            <span className="function-runtime-line"><icons.Braces size={14} />{fn.runtime}<span className="detail-divider">·</span>{fn.behavior}<span className="detail-divider">·</span><code>{fn.handler}</code><span className="detail-divider">·</span><span>ID {fn.id}</span></span>
          </div>
        </div>
        <div className="function-detail-actions">
          <button className="button button-secondary" onClick={() => { setShowTestEvent((visible) => !visible); setInvokeError('') }} aria-expanded={showTestEvent}><icons.FileCode2 size={15} />Test Event</button>
          <button className="button button-primary" onClick={runInvocation} disabled={isInvoking}><icons.Zap size={15} />{isInvoking ? 'Invoking…' : 'Invoke'}</button>
          <button className="icon-button detail-delete-button" onClick={() => setConfirmDelete(true)} aria-label="Delete function" title="Delete function"><icons.Trash2 size={16} /></button>
        </div>
      </div>

      {deleteError && <div className="dialog-error function-detail-error" role="alert"><icons.CircleHelp size={15} />{deleteError}<button className="icon-button" onClick={() => setDeleteError('')} aria-label="Dismiss error"><icons.X size={14} /></button></div>}
      <div className="function-config-strip">
        <span><small>FUNCTION NAME</small><strong>{fn.name}</strong></span>
        <span><small>RUNTIME</small><strong>{fn.runtime}</strong></span>
        <span><small>HANDLER</small><code>{fn.handler}</code></span>
      </div>

      <div className="function-detail-metrics">
        <article><span>Invocations</span><strong>{fn.invocationCount}</strong></article>
        <article><span>Last invoked</span><strong className="detail-metric-subtle">{fn.lastInvokedAt ? formatTime(fn.lastInvokedAt) : 'Never'}</strong></article>
        <article><span>Created</span><strong className="detail-metric-subtle">{formatTime(fn.createdAt)}</strong></article>
        <article><span>Last updated</span><strong className="detail-metric-subtle">{formatTime(fn.updatedAt)}</strong></article>
      </div>

      <div className="function-detail-grid">
        <section className="table-card detail-code-card">
          <div className="code-editor-heading">
            <div><h2>Function code</h2><p>Source is stored as text and never executed by the browser.</p></div>
            <button className="text-button" onClick={() => setCodeDraft(getStarterTemplate(fn.runtime).code)}><icons.Code2 size={13} />Reset to starter</button>
          </div>
          <div className="code-editor-toolbar"><span className="code-runtime-chip">{fn.runtime}</span><span className="code-editor-file">{fn.handler}</span><span className={`code-editor-unsaved ${codeDraft !== fn.code ? 'code-editor-dirty' : 'code-editor-clean'}`} aria-live="polite">{codeDraft !== fn.code ? 'Unsaved changes' : 'Saved'}</span></div>
          <CodeEditor
            value={codeDraft}
            onChange={(value) => { setCodeDraft(value); setSavedMessage(''); setSaveError('') }}
            onSave={saveCode}
            language={fn.runtime.startsWith('Python') ? 'Python' : fn.runtime.startsWith('Java') ? 'Java' : 'JavaScript'}
            name={`Function code for ${fn.name}`}
          />
          {saveError && <div className="editor-error" role="alert"><icons.CircleHelp size={14} />{saveError}</div>}
          <div className="code-editor-footer">
            <span aria-live="polite">{savedMessage || (codeDraft === fn.code ? `Last saved ${formatTime(fn.updatedAt)}` : 'You have unsaved code changes')}</span>
            <button className="button button-primary" onClick={saveCode} disabled={codeDraft === fn.code} aria-keyshortcuts="Control+S Meta+S"><icons.Check size={14} />Save code</button>
          </div>
          {showTestEvent && (
            <div className="test-event-panel">
              <div className="test-event-heading"><span><strong>Test events</strong><small>Saved JSON objects for this function</small></span><button className="icon-button" onClick={() => setShowTestEvent(false)} aria-label="Close test event"><icons.X size={15} /></button></div>
              <div className="test-event-toolbar">
                <label className="test-event-select-wrap"><span>Select test event</span><select value={isNewTestEvent ? 'new' : selectedTestEventId} onChange={(event) => selectTestEvent(event.target.value)} aria-label="Select test event"><option value="new">New test event…</option>{functionTestEvents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><icons.ChevronDown size={14} /></label>
                <button className="button button-secondary button-compact" onClick={startNewTestEvent}><icons.Plus size={14} />New event</button>
              </div>
              <label className="test-event-name-field"><span>Event name</span><input value={testEventName} onChange={(event) => { setTestEventName(event.target.value); setTestEventError('') }} placeholder="e.g. VIT Chennai greeting" maxLength={80} aria-label="Event name" /></label>
              <div className="test-json-editor-heading"><span>JSON input preview</span><span>{jsonValidation?.valid ? <i className="json-valid-indicator"><icons.Check size={12} />{jsonValidation.message}</i> : jsonValidation && <i className="json-invalid-indicator"><icons.CircleHelp size={12} />{jsonValidation.message}</i>}</span></div>
              <textarea className={`test-event-input ${jsonValidation?.valid === false ? 'test-event-invalid' : ''}`} aria-label="JSON input preview" value={testEventJson} onChange={(event) => { setTestEventJson(event.target.value); setJsonValidation(null); setTestEventError(''); setInvokeError('') }} spellCheck="false" rows={7} />
              <small className="invocation-input-help">This JSON is sent to the selected simulated behavior. Unsaved edits can be invoked without changing the saved test event.</small>
              <label className="test-event-name-field failure-scenario-field"><span>Controlled failure scenario</span><select value={failureScenario} onChange={(event) => { setFailureScenario(event.target.value); setJsonValidation(null); setInvokeError('') }} aria-label="Controlled failure scenario"><option value="none">None — run normally</option><option value="invalid-json">Invalid JSON input</option><option value="missing-input">Missing required input</option><option value="invalid-configuration">Invalid function configuration</option><option value="runtime-error">Simulated runtime error</option><option value="timeout">Simulated timeout (bounded)</option></select></label>
              <small className="invocation-input-help">Failure scenarios are simulator fixtures. No code is executed, and timeout simulation is capped.</small>
              <div className="test-event-actions">
                <button className="button button-secondary button-compact" onClick={validateTestEvent}><icons.Check size={14} />Validate JSON</button>
                <button className="button button-secondary button-compact" onClick={saveTestEvent}><icons.Save size={14} />Save event</button>
                {!isNewTestEvent && <button className="button button-secondary button-compact test-delete-button" onClick={removeTestEvent}><icons.Trash2 size={14} />Delete</button>}
                <button className="button button-primary button-compact test-run-button" onClick={runInvocation} disabled={isInvoking}><icons.Zap size={14} />{isInvoking ? 'Invoking…' : 'Run test'}</button>
              </div>
              {testEventError && <div className="editor-error" role="alert"><icons.CircleHelp size={14} />{testEventError}</div>}
              {invokeError && <div className="editor-error" role="alert"><icons.CircleHelp size={14} />{invokeError}</div>}
              <div className="test-event-footer"><span><icons.ShieldCheck size={14} />No source code or AWS service is executed.</span><span>{functionTestEvents.length} saved</span></div>
            </div>
          )}
          {activeInvocation && (
            <section className="invocation-result invocation-result-running" role="status" aria-live="polite">
              <div className="invocation-result-heading">
                <span><strong>Execution in progress</strong><small>{activeInvocation.invocationId}</small></span>
                <span className="invocation-running-indicator"><i />Simulated invocation</span>
              </div>
              <p>Running the selected behavior in LambdaLab’s controlled simulator. No user code or AWS service is executed.</p>
              <small className="invocation-start-time">Started {formatTime(activeInvocation.startedAt)}</small>
            </section>
          )}
          {latestInvocation && (
            <section className={`invocation-result ${latestInvocation.status === 'ERROR' || latestInvocation.status === 'Failed' ? 'invocation-result-failed' : ''}`} aria-live="polite">
              <div className="invocation-result-heading">
                <span><strong>Execution Status</strong><small>Invocation ID · {latestInvocation.invocationId}</small></span>
                <StatusBadge>{latestInvocation.status}</StatusBadge>
              </div>
              <div className="invocation-result-metadata">
                <span><small>Duration</small><strong>{formatDuration(latestInvocation.durationMs)}</strong></span>
                <span><small>Started</small><strong>{formatTime(latestInvocation.startedAt)}</strong></span>
                <span><small>Completed</small><strong>{formatTime(latestInvocation.completedAt)}</strong></span>
              </div>
              {latestInvocation.error
                ? <div className="invocation-result-error"><strong>Execution error</strong><span>{latestInvocation.error}</span></div>
                : <div className="invocation-result-output-wrap"><strong>Output</strong><pre className="invocation-result-output">{JSON.stringify(latestInvocation.output, null, 2)}</pre></div>}
              <div className="invocation-result-logs">
                <strong>Execution logs</strong>
                {latestInvocation.logs.map((log) => <div key={log.id}><span>{formatTime(log.timestamp)}</span><b className={`log-level level-${log.level.toLowerCase()}`}>{log.level}</b><span>{log.message}</span></div>)}
              </div>
              <div className="invocation-result-disclaimer"><icons.ShieldCheck size={13} />Simulated Lambda execution · no AWS services connected</div>
            </section>
          )}
        </section>
        <section className="table-card detail-executions-card">
          <div className="section-heading"><div><h2>Recent executions</h2><p>Latest runs of this function</p></div><button className="text-button" onClick={() => onNavigate('executions')}>View all <icons.ArrowRight size={13} /></button></div>
          {recentExecutions.length ? (
            <div className="detail-execution-list">
              {recentExecutions.map((execution) => (
                <div className="detail-execution-row" key={execution.id}>
                  <span className={`execution-status-mark ${execution.status === 'ERROR' || execution.status === 'Failed' ? 'execution-mark-failed' : ''}`}>{execution.status === 'ERROR' || execution.status === 'Failed' ? <icons.X size={12} /> : <icons.Check size={12} />}</span>
                  <span className="detail-execution-copy"><strong>{execution.id}</strong><small>{formatTime(execution.startedAt)} · {Math.round(execution.durationMs)} ms{execution.testEventName ? ` · ${execution.testEventName}` : ''}</small></span>
                  <StatusBadge>{execution.status}</StatusBadge>
                </div>
              ))}
            </div>
          ) : <StatePanel state="empty" title="No invocations yet" detail="Invoke this function to start its execution history." />}
        </section>
      </div>
      <div className="function-detail-note"><icons.ShieldCheck size={15} />LambdaLab simulates function metadata and invocation history locally. No AWS services are used.</div>

      {confirmDelete && (
        <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setConfirmDelete(false)}>
          <section className="action-dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-detail-title">
            <div className="dialog-heading"><span className="dialog-icon dialog-icon-danger"><icons.Trash2 size={18} /></span><div><h2 id="delete-detail-title">Delete function?</h2><p>This will remove <strong>{fn.name}</strong> from your workspace. Its execution and log history will be retained.</p></div><button className="icon-button dialog-close" onClick={() => setConfirmDelete(false)} aria-label="Close dialog"><icons.X size={17} /></button></div>
            <div className="dialog-actions"><button className="button button-secondary" onClick={() => setConfirmDelete(false)}>Cancel</button><button className="button button-danger" onClick={removeFunction}><icons.Trash2 size={14} />Delete function</button></div>
          </section>
        </div>
      )}
    </>
  )
}
