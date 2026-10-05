import { functionBehaviorOptions, runtimeOptions } from '../data.js'

export const SIMULATION_STORAGE_KEY = 'lambdalab.simulation.v1'

const SUPPORTED_SCHEMA_VERSIONS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])
const IMPORT_SCHEMA_VERSION = 9
const IMPORT_LIMITS = new Set([35, 55, 80, 100, 120])

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyKeys(value, allowedKeys) {
  return Object.keys(value).every((key) => allowedKeys.has(key))
}

function isValidTimestamp(value, optional = false) {
  return optional && value == null ||
    typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function hasUniqueIds(records) {
  const ids = records.map((record) => record.id)
  return new Set(ids).size === ids.length
}

function isValidImportedFunction(value) {
  return isRecord(value) &&
    hasOnlyKeys(value, new Set([
      'id', 'name', 'description', 'runtime', 'handler', 'code', 'behavior',
      'createdAt', 'updatedAt', 'status', 'invocationCount', 'lastInvokedAt',
      'initials', 'color',
    ])) &&
    typeof value.id === 'string' && value.id.length > 0 &&
    typeof value.name === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value.name) &&
    typeof value.description === 'string' &&
    runtimeOptions.includes(value.runtime) &&
    typeof value.handler === 'string' && value.handler.trim().length > 0 &&
    typeof value.code === 'string' && value.code.trim().length > 0 &&
    functionBehaviorOptions.some((behavior) => behavior.id === value.behavior) &&
    isValidTimestamp(value.createdAt) &&
    isValidTimestamp(value.updatedAt) &&
    ['Active', 'Inactive'].includes(value.status) &&
    Number.isInteger(value.invocationCount) && value.invocationCount >= 0 &&
    isValidTimestamp(value.lastInvokedAt, true) &&
    typeof value.initials === 'string' &&
    typeof value.color === 'string'
}

function isValidImportedLog(value) {
  return isRecord(value) &&
    hasOnlyKeys(value, new Set(['id', 'level', 'message', 'timestamp', 'executionId', 'functionName', 'time', 'isDemo'])) &&
    typeof value.id === 'string' && value.id.length > 0 &&
    ['INFO', 'WARN', 'ERROR'].includes(value.level) &&
    typeof value.message === 'string' &&
    isValidTimestamp(value.timestamp, true) &&
    (value.executionId === undefined || typeof value.executionId === 'string') &&
    (value.functionName === undefined || typeof value.functionName === 'string') &&
    (value.time === undefined || typeof value.time === 'string') &&
    (value.isDemo === undefined || typeof value.isDemo === 'boolean')
}

function isValidImportedExecution(value) {
  return isRecord(value) &&
    hasOnlyKeys(value, new Set([
      'id', 'invocationId', 'functionId', 'functionName', 'runtime', 'behavior',
      'testEventId', 'testEventName', 'trigger', 'event', 'status', 'startedAt',
      'completedAt', 'durationMs', 'output', 'result', 'error', 'logs', 'isDemo',
    ])) &&
    typeof value.id === 'string' && value.id.length > 0 &&
    (value.invocationId === undefined || typeof value.invocationId === 'string') &&
    typeof value.functionId === 'string' && value.functionId.length > 0 &&
    typeof value.functionName === 'string' &&
    runtimeOptions.includes(value.runtime) &&
    (value.behavior === null || functionBehaviorOptions.some((behavior) => behavior.id === value.behavior)) &&
    (value.testEventId === undefined || value.testEventId === null || typeof value.testEventId === 'string') &&
    (value.testEventName === undefined || value.testEventName === null || typeof value.testEventName === 'string') &&
    typeof value.trigger === 'string' &&
    (value.event === undefined || value.event === null || ['string', 'number', 'boolean'].includes(typeof value.event) || Array.isArray(value.event) || isRecord(value.event)) &&
    ['SUCCESS', 'ERROR'].includes(value.status) &&
    isValidTimestamp(value.startedAt) &&
    isValidTimestamp(value.completedAt) &&
    Date.parse(value.completedAt) >= Date.parse(value.startedAt) &&
    Number.isFinite(value.durationMs) && value.durationMs >= 0 &&
    (value.status === 'ERROR' ? typeof value.error === 'string' : value.error === null) &&
    Array.isArray(value.logs) && value.logs.every(isValidImportedLog) &&
    (value.isDemo === undefined || typeof value.isDemo === 'boolean')
}

function isValidImportedTestEvent(value) {
  return isRecord(value) &&
    hasOnlyKeys(value, new Set(['id', 'functionId', 'name', 'event', 'createdAt', 'updatedAt', 'isDemo'])) &&
    typeof value.id === 'string' && value.id.length > 0 &&
    typeof value.functionId === 'string' && value.functionId.length > 0 &&
    typeof value.name === 'string' && value.name.trim().length > 0 &&
    isRecord(value.event) &&
    isValidTimestamp(value.createdAt) &&
    isValidTimestamp(value.updatedAt) &&
    (value.isDemo === undefined || typeof value.isDemo === 'boolean')
}

function isValidExecution(value) {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.functionId === 'string' &&
    typeof value.startedAt === 'string' &&
    Number.isFinite(Date.parse(value.startedAt)) &&
    (value.durationMs === undefined || (Number.isFinite(value.durationMs) && value.durationMs >= 0)) &&
    (value.completedAt === undefined || (typeof value.completedAt === 'string' && Number.isFinite(Date.parse(value.completedAt))))
}

function isValidTestEvent(value) {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.functionId === 'string' &&
    typeof value.name === 'string' &&
    isRecord(value.event)
}

function isValidSimulationState(value) {
  return isRecord(value) &&
    SUPPORTED_SCHEMA_VERSIONS.has(value.schemaVersion) &&
    Array.isArray(value.functions) &&
    value.functions.every(isRecord) &&
    Array.isArray(value.executions) &&
    value.executions.every(isValidExecution) &&
    Array.isArray(value.logs) &&
    value.logs.every(isRecord) &&
    (value.schemaVersion < 3 || (Array.isArray(value.testEvents) && value.testEvents.every(isValidTestEvent))) &&
    (value.schemaVersion < 9 || (
      isRecord(value.settings) &&
      typeof value.settings.defaultRuntime === 'string' &&
      [35, 55, 80, 100, 120].includes(value.settings.defaultExecutionDelayMs) &&
      typeof value.settings.demoDataEnabled === 'boolean'
    ))
}

export function isValidImportedSimulationState(value) {
  if (!isRecord(value) || value.schemaVersion !== IMPORT_SCHEMA_VERSION) return false
  if (!hasOnlyKeys(value, new Set([
    'schemaVersion', 'functions', 'testEvents', 'executions', 'logs', 'demoDataLoaded', 'settings',
  ]))) return false
  if (
    !Array.isArray(value.functions) ||
    !value.functions.every(isValidImportedFunction) ||
    !hasUniqueIds(value.functions) ||
    new Set(value.functions.map((fn) => fn.name.toLowerCase())).size !== value.functions.length
  ) return false
  if (
    !Array.isArray(value.testEvents) ||
    !value.testEvents.every(isValidImportedTestEvent) ||
    !hasUniqueIds(value.testEvents) ||
    value.testEvents.some((event) => !value.functions.some((fn) => fn.id === event.functionId)) ||
    new Set(value.testEvents.map((event) => `${event.functionId}\u0000${event.name.toLowerCase()}`)).size !== value.testEvents.length
  ) return false
  if (
    !Array.isArray(value.executions) ||
    !value.executions.every(isValidImportedExecution) ||
    !hasUniqueIds(value.executions)
  ) return false
  if (
    !Array.isArray(value.logs) ||
    !value.logs.every(isValidImportedLog) ||
    !hasUniqueIds(value.logs) ||
    value.logs.some((log) => log.executionId !== undefined && !value.executions.some((execution) => execution.id === log.executionId))
  ) return false
  return typeof value.demoDataLoaded === 'boolean' &&
    isRecord(value.settings) &&
    hasOnlyKeys(value.settings, new Set(['defaultRuntime', 'defaultExecutionDelayMs', 'demoDataEnabled'])) &&
    runtimeOptions.includes(value.settings.defaultRuntime) &&
    IMPORT_LIMITS.has(value.settings.defaultExecutionDelayMs) &&
    typeof value.settings.demoDataEnabled === 'boolean'
}

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('Browser storage is not available.')
  }
  return window.localStorage
}

export function loadSimulationState(createInitialState) {
  let storage
  try {
    storage = getStorage()
    const serialized = storage.getItem(SIMULATION_STORAGE_KEY)
    if (serialized === null) return { data: createInitialState(), issue: null }

    let savedData
    try {
      savedData = JSON.parse(serialized)
    } catch {
      storage.removeItem(SIMULATION_STORAGE_KEY)
      return {
        data: createInitialState(),
        issue: 'Saved simulator data was corrupted and has been cleared. You can start a fresh workspace.',
      }
    }

    if (!isValidSimulationState(savedData)) {
      storage.removeItem(SIMULATION_STORAGE_KEY)
      return {
        data: createInitialState(),
        issue: 'Saved simulator data had an unsupported format and has been cleared. You can start a fresh workspace.',
      }
    }

    return { data: savedData, issue: null }
  } catch (error) {
    return {
      data: createInitialState(),
      issue: error instanceof Error
        ? `Browser storage could not be read: ${error.message} Your workspace is temporary until storage is available.`
        : 'Browser storage could not be read. Your workspace is temporary until storage is available.',
    }
  }
}

export function saveSimulationState(data) {
  try {
    getStorage().setItem(SIMULATION_STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown browser storage error.'
    throw new Error(`LambdaLab could not save your workspace to this browser: ${reason}`)
  }
}
