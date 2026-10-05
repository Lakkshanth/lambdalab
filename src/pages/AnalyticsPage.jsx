import { useMemo, useState } from 'react'
import MetricCard from '../components/MetricCard.jsx'
import StatePanel from '../components/StatePanel.jsx'
import { useSimulation } from '../state/SimulationContext.jsx'
import { formatDuration } from '../data.js'
import { icons } from '../components/Icons.jsx'

const chartColors = ['#665dde', '#4c8de7', '#31a89b', '#dd9a45', '#b36bc0', '#d66b7a', '#5d9a77']
const numberFormat = new Intl.NumberFormat('en-US')

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function localDayOrdinal(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
}

function getTrendBuckets(executions, range) {
  const timestamps = executions.map((item) => new Date(item.startedAt).getTime()).filter(Number.isFinite)
  const now = new Date()
  const bounds = timestamps.reduce(
    (result, timestamp) => ({
      minimum: Math.min(result.minimum, timestamp),
      maximum: Math.max(result.maximum, timestamp),
    }),
    { minimum: Number.POSITIVE_INFINITY, maximum: Number.NEGATIVE_INFINITY },
  )
  const endDate = range === 'all' && timestamps.length ? new Date(bounds.maximum) : new Date(now)
  endDate.setHours(0, 0, 0, 0)
  const days = range === 'all' && timestamps.length
    ? Math.max(1, localDayOrdinal(endDate) - localDayOrdinal(new Date(bounds.minimum)) + 1)
    : range === 'all'
      ? 1
      : Number(range)
  const startDate = range === 'all' && timestamps.length
    ? new Date(bounds.minimum)
    : new Date(endDate)
  startDate.setHours(0, 0, 0, 0)
  if (range !== 'all') startDate.setDate(endDate.getDate() - days + 1)
  const bucketSize = days > 45 ? 7 : 1
  const bucketCount = Math.ceil(days / bucketSize)
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index * bucketSize)
    return { date, label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), success: 0, failed: 0 }
  })
  const firstBucketOrdinal = buckets[0] ? localDayOrdinal(buckets[0].date) : 0
  for (const execution of executions) {
    const date = new Date(execution.startedAt)
    if (!Number.isFinite(date.getTime())) continue
    const bucketIndex = Math.floor((localDayOrdinal(date) - firstBucketOrdinal) / bucketSize)
    const bucket = buckets[bucketIndex]
    if (bucket) bucket[execution.status === 'ERROR' || execution.status === 'Failed' ? 'failed' : 'success'] += 1
  }
  return buckets
}

function ChartHeading({ title, subtitle, detail }) {
  return (
    <div className="chart-title-row">
      <div><h3>{title}</h3><p>{subtitle}</p></div>
      {detail && <span className="chart-period-chip">{detail}</span>}
    </div>
  )
}

function InvocationTrendChart({ buckets }) {
  if (!buckets.length || !buckets.some((bucket) => bucket.success + bucket.failed > 0)) {
    return <section className="chart-card observability-chart"><ChartHeading title="Invocation trend over time" subtitle="Successful and failed invocations by time bucket" /><StatePanel state="empty" title="Not enough execution data" detail="Invoke a function in the selected date range to see the trend." /></section>
  }
  const maximum = Math.max(1, ...buckets.map((item) => item.success + item.failed))
  return (
    <section className="chart-card observability-chart observability-trend">
      <ChartHeading title="Invocation trend over time" subtitle="Successful and failed invocations by time bucket" detail={buckets.length > 1 ? `${buckets.length} buckets` : '1 bucket'} />
      <div className="chart-legend"><span><i className="legend-dot legend-success" />Success</span><span><i className="legend-dot legend-failed" />Failed</span></div>
      <div className="observability-trend-chart">
        <div className="observability-y-axis"><span>{maximum}</span><span>{Math.ceil(maximum / 2)}</span><span>0</span></div>
        <div className="observability-trend-grid">
          {[0, 1, 2].map((line) => <i key={line} />)}
          {buckets.map((bucket, index) => (
            <div className="observability-trend-column" key={`${dateKey(bucket.date)}-${index}`} title={`${bucket.label}: ${bucket.success} success · ${bucket.failed} failed`}>
              <div className="observability-stacked-bar">
                <i className="observability-success-bar" style={{ height: `${(bucket.success / maximum) * 100}%` }} />
                <i className="observability-failed-bar" style={{ height: `${(bucket.failed / maximum) * 100}%` }} />
              </div>
              <span>{bucket.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function OutcomeChart({ success, failed, total }) {
  if (!total) {
    return <section className="chart-card observability-chart"><ChartHeading title="Success vs failure" subtitle="Outcome distribution for matching invocations" /><StatePanel state="empty" title="No outcome data" detail="There are no matching executions to compare." /></section>
  }
  const successShare = (success / total) * 100
  const failedShare = (failed / total) * 100
  return (
    <section className="chart-card observability-chart">
      <ChartHeading title="Success vs failure" subtitle="Outcome distribution for matching invocations" />
      <div className="outcome-chart-content">
        <div className="outcome-donut" style={{ background: `conic-gradient(#5aab88 0 ${successShare}%, #e47780 ${successShare}% 100%)` }} role="img" aria-label={`${successShare.toFixed(1)} percent successful, ${failedShare.toFixed(1)} percent failed`}>
          <div><strong>{successShare.toFixed(1)}%</strong><span>success</span></div>
        </div>
        <div className="outcome-legend">
          <div><i className="outcome-success-swatch" /><span>Successful</span><strong>{numberFormat.format(success)}</strong></div>
          <div><i className="outcome-failed-swatch" /><span>Failed</span><strong>{numberFormat.format(failed)}</strong></div>
          <div className="outcome-total-row"><span>Total invocations</span><strong>{numberFormat.format(total)}</strong></div>
        </div>
      </div>
    </section>
  )
}

function DistributionChart({ title, subtitle, rows, valueLabel, emptyDetail, formatValue = numberFormat.format }) {
  const maximum = Math.max(1, ...rows.map((row) => row.value))
  return (
    <section className="chart-card observability-chart observability-distribution">
      <ChartHeading title={title} subtitle={subtitle} />
      {rows.length ? (
        <div className="distribution-list">
          {rows.map((row, index) => (
            <div className="distribution-row" key={row.name}>
              <div className="distribution-label"><span title={row.name}>{row.name}</span><strong>{formatValue(row.value)}{valueLabel ? ` ${valueLabel}` : ''}</strong></div>
              <div className="distribution-track"><i style={{ width: `${Math.max(row.value > 0 ? 2 : 0, (row.value / maximum) * 100)}%`, background: row.color ?? chartColors[index % chartColors.length] }} /></div>
            </div>
          ))}
        </div>
      ) : <StatePanel state="empty" title="Not enough execution data" detail={emptyDetail} />}
    </section>
  )
}

export default function AnalyticsPage() {
  const { functions, executions } = useSimulation()
  const [functionFilter, setFunctionFilter] = useState('all')
  const [runtimeFilter, setRuntimeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('30')

  const records = useMemo(() => {
    const functionMap = new Map(functions.map((fn) => [fn.id, fn]))
    const now = Date.now()
    const startTime = dateRange === 'all' ? Number.NEGATIVE_INFINITY : now - Number(dateRange) * 86_400_000
    return executions.map((execution) => {
      const fn = functionMap.get(execution.functionId)
      return {
        ...execution,
        runtime: execution.runtime ?? fn?.runtime ?? 'Unknown runtime',
        functionName: execution.functionName ?? fn?.name ?? 'Deleted function',
        durationMs: Number.isFinite(execution.durationMs) && execution.durationMs >= 0 ? execution.durationMs : null,
      }
    }).filter((execution) => {
      const timestamp = new Date(execution.startedAt).getTime()
      return (functionFilter === 'all' || execution.functionId === functionFilter) &&
        (runtimeFilter === 'all' || execution.runtime === runtimeFilter) &&
        (statusFilter === 'all' || execution.status === statusFilter) &&
        Number.isFinite(timestamp) &&
        (dateRange === 'all' || timestamp >= startTime && timestamp <= now)
    })
  }, [functions, executions, functionFilter, runtimeFilter, statusFilter, dateRange])

  const analytics = useMemo(() => {
    const total = records.length
    const successful = records.filter((item) => item.status === 'SUCCESS' || item.status === 'Success').length
    const failed = records.filter((item) => item.status === 'ERROR' || item.status === 'Failed').length
    const completedRecords = records.filter((item) =>
      Number.isFinite(Date.parse(item.completedAt)) &&
      Number.isFinite(item.durationMs) &&
      item.durationMs >= 0,
    )
    const durations = completedRecords.map((item) => item.durationMs)
    const durationTotal = durations.reduce((sum, duration) => sum + duration, 0)
    const executionsByFunction = new Map()
    const executionsByRuntime = new Map()
    for (const fn of functions) {
      if ((functionFilter === 'all' || fn.id === functionFilter) &&
        (runtimeFilter === 'all' || fn.runtime === runtimeFilter)) {
        executionsByFunction.set(fn.id, {
          id: fn.id,
          name: fn.name,
          count: 0,
          durationTotal: 0,
          durationCount: 0,
        })
      }
    }
    for (const execution of records) {
      const current = executionsByFunction.get(execution.functionId) ?? {
        id: execution.functionId,
        name: execution.functionName,
        count: 0,
        durationTotal: 0,
        durationCount: 0,
      }
      current.count += 1
      if (Number.isFinite(Date.parse(execution.completedAt)) &&
        Number.isFinite(execution.durationMs) &&
        execution.durationMs >= 0) {
        current.durationTotal += execution.durationMs
        current.durationCount += 1
      }
      executionsByFunction.set(execution.functionId, current)
      executionsByRuntime.set(execution.runtime, (executionsByRuntime.get(execution.runtime) ?? 0) + 1)
    }
    const functionsByCount = [...executionsByFunction.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    const mostInvoked = records.length ? functionsByCount.find((item) => item.count > 0) ?? null : null
    return {
      total,
      successful,
      failed,
      completedCount: durations.length,
      successRate: total ? (successful / total) * 100 : 0,
      errorRate: total ? (failed / total) * 100 : 0,
      averageDuration: durations.length ? durationTotal / durations.length : 0,
      minimumDuration: durations.length
        ? durations.reduce((minimum, duration) => Math.min(minimum, duration), Number.POSITIVE_INFINITY)
        : 0,
      maximumDuration: durations.length
        ? durations.reduce((maximum, duration) => Math.max(maximum, duration), Number.NEGATIVE_INFINITY)
        : 0,
      mostInvoked,
      functionsByCount,
      runtimes: [...executionsByRuntime.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)),
      averageByFunction: functionsByCount
        .filter((item) => item.durationCount > 0)
        .map((item) => ({ name: item.name, value: item.durationTotal / item.durationCount }))
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)),
      trend: getTrendBuckets(records, dateRange),
    }
  }, [records, dateRange, functions, functionFilter, runtimeFilter])

  const runtimeOptions = [...new Set(executions.map((execution) =>
    execution.runtime ?? functions.find((fn) => fn.id === execution.functionId)?.runtime ?? 'Unknown runtime',
  ))].sort()
  const functionOptions = [...new Map(executions.map((execution) => [
    execution.functionId,
    execution.functionName ?? functions.find((fn) => fn.id === execution.functionId)?.name ?? 'Deleted function',
  ])).entries()].sort((a, b) => a[1].localeCompare(b[1]))
  const dateRangeLabel = dateRange === 'all' ? 'All time' : `Last ${dateRange} days`
  const metrics = [
    { label: 'Total invocations', value: numberFormat.format(analytics.total), caption: 'Matching executions', icon: 'Zap' },
    { label: 'Successful invocations', value: numberFormat.format(analytics.successful), caption: 'Matching executions', icon: 'ShieldCheck' },
    { label: 'Failed invocations', value: numberFormat.format(analytics.failed), caption: 'Matching executions', icon: 'Activity', tone: 'danger' },
    { label: 'Success rate', value: analytics.total ? `${analytics.successRate.toFixed(1)}%` : '—', caption: 'Of matching invocations', icon: 'ChartNoAxesCombined' },
    { label: 'Error rate', value: analytics.total ? `${analytics.errorRate.toFixed(1)}%` : '—', caption: 'Of matching invocations', icon: 'CircleHelp', tone: 'danger' },
    { label: 'Average duration', value: analytics.completedCount ? formatDuration(analytics.averageDuration) : '—', caption: 'Across completed executions', icon: 'Clock3' },
    { label: 'Minimum duration', value: analytics.completedCount ? formatDuration(analytics.minimumDuration) : '—', caption: 'Fastest completed execution', icon: 'ArrowDownRight' },
    { label: 'Maximum duration', value: analytics.completedCount ? formatDuration(analytics.maximumDuration) : '—', caption: 'Slowest completed execution', icon: 'ArrowUpRight' },
  ]

  return (
    <>
      <div className="page-title-row analytics-title-row">
        <div><div className="eyebrow">SIMULATOR WORKSPACE <span className="eyebrow-slash">/</span> OBSERVABILITY</div><h1>Lambda Observability</h1><p className="page-subtitle">Analyze invocation health, runtime performance, and function activity from recorded simulator executions.</p></div>
        <span className="simulator-notice"><icons.ShieldCheck size={15} />Local execution data · no AWS connection</span>
      </div>

      <section className="analytics-filter-panel" aria-label="Analytics filters">
        <span className="analytics-filter-label"><icons.Filter size={14} />Filter execution history</span>
        <label className="select-control analytics-filter-select"><span>Function</span><select value={functionFilter} onChange={(event) => setFunctionFilter(event.target.value)} aria-label="Filter analytics by function"><option value="all">All functions</option>{functionOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><icons.ChevronDown size={14} /></label>
        <label className="select-control analytics-filter-select"><span>Runtime</span><select value={runtimeFilter} onChange={(event) => setRuntimeFilter(event.target.value)} aria-label="Filter analytics by runtime"><option value="all">All runtimes</option>{runtimeOptions.map((runtime) => <option key={runtime} value={runtime}>{runtime}</option>)}</select><icons.ChevronDown size={14} /></label>
        <label className="select-control analytics-filter-select"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter analytics by status"><option value="all">All statuses</option><option value="SUCCESS">SUCCESS</option><option value="ERROR">ERROR</option></select><icons.ChevronDown size={14} /></label>
        <label className="select-control analytics-filter-select"><span>Date range</span><select value={dateRange} onChange={(event) => setDateRange(event.target.value)} aria-label="Filter analytics by date range"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option></select><icons.ChevronDown size={14} /></label>
        <span className="analytics-filter-count">{numberFormat.format(analytics.total)} executions · {dateRangeLabel}</span>
      </section>

      <section className="metrics-grid analytics-observability-metrics" aria-label="Execution metrics">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="analytics-top-function" aria-label="Most frequently invoked function">
        <span className="analytics-top-function-icon"><icons.Zap size={16} /></span>
        <span><small>MOST FREQUENTLY INVOKED</small><strong>{analytics.mostInvoked?.name ?? 'No matching function activity'}</strong></span>
        <span className="analytics-top-function-count">{analytics.mostInvoked ? `${numberFormat.format(analytics.mostInvoked.count)} invocations` : 'No executions in this date range'}</span>
      </section>

      <div className="analytics-primary-grid">
        <InvocationTrendChart buckets={analytics.trend} />
        <OutcomeChart success={analytics.successful} failed={analytics.failed} total={analytics.total} />
      </div>

      <div className="analytics-secondary-grid">
        <DistributionChart title="Runtime distribution" subtitle="Execution count by runtime" rows={analytics.runtimes} emptyDetail="Runtime data appears when functions have recorded executions." />
        <DistributionChart title="Invocations by function" subtitle="Execution count for each function" rows={analytics.functionsByCount.filter((item) => item.count > 0).map((item) => ({ name: item.name, value: item.count }))} emptyDetail="Invoke a function to see function-level activity." />
        <DistributionChart title="Average runtime by function" subtitle="Mean simulated duration for each function" rows={analytics.averageByFunction} valueLabel="avg" formatValue={(value) => formatDuration(value)} emptyDetail="Average runtimes appear after functions have completed executions." />
      </div>

      <section className="table-card analytics-function-table-card">
        <div className="section-heading"><div><h2>Executions by function</h2><p>Function counts and mean duration for the selected filters</p></div><span className="chart-period-chip">{analytics.functionsByCount.length} functions</span></div>
        {analytics.functionsByCount.length ? (
          <div className="table-scroll">
            <table className="resource-table">
              <thead><tr><th>FUNCTION</th><th>INVOCATIONS</th><th>SUCCESSFUL</th><th>FAILED</th><th>AVG. DURATION</th></tr></thead>
              <tbody>{analytics.functionsByCount.map((item) => {
                const functionExecutions = records.filter((execution) => execution.functionId === item.id)
                const functionSuccessful = functionExecutions.filter((execution) => execution.status === 'SUCCESS' || execution.status === 'Success').length
                const failures = functionExecutions.filter((execution) => execution.status === 'ERROR' || execution.status === 'Failed').length
                return <tr key={item.id}><td><strong className="table-strong">{item.name}</strong></td><td className="mono-cell">{numberFormat.format(item.count)}</td><td className="mono-cell">{numberFormat.format(functionSuccessful)}</td><td className="mono-cell">{numberFormat.format(failures)}</td><td className="mono-cell">{item.durationCount ? formatDuration(item.durationTotal / item.durationCount) : '—'}</td></tr>
              })}</tbody>
            </table>
          </div>
        ) : <StatePanel state="empty" title="No function analytics" detail="No executions match these filters. Widen the date range or invoke a function." />}
      </section>

      <div className="analytics-observability-note"><icons.ShieldCheck size={14} />All metrics and charts are calculated from LambdaLab execution history. Function source is not executed, and no AWS services are connected.</div>
    </>
  )
}
