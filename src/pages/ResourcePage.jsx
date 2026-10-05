import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatDuration, formatTime } from '../data.js'
import { useSimulation } from '../state/SimulationContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import StatePanel from '../components/StatePanel.jsx'
import SimulatorActionDialog from '../components/SimulatorActionDialog.jsx'
import { icons } from '../components/Icons.jsx'

const pageDetails = {
  functions: { title: 'Functions', subtitle: 'Build, manage, and inspect your simulated serverless functions.', icon: 'Braces', action: 'Create function' },
  executions: { title: 'Executions', subtitle: 'Review simulated Lambda invocations, results, and execution logs.', icon: 'Activity' },
  logs: { title: 'Logs', subtitle: 'Search and inspect simulated Lambda invocation log streams.', icon: 'ScrollText' },
}

function FunctionTable({ query, runtime, status, functions, executions, onOpenFunction, onEditFunction, onDeleteFunction }) {
  const rows = useMemo(() => functions.filter((fn) => {
    const matchesQuery = `${fn.name} ${fn.description} ${fn.runtime} ${fn.handler}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (runtime === 'All runtimes' || fn.runtime === runtime) && (status === 'All statuses' || fn.status === status)
  }), [functions, query, runtime, status])
  if (!rows.length) return <StatePanel state="empty" title="No matching functions" detail="Try another search, or create a function to get started." />
  const invocationCounts = new Map()
  for (const execution of executions) {
    invocationCounts.set(execution.functionId, (invocationCounts.get(execution.functionId) ?? 0) + 1)
  }
  return (
    <div className="table-scroll">
      <table className="resource-table">
        <thead><tr><th>FUNCTION NAME</th><th>RUNTIME</th><th>HANDLER</th><th>STATUS</th><th>INVOCATIONS</th><th>LAST UPDATED</th><th /></tr></thead>
        <tbody>{rows.map((fn) => (
          <tr key={fn.name}>
            <td><button className="function-name-button" onClick={() => onOpenFunction(fn.id)}><span className={`function-avatar function-${fn.color}`}>{fn.initials}</span><span><strong>{fn.name}</strong><small>{fn.description}</small></span></button></td>
            <td>{fn.runtime}</td><td className="mono-cell">{fn.handler}</td><td><StatusBadge>{fn.status}</StatusBadge></td>
            <td className="mono-cell">{invocationCounts.get(fn.id) ?? fn.invocationCount}</td><td>{formatTime(fn.updatedAt)}</td>
            <td><div className="function-row-actions"><button className="icon-button row-more" aria-label={`View ${fn.name}`} title="View details" onClick={() => onOpenFunction(fn.id)}><icons.ArrowRight size={15} /></button><button className="icon-button row-more" aria-label={`Edit ${fn.name}`} title="Edit function" onClick={() => onEditFunction(fn)}><icons.Code2 size={15} /></button><button className="icon-button row-more delete-function-button" aria-label={`Delete ${fn.name}`} title="Delete function" onClick={() => onDeleteFunction(fn)}><icons.Trash2 size={15} /></button></div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function ExecutionTable({ rows, functions, onSelectExecution }) {
  if (!rows.length) return <StatePanel state="empty" title="No matching executions" detail="Try adjusting your search to find an execution." />
  const functionById = new Map(functions.map((fn) => [fn.id, fn]))
  return (
    <div className="table-scroll">
      <table className="resource-table execution-history-table">
        <thead><tr><th>INVOCATION ID</th><th>FUNCTION</th><th>RUNTIME</th><th>STATUS</th><th>DURATION</th><th>TIMESTAMP</th></tr></thead>
        <tbody>{rows.map((item) => {
          const fn = functionById.get(item.functionId)
          return (
          <tr key={item.id} className="execution-history-row" onClick={() => onSelectExecution(item)} onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onSelectExecution(item)
            }
          }} tabIndex={0} aria-label={`View invocation ${item.invocationId ?? item.id} details`}>
            <td className="mono-cell"><button className="execution-id-link" onClick={(event) => { event.stopPropagation(); onSelectExecution(item) }}>{item.invocationId ?? item.id}</button></td>
            <td><strong className="table-strong">{item.functionName ?? fn?.name ?? 'Deleted function'}</strong><small className="execution-function-subtitle">{item.testEventName ?? item.trigger ?? 'Test event'}</small></td>
            <td>{item.runtime ?? fn?.runtime ?? '—'}</td>
            <td><StatusBadge>{item.status}</StatusBadge></td>
            <td className="mono-cell">{formatDuration(item.durationMs ?? 0)}</td>
            <td>{formatTime(item.startedAt)}</td>
          </tr>
        )})}</tbody>
      </table>
    </div>
  )
}

function ExecutionDetailsDialog({ execution, functions, logs, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!execution) return null
  const fn = functions.find((item) => item.id === execution.functionId)
  const invocationId = execution.invocationId ?? execution.id
  const completedAt = execution.completedAt ?? new Date(
    new Date(execution.startedAt).getTime() + (execution.durationMs ?? 0),
  ).toISOString()
  const executionLogs = Array.isArray(execution.logs) && execution.logs.length
    ? execution.logs.map((item) => ({
      ...item,
      displayTime: item.timestamp ? formatTime(item.timestamp) : item.time ?? '—',
    }))
    : logs.filter((item) => item.executionId === execution.id).map((item) => ({
      ...item,
      displayTime: item.time ?? '—',
    }))
  const output = execution.output ?? execution.result

  return (
    <div className="dialog-backdrop execution-detail-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="action-dialog execution-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="execution-detail-title">
        <div className="dialog-heading">
          <span className={`dialog-icon ${execution.status === 'ERROR' || execution.status === 'Failed' ? 'dialog-icon-danger' : ''}`}><icons.Activity size={18} /></span>
          <div><h2 id="execution-detail-title">Invocation details</h2><p>Simulated Lambda execution record</p></div>
          <button className="icon-button dialog-close" onClick={onClose} aria-label="Close execution details"><icons.X size={17} /></button>
        </div>
        <div className="execution-detail-content">
          <div className="execution-detail-status"><span><small>Execution status</small><StatusBadge>{execution.status}</StatusBadge></span><span><small>Duration</small><strong>{formatDuration(execution.durationMs ?? 0)}</strong></span></div>
          <dl className="execution-detail-fields">
            <div><dt>Invocation ID</dt><dd className="mono-cell">{invocationId}</dd></div>
            <div><dt>Function</dt><dd>{execution.functionName ?? fn?.name ?? 'Deleted function'}{(execution.runtime ?? fn?.runtime) && <small>{execution.runtime ?? fn.runtime}</small>}</dd></div>
            <div><dt>Test event</dt><dd>{execution.testEventName ?? execution.trigger ?? 'Test event'}</dd></div>
            <div><dt>Start time</dt><dd>{formatTime(execution.startedAt)}</dd></div>
            <div><dt>End time</dt><dd>{formatTime(completedAt)}</dd></div>
          </dl>
          <section className="execution-detail-output">
            <h3>Test event</h3>
            <pre>{JSON.stringify(execution.event ?? null, null, 2)}</pre>
          </section>
          {execution.error
            ? <section className="execution-detail-output execution-detail-error"><h3><icons.CircleHelp size={14} />Error</h3><p>{execution.error}</p></section>
            : <section className="execution-detail-output"><h3>Output</h3><pre>{JSON.stringify(output ?? null, null, 2)}</pre></section>}
          <section className="execution-detail-logs">
            <h3>Execution logs</h3>
            {executionLogs.length ? executionLogs.map((item, index) => (
              <div className="execution-detail-log" key={item.id ?? `${invocationId}-log-${index}`}>
                <span>{item.displayTime}</span><b className={`log-level level-${(item.level ?? 'INFO').toLowerCase()}`}>{item.level ?? 'INFO'}</b><p>{item.message}</p>
              </div>
            )) : <StatePanel state="empty" title="No logs recorded" detail="No execution logs are available for this historical record." />}
          </section>
          <div className="execution-detail-disclaimer"><icons.ShieldCheck size={14} />Simulated execution · no AWS services connected</div>
        </div>
        <div className="dialog-actions"><button className="button button-secondary" onClick={onClose}>Close</button></div>
      </section>
    </div>
  )
}

function LogsTable({ rows, onSelectExecution }) {
  if (!rows.length) return <StatePanel state="empty" title="No matching log entries" detail="Try a different search term or log level." />
  return (
    <div className="table-scroll">
      <table className="resource-table logs-table professional-logs-table">
        <thead><tr><th>TIMESTAMP</th><th>INVOCATION ID</th><th>LEVEL</th><th>FUNCTION</th><th>STATUS</th><th>MESSAGE</th></tr></thead>
        <tbody>{rows.map((item) => (
          <tr key={item.id} className="log-entry-row" onClick={() => item.execution && onSelectExecution(item.execution)} tabIndex={item.execution ? 0 : undefined} onKeyDown={(event) => {
            if (item.execution && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault()
              onSelectExecution(item.execution)
            }
          }} aria-label={item.execution ? `Open logs for invocation ${item.invocationId}` : undefined}>
            <td className="mono-cell">{formatTime(item.timestamp)}</td>
            <td className="mono-cell"><button className="execution-id-link" disabled={!item.execution} onClick={(event) => { event.stopPropagation(); if (item.execution) onSelectExecution(item.execution) }}>{item.invocationId}</button></td>
            <td><span className={`log-level level-${item.level.toLowerCase()}`}>{item.level}</span></td>
            <td><strong className="table-strong">{item.functionName}</strong></td>
            <td>{item.status ? <StatusBadge>{item.status}</StatusBadge> : '—'}</td>
            <td className="log-message">{item.message}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export default function ResourcePage({ page, onToast, onNavigate }) {
  const { functions, executions, logs, settings, createFunction, updateFunction, deleteFunction } = useSimulation()
  const detail = pageDetails[page]
  const [query, setQuery] = useState('')
  const [functionStatus, setFunctionStatus] = useState('All statuses')
  const [executionStatus, setExecutionStatus] = useState('All statuses')
  const [runtime, setRuntime] = useState('All runtimes')
  const [functionFilter, setFunctionFilter] = useState('All functions')
  const [executionSort, setExecutionSort] = useState('newest')
  const [executionPage, setExecutionPage] = useState(1)
  const [logFunctionFilter, setLogFunctionFilter] = useState('All functions')
  const [logStatusFilter, setLogStatusFilter] = useState('All statuses')
  const [logLevelFilter, setLogLevelFilter] = useState('All levels')
  const [logPage, setLogPage] = useState(1)
  const [selectedExecution, setSelectedExecution] = useState(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingFunction, setEditingFunction] = useState(null)
  const [deletingFunction, setDeletingFunction] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const Icon = icons[detail.icon]
  const executionsByFunction = useMemo(() => {
    const names = new Map()
    for (const item of executions) {
      names.set(item.functionId, item.functionName ?? functions.find((fn) => fn.id === item.functionId)?.name ?? 'Deleted function')
    }
    return [...names.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [executions, functions])
  const filteredExecutions = useMemo(() => {
    const queryText = query.trim().toLowerCase()
    const functionNames = new Map(functions.map((fn) => [fn.id, fn.name]))
    const matching = executions.filter((item) => {
      const functionName = item.functionName ?? functionNames.get(item.functionId) ?? 'Deleted function'
      const runtimeName = item.runtime ?? functions.find((fn) => fn.id === item.functionId)?.runtime ?? ''
      const matchesQuery = !queryText || `${item.invocationId ?? item.id} ${functionName} ${runtimeName} ${item.status} ${item.testEventName ?? ''} ${item.trigger ?? ''}`.toLowerCase().includes(queryText)
      return matchesQuery &&
        (functionFilter === 'All functions' || item.functionId === functionFilter) &&
        (executionStatus === 'All statuses' || item.status === executionStatus)
    })
    return matching.sort((a, b) => {
      if (executionSort === 'duration-longest') return (b.durationMs ?? 0) - (a.durationMs ?? 0) || new Date(b.startedAt) - new Date(a.startedAt)
      if (executionSort === 'duration-shortest') return (a.durationMs ?? 0) - (b.durationMs ?? 0) || new Date(b.startedAt) - new Date(a.startedAt)
      if (executionSort === 'oldest') return new Date(a.startedAt) - new Date(b.startedAt)
      return new Date(b.startedAt) - new Date(a.startedAt)
    })
  }, [executions, functions, query, functionFilter, executionStatus, executionSort])
  const filteredLogs = useMemo(() => {
    const executionById = new Map(executions.map((item) => [item.id, item]))
    const functionByName = new Map(functions.map((item) => [item.name, item]))
    const queryText = query.trim().toLowerCase()
    return logs.map((entry, index) => {
      const execution = executionById.get(entry.executionId)
      const fn = functionByName.get(entry.functionName)
      const timestamp = entry.timestamp ?? execution?.startedAt ?? null
      return {
        ...entry,
        id: entry.id ?? `${entry.executionId ?? 'log'}-${index}`,
        execution,
        functionId: execution?.functionId ?? fn?.id ?? null,
        functionName: entry.functionName ?? execution?.functionName ?? fn?.name ?? 'Unknown function',
        invocationId: execution?.invocationId ?? execution?.id ?? entry.executionId ?? '—',
        timestamp: timestamp && !Number.isNaN(new Date(timestamp).getTime()) ? timestamp : new Date(0).toISOString(),
        level: ['INFO', 'WARN', 'ERROR'].includes(entry.level) ? entry.level : 'INFO',
        status: execution?.status ?? (entry.level === 'ERROR' ? 'ERROR' : null),
      }
    }).filter((entry) => {
      const matchesQuery = !queryText || `${entry.invocationId} ${entry.functionName} ${entry.level} ${entry.status ?? ''} ${entry.message} ${formatTime(entry.timestamp)}`.toLowerCase().includes(queryText)
      return matchesQuery &&
        (logFunctionFilter === 'All functions' || entry.functionId === logFunctionFilter) &&
        (logStatusFilter === 'All statuses' || entry.status === logStatusFilter) &&
        (logLevelFilter === 'All levels' || entry.level === logLevelFilter)
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }, [logs, executions, functions, query, logFunctionFilter, logStatusFilter, logLevelFilter])
  const pageSize = 10
  const executionPageCount = Math.max(1, Math.ceil(filteredExecutions.length / pageSize))
  const visibleExecutions = filteredExecutions.slice((executionPage - 1) * pageSize, executionPage * pageSize)
  const logPageSize = 25
  const logPageCount = Math.max(1, Math.ceil(filteredLogs.length / logPageSize))
  const visibleLogs = filteredLogs.slice((logPage - 1) * logPageSize, logPage * logPageSize)
  const closeExecutionDetails = useCallback(() => setSelectedExecution(null), [])

  useEffect(() => {
    setExecutionPage(1)
  }, [query, functionFilter, executionStatus, executionSort])

  useEffect(() => {
    if (executionPage > executionPageCount) setExecutionPage(executionPageCount)
  }, [executionPage, executionPageCount])

  useEffect(() => {
    setLogPage(1)
  }, [query, logFunctionFilter, logStatusFilter, logLevelFilter])

  useEffect(() => {
    if (logPage > logPageCount) setLogPage(logPageCount)
  }, [logPage, logPageCount])

  const resourceCount = page === 'functions' ? functions.length : page === 'executions' ? executions.length : logs.length
  const visibleCount = page === 'functions'
    ? functions.filter((fn) => {
      const matchesQuery = `${fn.name} ${fn.description} ${fn.runtime} ${fn.handler}`.toLowerCase().includes(query.toLowerCase())
      return matchesQuery && (runtime === 'All runtimes' || fn.runtime === runtime) && (functionStatus === 'All statuses' || fn.status === functionStatus)
    }).length
    : page === 'executions'
      ? filteredExecutions.length
      : filteredLogs.length

  function submitCreate(input) {
    const fn = createFunction(input)
    onToast(`Function “${fn.name}” created`)
  }

  function submitEdit(input) {
    const updated = updateFunction(editingFunction.id, input)
    setEditingFunction(null)
    onToast(`Function “${updated.name}” updated`)
  }

  function confirmDelete() {
    try {
      const removed = deleteFunction(deletingFunction.id)
      setDeletingFunction(null)
      setDeleteError('')
      onToast(`Function “${removed.name}” deleted. Its execution history was retained.`)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'The function could not be deleted.')
    }
  }

  return (
    <>
      <div className="page-title-row resource-title-row">
        <div><div className="eyebrow">SIMULATOR WORKSPACE <span className="eyebrow-slash">/</span> RESOURCES</div><h1>{detail.title}</h1><p className="page-subtitle">{detail.subtitle}</p></div>
        {detail.action && <button className="button button-primary" onClick={() => setShowCreateDialog(true)}><icons.Plus size={16} />{detail.action}</button>}
      </div>
      <div className="resource-summary">
        <div><span className="summary-icon"><Icon size={17} /></span><span><strong>{resourceCount} <small>{page === 'functions' ? 'functions' : page === 'executions' ? 'recorded executions' : 'log entries'}</small></strong><em>Data stored in this browser</em></span></div>
        <span className="simulator-notice"><icons.ShieldCheck size={15} />Local simulator · no cloud connection</span>
      </div>
      <section className="table-card resource-list-card">
        <div className="resource-toolbar">
          <label className="table-search"><icons.Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${page}...`} aria-label={`Search ${page}`} />{query && <button className="clear-search" onClick={() => setQuery('')} aria-label="Clear search"><icons.X size={14} /></button>}</label>
          <div className={`toolbar-right ${page === 'executions' ? 'execution-toolbar-right' : ''}`}>
            {page === 'functions' && <>
              <label className="select-control status-filter"><select value={runtime} onChange={(event) => setRuntime(event.target.value)} aria-label="Filter by runtime"><option>All runtimes</option>{[...new Set(functions.map((fn) => fn.runtime))].sort().map((item) => <option key={item}>{item}</option>)}</select><icons.ChevronDown size={14} /></label>
              <label className="select-control status-filter"><select value={functionStatus} onChange={(event) => setFunctionStatus(event.target.value)} aria-label="Filter function status"><option>All statuses</option><option>Active</option><option>Inactive</option></select><icons.ChevronDown size={14} /></label>
            </>}
            {page === 'executions' && <>
              <label className="select-control status-filter execution-function-filter"><icons.Braces size={13} /><select value={functionFilter} onChange={(event) => setFunctionFilter(event.target.value)} aria-label="Filter by function"><option value="All functions">All functions</option>{executionsByFunction.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><icons.ChevronDown size={14} /></label>
              <label className="select-control status-filter"><icons.Filter size={14} /><select value={executionStatus} onChange={(event) => setExecutionStatus(event.target.value)} aria-label="Filter execution status"><option>All statuses</option><option>SUCCESS</option><option>ERROR</option></select><icons.ChevronDown size={14} /></label>
              <label className="select-control status-filter execution-sort-filter"><select value={executionSort} onChange={(event) => setExecutionSort(event.target.value)} aria-label="Sort executions"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="duration-longest">Duration: longest</option><option value="duration-shortest">Duration: shortest</option></select><icons.ChevronDown size={14} /></label>
            </>}
            {page === 'logs' && <>
              <label className="select-control status-filter log-function-filter"><icons.Braces size={13} /><select value={logFunctionFilter} onChange={(event) => setLogFunctionFilter(event.target.value)} aria-label="Filter logs by function"><option value="All functions">All functions</option>{executionsByFunction.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><icons.ChevronDown size={14} /></label>
              <label className="select-control status-filter"><icons.Filter size={14} /><select value={logStatusFilter} onChange={(event) => setLogStatusFilter(event.target.value)} aria-label="Filter logs by invocation status"><option>All statuses</option><option>SUCCESS</option><option>ERROR</option></select><icons.ChevronDown size={14} /></label>
              <label className="select-control status-filter log-level-filter"><select value={logLevelFilter} onChange={(event) => setLogLevelFilter(event.target.value)} aria-label="Filter by log level"><option>All levels</option><option>INFO</option><option>WARN</option><option>ERROR</option></select><icons.ChevronDown size={14} /></label>
            </>}
          </div>
        </div>
        {page === 'functions' && <FunctionTable query={query} runtime={runtime} status={functionStatus} functions={functions} executions={executions} onOpenFunction={(id) => onNavigate('function-detail', id)} onEditFunction={setEditingFunction} onDeleteFunction={(fn) => { setDeleteError(''); setDeletingFunction(fn) }} />}
        {page === 'executions' && <ExecutionTable rows={visibleExecutions} functions={functions} onSelectExecution={setSelectedExecution} />}
        {page === 'logs' && <LogsTable rows={visibleLogs} onSelectExecution={setSelectedExecution} />}
        {page === 'executions' ? (
          <div className="table-pagination">
            <span>Showing <strong>{visibleCount ? `${(executionPage - 1) * pageSize + 1}–${Math.min(executionPage * pageSize, visibleCount)}` : '0'}</strong> of <strong>{visibleCount}</strong> invocations</span>
            <div><button className="icon-button pagination-button" aria-label="Previous page" onClick={() => setExecutionPage((current) => Math.max(1, current - 1))} disabled={executionPage <= 1}><icons.ChevronLeft size={16} /></button><span className="page-number">{executionPage} / {executionPageCount}</span><button className="icon-button pagination-button" aria-label="Next page" onClick={() => setExecutionPage((current) => Math.min(executionPageCount, current + 1))} disabled={executionPage >= executionPageCount}><icons.ChevronRight size={16} /></button></div>
          </div>
        ) : page === 'logs' ? (
          <div className="table-pagination">
            <span>Showing <strong>{visibleCount ? `${(logPage - 1) * logPageSize + 1}–${Math.min(logPage * logPageSize, visibleCount)}` : '0'}</strong> of <strong>{visibleCount}</strong> log entries</span>
            <div><button className="icon-button pagination-button" aria-label="Previous page" onClick={() => setLogPage((current) => Math.max(1, current - 1))} disabled={logPage <= 1}><icons.ChevronLeft size={16} /></button><span className="page-number">{logPage} / {logPageCount}</span><button className="icon-button pagination-button" aria-label="Next page" onClick={() => setLogPage((current) => Math.min(logPageCount, current + 1))} disabled={logPage >= logPageCount}><icons.ChevronRight size={16} /></button></div>
          </div>
        ) : <div className="table-pagination"><span>Showing <strong>{visibleCount ? `1–${visibleCount}` : '0'}</strong> of <strong>{visibleCount}</strong> matching {page}</span><div><button className="icon-button pagination-button" aria-label="Previous page" disabled><icons.ChevronLeft size={16} /></button><span className="page-number">1</span><button className="icon-button pagination-button" aria-label="Next page" disabled><icons.ChevronRight size={16} /></button></div></div>}
      </section>
      {showCreateDialog && <SimulatorActionDialog mode="create" defaultRuntime={settings.defaultRuntime} onClose={() => setShowCreateDialog(false)} onSubmit={submitCreate} />}
      {editingFunction && <SimulatorActionDialog key={`edit-${editingFunction.id}`} mode="edit" functionRecord={editingFunction} onClose={() => setEditingFunction(null)} onSubmit={submitEdit} />}
      {deletingFunction && (
        <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDeletingFunction(null)}>
          <section className="action-dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-function-title">
            <div className="dialog-heading"><span className="dialog-icon dialog-icon-danger"><icons.Trash2 size={18} /></span><div><h2 id="delete-function-title">Delete function?</h2><p>This will permanently remove <strong>{deletingFunction.name}</strong> from your functions. Its execution and log history will be retained.</p></div><button className="icon-button dialog-close" onClick={() => setDeletingFunction(null)} aria-label="Close dialog"><icons.X size={17} /></button></div>
            {deleteError && <div className="dialog-error" role="alert"><icons.CircleHelp size={15} />{deleteError}</div>}
            <div className="dialog-actions"><button className="button button-secondary" onClick={() => setDeletingFunction(null)}>Cancel</button><button className="button button-danger" onClick={confirmDelete}><icons.Trash2 size={14} />Delete function</button></div>
          </section>
        </div>
      )}
      {selectedExecution && <ExecutionDetailsDialog execution={selectedExecution} functions={functions} logs={logs} onClose={closeExecutionDetails} />}
    </>
  )
}
