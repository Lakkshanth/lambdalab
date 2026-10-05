export const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'functions', label: 'Functions', icon: 'Braces' },
  { id: 'executions', label: 'Executions', icon: 'Activity' },
  { id: 'analytics', label: 'Analytics', icon: 'ChartNoAxesCombined' },
  { id: 'logs', label: 'Logs', icon: 'ScrollText' },
]

export const runtimeOptions = [
  'Python 3.13',
  'Python 3.12',
  'Python 3.11',
  'Node.js 22.x',
  'Node.js 20.x',
  'Java 21',
  'Java 17',
]

export const functionBehaviorOptions = [
  { id: 'hello-world', label: 'Hello World', description: 'Return a greeting for the supplied name.' },
  { id: 'calculator', label: 'Calculator', description: 'Add finite numeric a and b values.' },
  { id: 'text-analyzer', label: 'Text Analyzer', description: 'Count characters and words in text.' },
  { id: 'json-processor', label: 'JSON Processor', description: 'Select named fields from an input data object.' },
]

export function getBehaviorExampleEvent(behavior) {
  if (behavior === 'calculator') return { a: 10, b: 20 }
  if (behavior === 'text-analyzer') return { text: 'AWS Lambda is serverless' }
  if (behavior === 'json-processor') {
    return { data: { id: 1, name: 'VIT Chennai', status: 'active' }, fields: ['id', 'name'] }
  }
  return { name: 'VIT Chennai' }
}

export function getStarterTemplate(runtime) {
  if (runtime.startsWith('Python')) {
    return {
      handler: 'app.lambda_handler',
      code: 'def lambda_handler(event, context):\n    name = event.get("name", "World")\n    return {\n        "message": f"Hello, {name}!"\n    }',
    }
  }
  if (runtime.startsWith('Java')) {
    return {
      handler: 'com.example.Handler::handleRequest',
      code: 'public class Handler {\n    // Simulated Lambda handler template\n    public Object handleRequest(Object event, Object context) {\n        return "{\\"message\\": \\"Hello, World!\\"}";\n    }\n}',
    }
  }
  return {
    handler: 'index.handler',
    code: 'exports.handler = async (event) => {\n  const name = event.name || "World";\n\n  return {\n    message: `Hello, ${name}!`\n  };\n};',
  }
}

function createExampleTestEvents(functionId, behavior = 'hello-world', now = new Date().toISOString()) {
  const example = getBehaviorExampleEvent(behavior)
  const behaviorName = functionBehaviorOptions.find((item) => item.id === behavior)?.label ?? 'Hello World'
  return [
    {
      id: `event-${functionId}-${behavior}`,
      functionId,
      name: `${behaviorName} example`,
      event: example,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `event-${functionId}-simulated-error`,
      functionId,
      name: 'Simulated error',
      event: { ...example, simulateError: true },
      createdAt: now,
      updatedAt: now,
    },
  ]
}

export function createInitialState() {
  return {
    schemaVersion: 9,
    functions: [],
    executions: [],
    logs: [],
    testEvents: [],
    demoDataLoaded: false,
    settings: {
      defaultRuntime: runtimeOptions[0],
      defaultExecutionDelayMs: 55,
      demoDataEnabled: true,
    },
  }
}

export function createDemoState() {
  const now = Date.now()
  const demoFunctions = [
    {
      id: 'demo-function-hello-world',
      name: 'hello-world',
      description: 'Returns a personalized greeting for an incoming request.',
      runtime: 'Node.js 20.x',
      behavior: 'hello-world',
    },
    {
      id: 'demo-function-calculator',
      name: 'calculator',
      description: 'Adds two finite numeric values and returns the result.',
      runtime: 'Python 3.12',
      behavior: 'calculator',
    },
    {
      id: 'demo-function-text-analyzer',
      name: 'text-analyzer',
      description: 'Summarizes text with character and word counts.',
      runtime: 'Python 3.11',
      behavior: 'text-analyzer',
    },
    {
      id: 'demo-function-json-processor',
      name: 'json-processor',
      description: 'Selects requested fields from a structured input record.',
      runtime: 'Java 21',
      behavior: 'json-processor',
    },
  ].map((fn) => {
    const template = getStarterTemplate(fn.runtime)
    return {
      ...fn,
      handler: template.handler,
      code: template.code,
      createdAt: new Date(now - 14 * 86_400_000).toISOString(),
      updatedAt: new Date(now - 2 * 86_400_000).toISOString(),
      status: 'Active',
      invocationCount: 0,
      lastInvokedAt: null,
      initials: fn.name.slice(0, 2).toUpperCase(),
      color: getFunctionColor(fn.name),
      isDemo: true,
    }
  })

  const demoScenarios = [
    { functionIndex: 0, day: 6, hour: 9, minute: 18, durationMs: 42, event: { name: 'Platform team' } },
    { functionIndex: 1, day: 6, hour: 10, minute: 42, durationMs: 57, event: { a: 148, b: 276 } },
    { functionIndex: 2, day: 5, hour: 11, minute: 6, durationMs: 68, event: { text: 'Serverless systems scale with demand' } },
    { functionIndex: 3, day: 5, hour: 14, minute: 31, durationMs: 91, event: { data: { orderId: 'ORD-1042', status: 'ready', region: 'us-east-1' }, fields: ['orderId', 'status'] } },
    { functionIndex: 0, day: 4, hour: 8, minute: 54, durationMs: 39, event: { name: 'Operations' } },
    { functionIndex: 1, day: 4, hour: 12, minute: 23, durationMs: 61, event: { a: 89, b: 11 } },
    { functionIndex: 2, day: 3, hour: 9, minute: 47, durationMs: 73, event: { text: 'Measure latency before optimizing the handler.' } },
    { functionIndex: 3, day: 3, hour: 15, minute: 12, durationMs: 105, event: { data: { customerId: 'CUS-281', plan: 'enterprise', active: true }, fields: ['customerId', 'plan'] } },
    { functionIndex: 0, day: 2, hour: 10, minute: 5, durationMs: 45, event: { name: 'LambdaLab' } },
    { functionIndex: 1, day: 2, hour: 13, minute: 38, durationMs: 66, event: { a: 1250, b: 875 } },
    { functionIndex: 2, day: 1, hour: 11, minute: 19, durationMs: 80, event: { text: 'Execution history makes simulated workloads observable.' } },
    { functionIndex: 3, day: 1, hour: 16, minute: 2, durationMs: 98, event: { data: { invoiceId: 'INV-205', total: 349.5, currency: 'USD' }, fields: ['invoiceId', 'total'] } },
    { functionIndex: 0, day: 0, hour: 8, minute: 12, durationMs: 48, event: { name: 'Workspace' } },
    { functionIndex: 1, day: 0, hour: 9, minute: 43, durationMs: 63, event: { a: 24, b: 18 } },
    { functionIndex: 2, day: 0, hour: 10, minute: 17, durationMs: 72, event: { text: 'A small event can demonstrate a reliable function run.' } },
    { functionIndex: 3, day: 0, hour: 11, minute: 29, durationMs: 112, event: { data: { taskId: 'TASK-709', owner: 'runtime-team' }, fields: ['taskId', 'status'], simulateError: true }, error: 'Simulated handler error requested by the test event.' },
  ]

  const executions = demoScenarios.map((scenario, index) => {
    const fn = demoFunctions[scenario.functionIndex]
    const started = new Date(now - scenario.day * 86_400_000)
    if (scenario.day === 0) {
      started.setTime(now - (demoScenarios.length - index) * 30 * 60_000)
    } else {
      started.setHours(scenario.hour, scenario.minute, 0, 0)
    }
    const startedAt = started.toISOString()
    const completedAt = new Date(started.getTime() + scenario.durationMs).toISOString()
    const invocationId = `demo-invocation-${String(index + 1).padStart(3, '0')}`
    const status = scenario.error ? 'ERROR' : 'SUCCESS'
    let output = null
    if (!scenario.error) {
      if (fn.behavior === 'hello-world') output = { message: `Hello, ${scenario.event.name ?? 'World'}!` }
      if (fn.behavior === 'calculator') output = { result: scenario.event.a + scenario.event.b }
      if (fn.behavior === 'text-analyzer') {
        const text = scenario.event.text
        output = { characterCount: text.length, wordCount: text.trim() ? text.trim().split(/\s+/u).length : 0 }
      }
      if (fn.behavior === 'json-processor') {
        const fields = Object.create(null)
        for (const field of scenario.event.fields) {
          if (Object.hasOwn(scenario.event.data, field)) fields[field] = scenario.event.data[field]
        }
        output = { fields }
      }
    }
    const eventName = scenario.error
      ? 'Simulated runtime error'
      : `${functionBehaviorOptions.find((item) => item.id === fn.behavior)?.label ?? fn.name} example`
    const phases = [
      ['INFO', `Invocation started · requestId=${invocationId}`],
      ['INFO', `Event received · ${Object.keys(scenario.event).length} fields`],
      ['INFO', `Function execution started · behavior=${fn.behavior}`],
      ['INFO', 'Processing request'],
      ...(scenario.error
        ? [['WARN', 'Request did not complete successfully; see error details'], ['ERROR', `Execution error · ${scenario.error}`]]
        : [['INFO', `Response generated · ${JSON.stringify(output)}`]]),
      [scenario.error ? 'ERROR' : 'INFO', scenario.error ? `Invocation completed with error · duration=${scenario.durationMs}ms` : `Invocation completed successfully · duration=${scenario.durationMs}ms`],
    ]
    const logs = phases.map(([level, message], logIndex) => ({
      id: `${invocationId}-log-${logIndex + 1}`,
      level,
      message,
      timestamp: new Date(started.getTime() + Math.round(scenario.durationMs * logIndex / (phases.length - 1))).toISOString(),
    }))
    return {
      id: invocationId,
      invocationId,
      functionId: fn.id,
      functionName: fn.name,
      runtime: fn.runtime,
      behavior: fn.behavior,
      testEventId: scenario.error ? `demo-event-${fn.behavior}-error` : `demo-event-${fn.behavior}`,
      testEventName: eventName,
      trigger: 'Test event',
      event: scenario.event,
      status,
      startedAt,
      completedAt,
      durationMs: scenario.durationMs,
      output,
      result: output,
      error: scenario.error ?? null,
      logs,
      isDemo: true,
    }
  })

  const functions = demoFunctions.map((fn) => {
    const ownExecutions = executions.filter((execution) => execution.functionId === fn.id)
    return {
      ...fn,
      invocationCount: ownExecutions.length,
      lastInvokedAt: ownExecutions.reduce((latest, execution) =>
        !latest || execution.startedAt > latest ? execution.startedAt : latest, null),
    }
  })
  const testEvents = functions.map((fn) => ({
    id: `demo-event-${fn.behavior}`,
    functionId: fn.id,
    name: `${functionBehaviorOptions.find((item) => item.id === fn.behavior)?.label ?? fn.name} example`,
    event: getBehaviorExampleEvent(fn.behavior),
    createdAt: fn.createdAt,
    updatedAt: fn.updatedAt,
    isDemo: true,
  }))
  const jsonProcessor = functions.find((fn) => fn.behavior === 'json-processor')
  if (jsonProcessor) {
    const errorExecution = executions.find((execution) => execution.functionId === jsonProcessor.id && execution.status === 'ERROR')
    if (errorExecution) {
      testEvents.push({
        id: `demo-event-${jsonProcessor.behavior}-error`,
        functionId: jsonProcessor.id,
        name: 'Simulated runtime error',
        event: errorExecution.event,
        createdAt: errorExecution.startedAt,
        updatedAt: errorExecution.startedAt,
        isDemo: true,
      })
    }
  }
  const logs = executions.flatMap((execution) => execution.logs.map((entry) => ({
    ...entry,
    executionId: execution.id,
    functionName: execution.functionName,
    time: new Date(entry.timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + `.${String(new Date(entry.timestamp).getMilliseconds()).padStart(3, '0')}`,
    isDemo: true,
  })))

  return {
    ...createInitialState(),
    functions,
    testEvents,
    executions,
    logs,
    demoDataLoaded: true,
  }
}

export { createExampleTestEvents }

export function formatDuration(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) return '—'
  const roundedMilliseconds = Math.round(durationMs)
  return roundedMilliseconds >= 1000
    ? `${(roundedMilliseconds / 1000).toFixed(2)} s`
    : `${roundedMilliseconds} ms`
}

export function formatTime(value) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function getFunctionColor(name) {
  const colors = ['violet', 'blue', 'amber', 'teal']
  return colors[[...name].reduce((total, character) => total + character.charCodeAt(0), 0) % colors.length]
}
