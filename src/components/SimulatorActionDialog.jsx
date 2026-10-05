import { useEffect, useState } from 'react'
import { functionBehaviorOptions, getBehaviorExampleEvent, getStarterTemplate, runtimeOptions } from '../data.js'
import { icons } from './Icons.jsx'

export default function SimulatorActionDialog({
  mode,
  functions = [],
  functionRecord,
  defaultRuntime = runtimeOptions[0],
  onClose,
  onSubmit,
}) {
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isFunctionForm = isCreate || isEdit
  const activeFunctions = functions.filter((fn) => fn.status === 'Active')
  const initialRuntime = functionRecord?.runtime ?? defaultRuntime
  const initialTemplate = getStarterTemplate(initialRuntime)
  const [name, setName] = useState(functionRecord?.name ?? '')
  const [runtime, setRuntime] = useState(initialRuntime)
  const [description, setDescription] = useState(functionRecord?.description ?? '')
  const [behavior, setBehavior] = useState(functionRecord?.behavior ?? functionBehaviorOptions[0].id)
  const [handler, setHandler] = useState(functionRecord?.handler ?? initialTemplate.handler)
  const [code, setCode] = useState(functionRecord?.code ?? initialTemplate.code)
  const [functionId, setFunctionId] = useState(activeFunctions[0]?.id ?? '')
  const [eventJson, setEventJson] = useState(JSON.stringify(getBehaviorExampleEvent(activeFunctions[0]?.behavior), null, 2))
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleRuntimeChange(nextRuntime) {
    const previousDefaults = getStarterTemplate(runtime)
    const nextDefaults = getStarterTemplate(nextRuntime)
    if (handler === previousDefaults.handler) setHandler(nextDefaults.handler)
    if (code === previousDefaults.code) setCode(nextDefaults.code)
    setRuntime(nextRuntime)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      if (isFunctionForm) {
        await onSubmit({ name, runtime, description, handler, code, behavior })
      } else {
        const parsedEvent = JSON.parse(eventJson)
        if (!parsedEvent || typeof parsedEvent !== 'object' || Array.isArray(parsedEvent)) {
          throw new Error('Test event must be a JSON object.')
        }
        await onSubmit({ functionId, event: parsedEvent })
      }
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'The action could not be completed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = isCreate ? 'Create function' : isEdit ? 'Edit function' : 'Invoke function'
  const subtitle = isCreate
    ? 'Configure a function in your local simulator workspace.'
    : isEdit
      ? 'Update the function configuration stored in this browser.'
      : 'Run a safe, local test invocation with a JSON event.'

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="action-dialog" role="dialog" aria-modal="true" aria-labelledby="action-dialog-title">
        <div className="dialog-heading">
          <span className="dialog-icon">{isFunctionForm ? <icons.Braces size={18} /> : <icons.Zap size={18} />}</span>
          <div>
            <h2 id="action-dialog-title">{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button type="button" className="icon-button dialog-close" onClick={onClose} aria-label="Close dialog"><icons.X size={17} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          {isFunctionForm ? (
            <div className="dialog-fields function-form-fields">
              <label className="dialog-field">
                <span>Function name <i>Required</i></span>
                <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. image-resizer" maxLength={64} required aria-required="true" aria-invalid={Boolean(error && !name.trim())} />
                <small>1–64 letters, numbers, hyphens, or underscores.</small>
              </label>
              <label className="dialog-field">
                <span>Description <i>Required</i></span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What does this function do?" rows={2} maxLength={180} required aria-required="true" aria-invalid={Boolean(error && !description.trim())} />
              </label>
              <div className="dialog-field-grid">
                <label className="dialog-field">
                  <span>Runtime <i>Required</i></span>
                  <select value={runtime} onChange={(event) => handleRuntimeChange(event.target.value)} required>
                    {runtimeOptions.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
                <label className="dialog-field">
                  <span>Handler <i>Required</i></span>
                  <input value={handler} onChange={(event) => setHandler(event.target.value)} placeholder="app.handler" required aria-required="true" />
                </label>
              </div>
              <label className="dialog-field">
                <span>Simulation behavior <i>Required</i></span>
                <select value={behavior} onChange={(event) => setBehavior(event.target.value)} required>
                  {functionBehaviorOptions.map((option) => <option key={option.id} value={option.id}>{option.label} · {option.description}</option>)}
                </select>
                <small>Invocation results are produced by a controlled simulator strategy. Function source is never executed.</small>
              </label>
              <label className="dialog-field">
                <span>Function code <i>Required · stored, not executed</i></span>
                <textarea className="json-input code-input" value={code} onChange={(event) => setCode(event.target.value)} spellCheck="false" rows={7} required aria-required="true" />
                <small>This simulator stores your code as text. It will not execute the source.</small>
              </label>
              <div className="simulator-dialog-notice"><icons.ShieldCheck size={15} />Configuration is saved locally in this browser. No AWS connection.</div>
            </div>
          ) : activeFunctions.length ? (
            <div className="dialog-fields">
              <label className="dialog-field">
                <span>Function</span>
                <select value={functionId} onChange={(event) => {
                  const nextFunctionId = event.target.value
                  setFunctionId(nextFunctionId)
                  const selected = activeFunctions.find((fn) => fn.id === nextFunctionId)
                  setEventJson(JSON.stringify(getBehaviorExampleEvent(selected?.behavior), null, 2))
                }} required>
                  {activeFunctions.map((fn) => <option key={fn.id} value={fn.id}>{fn.name} · {fn.runtime}</option>)}
                </select>
              </label>
              <label className="dialog-field">
                <span>Test event <i>JSON</i></span>
                <textarea className="json-input" value={eventJson} onChange={(event) => setEventJson(event.target.value)} spellCheck="false" rows={7} />
                <small>Add <code>"simulateError": true</code> to record a simulated failure.</small>
              </label>
              <div className="simulator-dialog-notice"><icons.ShieldCheck size={15} />No user code, AWS service, or network request is executed.</div>
            </div>
          ) : (
            <div className="dialog-empty">
              <p>There are no active functions to invoke yet.</p>
              <p>Create a function first, then come back to run a test event.</p>
            </div>
          )}
          {error && <div className="dialog-error" role="alert"><icons.CircleHelp size={15} />{error}</div>}
          <div className="dialog-actions">
            <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={isSubmitting || (!isFunctionForm && activeFunctions.length === 0)}>
              {isCreate ? <icons.Plus size={15} /> : isEdit ? <icons.Check size={15} /> : <icons.Zap size={15} />}
              {isSubmitting ? 'Invoking…' : isCreate ? 'Create function' : isEdit ? 'Save changes' : 'Simulate invocation'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
