import { functionBehaviorOptions, runtimeOptions } from '../data.js'

const MAX_SIMULATED_DELAY_MS = 120
const MIN_SIMULATED_DELAY_MS = 35

const behaviorStrategies = {
  'hello-world': {
    delayMs: 48,
    execute(event) {
      const name = event.name ?? 'World'
      if (typeof name !== 'string') throw new Error('The "name" field must be a string.')
      return { message: `Hello, ${name}!` }
    },
  },
  calculator: {
    delayMs: 62,
    execute(event) {
      const { a, b } = event
      if (typeof a !== 'number' || !Number.isFinite(a)) throw new Error('Calculator requires a finite numeric "a" field.')
      if (typeof b !== 'number' || !Number.isFinite(b)) throw new Error('Calculator requires a finite numeric "b" field.')
      const result = a + b
      if (!Number.isFinite(result)) throw new Error('The sum is outside the supported numeric range.')
      return { result }
    },
  },
  'text-analyzer': {
    delayMs: 76,
    execute(event) {
      if (typeof event.text !== 'string') throw new Error('Text Analyzer requires a string "text" field.')
      const words = event.text.trim() ? event.text.trim().split(/\s+/u) : []
      return { characterCount: event.text.length, wordCount: words.length }
    },
  },
  'json-processor': {
    delayMs: 91,
    execute(event) {
      const fields = event.fields
      if (!Array.isArray(fields) || !fields.every((field) => typeof field === 'string')) {
        throw new Error('JSON Processor requires a "fields" array containing field names.')
      }
      const source = event.data
      if (!source || typeof source !== 'object' || Array.isArray(source)) {
        throw new Error('JSON Processor requires a "data" object.')
      }
      const selected = Object.create(null)
      for (const field of fields) {
        if (Object.hasOwn(source, field)) selected[field] = source[field]
      }
      return { fields: selected }
    },
  },
}

const failureMessages = {
  'missing-input': 'A required input is missing. Check the selected function behavior and provide the expected event fields.',
  'invalid-configuration': 'The function configuration is invalid. Check its runtime, handler, and simulation behavior.',
  'runtime-error': 'The simulated runtime encountered an error while processing this request.',
  timeout: 'The simulated invocation timed out after the bounded simulator wait.',
}

function createLog(invocationId, index, level, message, timestamp) {
  return {
    id: `${invocationId}-log-${index}`,
    level,
    message,
    timestamp: timestamp.toISOString(),
  }
}

export function createInvocationId() {
  return `invoke-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`
}

function waitForBoundedSimulation(delayMs) {
  const boundedDelay = Math.min(MAX_SIMULATED_DELAY_MS, Math.max(MIN_SIMULATED_DELAY_MS, delayMs))
  return new Promise((resolve) => window.setTimeout(resolve, boundedDelay))
}

export async function executeSimulatedFunction({ functionRecord, event, testEventName = null, invocationId = createInvocationId(), executionDelayMs }) {
  const startedAt = new Date()
  let output = null
  let error = null
  let normalizedEvent = event
  const requestedFailure = event && typeof event === 'object' && !Array.isArray(event)
    ? event.simulateFailure
    : null
  const delayMs = requestedFailure === 'timeout' ? MAX_SIMULATED_DELAY_MS : null

  try {
    const strategy = Object.hasOwn(behaviorStrategies, functionRecord.behavior)
      ? behaviorStrategies[functionRecord.behavior]
      : null
    await waitForBoundedSimulation(delayMs ?? executionDelayMs ?? strategy?.delayMs ?? 55)

    if (typeof normalizedEvent === 'string') {
      try {
        normalizedEvent = JSON.parse(normalizedEvent)
      } catch {
        throw new Error('Invalid JSON input. Check commas, quotation marks, and brackets, then try again.')
      }
    }

    if (!normalizedEvent || typeof normalizedEvent !== 'object' || Array.isArray(normalizedEvent)) {
      throw new Error('The event must be a JSON object. JSON arrays, strings, numbers, and null are not supported.')
    }

    if (requestedFailure === 'invalid-configuration') {
      throw new Error(failureMessages['invalid-configuration'])
    }
    if (requestedFailure === 'missing-input') {
      throw new Error(failureMessages['missing-input'])
    }
    if (requestedFailure === 'runtime-error') {
      throw new Error(failureMessages['runtime-error'])
    }
    if (requestedFailure === 'timeout') {
      throw new Error(failureMessages.timeout)
    }

    if (!functionRecord.name?.trim() || !functionRecord.handler?.trim() || !runtimeOptions.includes(functionRecord.runtime)) {
      throw new Error(failureMessages['invalid-configuration'])
    }
    if (!strategy) {
      throw new Error('This function has no supported simulation behavior. Edit the function and select a behavior template.')
    }

    if (normalizedEvent.simulateError === true) {
      throw new Error('Simulated handler error requested by the test event.')
    }

    output = strategy.execute(normalizedEvent)
  } catch (executionError) {
    error = executionError instanceof Error ? executionError.message : 'The simulated invocation failed.'
  }

  const completedAt = new Date()
  const durationMs = Math.max(1, completedAt.getTime() - startedAt.getTime())
  const status = error ? 'ERROR' : 'SUCCESS'
  const eventKeys = normalizedEvent && typeof normalizedEvent === 'object' && !Array.isArray(normalizedEvent) ? Object.keys(normalizedEvent) : []
  const phases = [
    ['INFO', `Invocation started · requestId=${invocationId}`],
    ['INFO', `Event received · ${eventKeys.length} field${eventKeys.length === 1 ? '' : 's'}`],
    ['INFO', `Function execution started · behavior=${functionRecord.behavior ?? 'unknown'}`],
    ['INFO', 'Processing request'],
    ...(error
      ? [['WARN', 'Request did not complete successfully; see error details'], ['ERROR', `Execution error · ${error}`]]
      : [['INFO', `Response generated · ${JSON.stringify(output)}`]]),
    [error ? 'ERROR' : 'INFO', error ? `Invocation completed with error · duration=${durationMs}ms` : `Invocation completed successfully · duration=${durationMs}ms`],
  ]
  const logs = phases.map(([level, message], index) => {
    const timestamp = new Date(startedAt.getTime() + Math.round((durationMs * index) / Math.max(1, phases.length - 1)))
    return createLog(invocationId, index + 1, level, message, timestamp)
  })

  return {
    id: invocationId,
    invocationId,
    functionId: functionRecord.id,
    functionName: functionRecord.name,
    runtime: functionRecord.runtime,
    behavior: functionRecord.behavior ?? null,
    testEventName,
    trigger: 'Test event',
    event: normalizedEvent,
    status,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs,
    output,
    result: output,
    error,
    logs,
  }
}
