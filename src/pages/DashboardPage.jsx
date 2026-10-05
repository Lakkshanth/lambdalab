import { useMemo, useState } from 'react'
import { formatDuration, formatTime } from '../data.js'
import { useSimulation } from '../state/SimulationContext.jsx'
import MetricCard from '../components/MetricCard.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import StatePanel from '../components/StatePanel.jsx'
import SimulatorActionDialog from '../components/SimulatorActionDialog.jsx'
import { icons } from '../components/Icons.jsx'

const runtimeColors = ['#665dde', '#4c8de7', '#31a89b', '#dd9a45', '#b36bc0']
const numberFormat = new Intl.NumberFormat('en-US')

function localDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDashboardData(functions, executions) {
  const now = new Date()
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setHours(0, 0, 0, 0)
    date.setDate(now.getDate() - (6 - index))
    return date
  })
  const firstDay = dates[0].getTime()
  const lastDay = new Date(dates[6]).setDate(dates[6].getDate() + 1)
  const recent = executions.filter((execution) => {
    const timestamp = new Date(execution.startedAt).getTime()
    return timestamp >= firstDay && timestamp < lastDay
  })
  const successful = executions.filter((execution) => execution.status === 'SUCCESS' || execution.status === 'Success')
  const failed = executions.filter((execution) => execution.status === 'ERROR' || execution.status === 'Failed')
  const completedExecutions = executions.filter((execution) =>
    Number.isFinite(Date.parse(execution.completedAt)) &&
    Number.isFinite(execution.durationMs) &&
    execution.durationMs >= 0,
  )
  const durationTotal = completedExecutions.reduce((total, execution) => total + execution.durationMs, 0)
  const functionCounts = new Map(functions.map((fn) => [fn.id, 0]))
  const dayCounts = new Map(dates.map((date) => [localDateKey(date), { success: 0, failed: 0 }]))

  for (const execution of recent) {
    functionCounts.set(execution.functionId, (functionCounts.get(execution.functionId) ?? 0) + 1)
    const day = dayCounts.get(localDateKey(new Date(execution.startedAt)))
    if (day) day[execution.status === 'ERROR' || execution.status === 'Failed' ? 'failed' : 'success'] += 1
  }

  const runtimeByFunctionId = new Map(functions.map((fn) => [fn.id, fn.runtime]))
  const runtimes = [...new Set(executions.map((execution) =>
    execution.runtime ?? runtimeByFunctionId.get(execution.functionId),
  ).filter(Boolean))]
  const runtimeTrends = runtimes.map((runtime, runtimeIndex) => {
    const values = dates.map((date) => {
      const dayKey = localDateKey(date)
      const dayRuns = recent.filter(
        (execution) =>
          (execution.runtime ?? runtimeByFunctionId.get(execution.functionId)) === runtime &&
          Number.isFinite(Date.parse(execution.completedAt)) &&
          Number.isFinite(execution.durationMs) &&
          execution.durationMs >= 0 &&
          localDateKey(new Date(execution.startedAt)) === dayKey,
      )
      if (!dayRuns.length) return 0
      return dayRuns.reduce((sum, execution) => sum + execution.durationMs, 0) / dayRuns.length
    })
    return { name: runtime, values, color: runtimeColors[runtimeIndex % runtimeColors.length] }
  })

  const recentFailedCount = recent.filter((execution) => execution.status === 'ERROR' || execution.status === 'Failed').length

  return {
    recent: [...recent].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)),
    successful,
    failed,
    completedExecutionCount: completedExecutions.length,
    averageRuntime: completedExecutions.length ? durationTotal / completedExecutions.length : 0,
    successRate: executions.length ? (successful.length / executions.length) * 100 : 0,
    recentFailedCount,
    dayCounts: dates.map((date) => ({
      date,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      ...(dayCounts.get(localDateKey(date)) ?? { success: 0, failed: 0 }),
    })),
    functionActivity: [...functions]
      .map((fn) => ({ ...fn, invocationCount: functionCounts.get(fn.id) ?? 0 }))
      .sort((a, b) => b.invocationCount - a.invocationCount || a.name.localeCompare(b.name)),
    runtimeTrends,
    recentErrors: recent
      .filter((execution) => execution.status === 'ERROR' || execution.status === 'Failed')
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      .slice(0, 4),
  }
}

function SectionHeading({ title, subtitle, action }) {
  return (
    <div className="section-heading">
      <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      {action}
    </div>
  )
}

function InvocationChart({ data }) {
  const max = Math.max(1, ...data.map(({ success, failed }) => success + failed))
  return (
    <section className="chart-card dashboard-chart-card">
      <div className="chart-title-row">
        <div><h3>Invocation outcomes</h3><p>Successful and failed runs over the last 7 days</p></div>
        <span className="chart-period-chip">7 days</span>
      </div>
      <div className="chart-legend">
        <span><i className="legend-dot legend-success" />Successful</span>
        <span><i className="legend-dot legend-failed" />Failed</span>
      </div>
      {!data.some(({ success, failed }) => success + failed > 0) ? (
        <StatePanel state="empty" title="No invocations yet" detail="Invoke a function to start building your execution history." />
      ) : (
        <div className="bar-chart dashboard-bar-chart" role="img" aria-label="Daily successful and failed function invocations for the last seven days">
          <div className="chart-grid">
            {[1, 0.75, 0.5, 0.25, 0].map((ratio) => {
              const tick = Math.ceil(max * ratio)
              return <div className="grid-line" key={ratio}><span>{numberFormat.format(tick)}</span><i /></div>
            })}
          </div>
          <div className="bars">
            {data.map(({ label, success, failed, date }) => (
              <div className="bar-column" key={localDateKey(date)}>
                <div className="bar-stack" title={`${success} successful · ${failed} failed`}>
                  <span className="bar-success" style={{ height: `${(success / max) * 100}%` }} />
                  <span className="bar-failed" style={{ height: `${(failed / max) * 100}%` }} />
                </div>
                <span className="bar-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function RuntimeTrendChart({ trends, dayCounts }) {
  const allValues = trends.flatMap((trend) => trend.values).filter((value) => value > 0)
  const maximum = Math.max(1, ...allValues) * 1.15
  const minimum = 0
  const pointY = (value) => 94 - ((value - minimum) / (maximum - minimum)) * 84

  return (
    <section className="chart-card dashboard-chart-card runtime-trend-card">
      <div className="chart-title-row">
        <div><h3>Runtime trend</h3><p>Average execution time by runtime</p></div>
        <span className="chart-period-chip">7 days</span>
      </div>
      <div className="runtime-trend-legend">
        {trends.map((trend) => <span key={trend.name}><i style={{ background: trend.color }} />{trend.name}</span>)}
      </div>
      {allValues.length === 0 ? (
        <StatePanel state="empty" title="No runtime data yet" detail="Runtime trends will appear after a function is invoked." />
      ) : (
        <>
          <div className="runtime-line-chart" role="img" aria-label="Average execution duration by runtime for the last seven days">
            <div className="runtime-chart-ylabels"><span>{formatDuration(maximum)}</span><span>{formatDuration(maximum / 2)}</span><span>0 ms</span></div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {[10, 52, 94].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} className="runtime-grid-line" />)}
              {trends.map((trend) => {
                const points = trend.values.map((value, index) => `${(index / Math.max(1, trend.values.length - 1)) * 100},${pointY(value)}`).join(' ')
                return <g key={trend.name}>
                  <polyline points={points} fill="none" stroke={trend.color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
                  {trend.values.map((value, index) => (
                    <circle key={`${trend.name}-${index}`} cx={(index / Math.max(1, trend.values.length - 1)) * 100} cy={pointY(value)} r="1.8" fill="white" stroke={trend.color} strokeWidth="1.4" vectorEffect="non-scaling-stroke">
                      <title>{`${trend.name}: ${formatDuration(value)}`}</title>
                    </circle>
                  ))}
                </g>
              })}
            </svg>
          </div>
          <div className="runtime-chart-xlabels">{dayCounts.map(({ date, label }) => <span key={localDateKey(date)}>{label}</span>)}</div>
        </>
      )}
    </section>
  )
}

function FunctionActivity({ items, onNavigate }) {
  const max = Math.max(1, ...items.map((fn) => fn.invocationCount))
  if (!items.length) return <StatePanel state="empty" title="No functions yet" detail="Create a function to see its activity." />
  return (
    <div className="function-activity-list">
      {items.slice(0, 5).map((fn) => (
        <button className="activity-function-row" key={fn.id} onClick={() => onNavigate('functions')}>
          <span className={`function-avatar function-${fn.color}`}>{fn.initials}</span>
          <span className="activity-function-detail">
            <span className="activity-function-label"><strong>{fn.name}</strong><small>{numberFormat.format(fn.invocationCount)}</small></span>
            <span className="activity-meter"><i style={{ width: `${fn.invocationCount ? Math.max(4, (fn.invocationCount / max) * 100) : 0}%` }} /></span>
          </span>
        </button>
      ))}
    </div>
  )
}

function RecentErrors({ errors, onNavigate }) {
  if (!errors.length) {
    return (
      <div className="no-recent-errors">
        <span className="error-clear-icon"><icons.Check size={15} /></span>
        <span><strong>No recent errors</strong><small>There are no failed invocations in this period.</small></span>
      </div>
    )
  }
  return (
    <div className="recent-errors-list">
      {errors.map((execution) => (
        <button className="recent-error-row" key={execution.id} onClick={() => onNavigate('executions')}>
          <span className="error-row-icon"><icons.Activity size={14} /></span>
          <span className="error-row-copy"><strong>{execution.functionName}</strong><small>{execution.error ?? 'Invocation failed'}</small></span>
          <span className="error-row-time">{formatTime(execution.startedAt)}</span>
        </button>
      ))}
    </div>
  )
}

function GettingStarted({ onNavigate, onCreateFunction, onInvokeFunction }) {
  const steps = [
    { icon: 'Braces', title: 'Create a function', detail: 'Choose a runtime and a controlled simulation behavior.' },
    { icon: 'FileCode2', title: 'Configure a test event', detail: 'Add a named JSON event to use as invocation input.' },
    { icon: 'Zap', title: 'Invoke the function', detail: 'Run a safe simulated invocation and inspect its result.' },
    { icon: 'ScrollText', title: 'Review execution logs', detail: 'Follow the generated lifecycle and error log entries.' },
    { icon: 'ChartNoAxesCombined', title: 'Analyze performance', detail: 'Explore duration, outcomes, and function activity.' },
  ]

  return (
    <section className="getting-started-card" aria-labelledby="getting-started-title">
      <div className="getting-started-heading">
        <div>
          <span className="eyebrow">QUICK START</span>
          <h2 id="getting-started-title">Getting started</h2>
          <p>Follow the function lifecycle from setup through observability.</p>
        </div>
        <span className="getting-started-count">5 steps</span>
      </div>
      <ol className="getting-started-steps">
        {steps.map(({ icon, title, detail }, index) => {
          const Icon = icons[icon]
          return (
            <li className="getting-started-step" key={title}>
              <span className="getting-started-step-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="getting-started-step-icon"><Icon size={17} /></span>
              <span className="getting-started-step-copy"><strong>{title}</strong><small>{detail}</small></span>
              {index === 0 && <button className="text-button getting-started-step-action" onClick={onCreateFunction}>Create <icons.ArrowRight size={13} /></button>}
              {index === 1 && <button className="text-button getting-started-step-action" onClick={() => onNavigate('functions')}>Functions <icons.ArrowRight size={13} /></button>}
              {index === 2 && <button className="text-button getting-started-step-action" onClick={onInvokeFunction}>Invoke <icons.ArrowRight size={13} /></button>}
              {index === 3 && <button className="text-button getting-started-step-action" onClick={() => onNavigate('logs')}>Logs <icons.ArrowRight size={13} /></button>}
              {index === 4 && <button className="text-button getting-started-step-action" onClick={() => onNavigate('analytics')}>Analytics <icons.ArrowRight size={13} /></button>}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default function DashboardPage({ onNavigate, onToast }) {
  const { functions, executions, settings, createFunction, invokeFunction } = useSimulation()
  const [actionMode, setActionMode] = useState(null)
  const dashboard = useMemo(() => getDashboardData(functions, executions), [functions, executions])
  const maxFunctionActivity = Math.max(0, ...dashboard.functionActivity.map((fn) => fn.invocationCount))

  function submitCreate(input) {
    const fn = createFunction(input)
    onToast(`Function “${fn.name}” created`)
  }

  async function submitInvocation({ functionId, event }) {
    const execution = await invokeFunction(functionId, event)
    onToast(`${execution.status === 'SUCCESS' || execution.status === 'Success' ? 'Invocation succeeded' : 'Invocation failed'} · ${formatDuration(execution.durationMs)}`)
  }

  const summaryCards = [
    { label: 'Total functions', value: numberFormat.format(functions.length), caption: 'In this workspace', icon: 'Braces' },
    { label: 'Total invocations', value: numberFormat.format(executions.length), caption: 'All recorded runs', icon: 'Zap' },
    { label: 'Successful invocations', value: numberFormat.format(dashboard.successful.length), caption: 'All recorded runs', icon: 'ShieldCheck' },
    { label: 'Failed invocations', value: numberFormat.format(dashboard.failed.length), caption: 'All recorded runs', icon: 'Activity', tone: 'danger' },
    { label: 'Success rate', value: `${dashboard.successRate.toFixed(1)}%`, caption: 'All recorded runs', icon: 'ChartNoAxesCombined' },
    { label: 'Average runtime', value: dashboard.completedExecutionCount ? formatDuration(dashboard.averageRuntime) : '—', caption: 'Completed simulated runs', icon: 'Clock3' },
  ]

  return (
    <>
      <div className="page-title-row dashboard-title-row">
        <div>
          <div className="eyebrow"><span className="live-indicator" />AWS LAMBDA SIMULATOR</div>
          <h1>Serverless Functions</h1>
          <p className="page-subtitle">Manage, test and monitor your simulated Lambda functions.</p>
        </div>
        <div className="dashboard-quick-actions">
          <button className="button button-primary" onClick={() => setActionMode('create')}><icons.Plus size={16} />Create Function</button>
          <button className="button button-secondary" onClick={() => setActionMode('invoke')}><icons.Zap size={15} />Invoke Function</button>
          <button className="button button-secondary" onClick={() => onNavigate('analytics')}><icons.ChartNoAxesCombined size={15} />View Analytics</button>
        </div>
      </div>

      {functions.length === 0 ? (
        <>
          <section className="dashboard-first-run" aria-labelledby="dashboard-first-run-title">
            <span className="dashboard-first-run-icon"><icons.Braces size={23} /></span>
            <div className="dashboard-first-run-copy">
              <span className="eyebrow">WORKSPACE READY</span>
              <h2 id="dashboard-first-run-title">No functions yet</h2>
              <p>Create your first simulated Lambda function to start testing events and reviewing execution data.</p>
            </div>
            <button className="button button-primary" onClick={() => setActionMode('create')}><icons.Plus size={16} />Create your first function</button>
          </section>
          <GettingStarted
            onNavigate={onNavigate}
            onCreateFunction={() => setActionMode('create')}
            onInvokeFunction={() => setActionMode('invoke')}
          />
        </>
      ) : (
        <>
      <div className="metrics-grid dashboard-metrics-grid">
        {summaryCards.map((card) => <MetricCard key={card.label} {...card} />)}
      </div>

      <section className="dashboard-charts">
        <InvocationChart data={dashboard.dayCounts} />
        <RuntimeTrendChart trends={dashboard.runtimeTrends} dayCounts={dashboard.dayCounts} />
      </section>

      <section className="dashboard-overview-grid">
        <div className="table-card dashboard-recent-card">
          <SectionHeading
            title="Recent executions"
            subtitle="Latest function invocations in this workspace"
            action={<button className="text-button" onClick={() => onNavigate('executions')}>View executions <icons.ArrowRight size={14} /></button>}
          />
          {dashboard.recent.length ? (
            <div className="table-scroll">
              <table>
                <thead><tr><th>FUNCTION</th><th>STATUS</th><th>DURATION</th><th>TRIGGER</th><th>STARTED</th></tr></thead>
                <tbody>
                  {dashboard.recent.slice(0, 6).map((execution) => (
                    <tr key={execution.id}>
                      <td><span className="function-cell"><span className="table-function-icon"><icons.Braces size={15} /></span><span><strong>{execution.functionName}</strong><small>{execution.id}</small></span></span></td>
                      <td><StatusBadge>{execution.status}</StatusBadge></td>
                      <td className="mono-cell">{formatDuration(execution.durationMs)}</td>
                      <td>{execution.testEventName ? `${execution.trigger}: ${execution.testEventName}` : execution.trigger}</td>
                      <td className="time-cell">{formatTime(execution.startedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <StatePanel state="empty" title="No executions yet" detail="Invoke a function to see its result and duration here." action={<button className="button button-primary dashboard-empty-action" onClick={() => setActionMode('invoke')}><icons.Zap size={14} />Invoke function</button>} />}
        </div>

        <div className="dashboard-side-stack">
          <section className="functions-card dashboard-activity-card">
            <SectionHeading
              title="Function activity"
              subtitle="Invocations by function · 7 days"
              action={<button className="text-button" onClick={() => onNavigate('functions')}>All functions <icons.ArrowRight size={13} /></button>}
            />
            <FunctionActivity items={dashboard.functionActivity} onNavigate={onNavigate} />
            {maxFunctionActivity === 0 && dashboard.functionActivity.length > 0 && <div className="activity-empty-hint">Invoke a function to start tracking activity.</div>}
          </section>
          <section className="functions-card dashboard-errors-card">
            <SectionHeading
              title="Recent errors"
              subtitle={`${dashboard.recentFailedCount} failed in the last 7 days`}
              action={<button className="text-button" onClick={() => onNavigate('executions')}>View all <icons.ArrowRight size={13} /></button>}
            />
            <RecentErrors errors={dashboard.recentErrors} onNavigate={onNavigate} />
          </section>
        </div>
      </section>

      <div className="dashboard-bottom-actions">
        <span><icons.ShieldCheck size={14} />Data is stored in this browser. No AWS services are connected.</span>
        <button className="button button-secondary button-compact" onClick={() => onNavigate('executions')}>View executions <icons.ArrowRight size={14} /></button>
      </div>
        </>
      )}

      {actionMode && (
        <SimulatorActionDialog
          mode={actionMode}
          functions={functions}
          defaultRuntime={settings.defaultRuntime}
          onClose={() => setActionMode(null)}
          onSubmit={actionMode === 'create' ? submitCreate : submitInvocation}
        />
      )}
    </>
  )
}
