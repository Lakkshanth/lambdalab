import { createContext, useContext, useMemo, useRef, useState } from 'react'
import { createDemoState, createExampleTestEvents, createInitialState, functionBehaviorOptions, getFunctionColor, getStarterTemplate, runtimeOptions } from '../data.js'
import { executeSimulatedFunction } from '../simulator/executionEngine.js'
import { isValidImportedSimulationState, loadSimulationState, saveSimulationState } from '../storage/simulationStorage.js'

const SimulationContext = createContext(null)

function normalizeFunction(fn) {
  const now = new Date().toISOString()
  const runtime = typeof fn.runtime === 'string' ? fn.runtime : 'Node.js 20.x'
  return {
    ...fn,
    id: typeof fn.id === 'string' && fn.id ? fn.id : createId('fn'),
    name: typeof fn.name === 'string' ? fn.name : '',
    description: typeof fn.description === 'string' ? fn.description : '',
    runtime,
    handler: typeof fn.handler === 'string' && fn.handler ? fn.handler : getStarterTemplate(runtime).handler,
    code: typeof fn.code === 'string' && fn.code.trim()
      ? fn.code
      : getStarterTemplate(runtime).code,
    behavior: functionBehaviorOptions.some((item) => item.id === fn.behavior) ? fn.behavior : 'hello-world',
    createdAt: typeof fn.createdAt === 'string' ? fn.createdAt : now,
    updatedAt: typeof fn.updatedAt === 'string' ? fn.updatedAt : now,
    status: fn.status === 'Inactive' ? 'Inactive' : 'Active',
    invocationCount: Number.isInteger(fn.invocationCount) && fn.invocationCount >= 0 ? fn.invocationCount : 0,
    lastInvokedAt: typeof fn.lastInvokedAt === 'string' ? fn.lastInvokedAt : null,
    initials: typeof fn.initials === 'string' ? fn.initials : (fn.name ?? '').slice(0, 2).toUpperCase(),
    color: typeof fn.color === 'string' ? fn.color : getFunctionColor(fn.name ?? ''),
  }
}

function normalizeSimulationState(data) {
  const normalizedFunctions = data.functions.map(normalizeFunction)
  const executionRecords = data.schemaVersion < 5
    ? data.executions.filter((execution) => !execution.id?.startsWith('exec-seed-'))
    : data.executions
  const counts = new Map()
  const lastInvocations = new Map()
  for (const execution of executionRecords) {
    counts.set(execution.functionId, (counts.get(execution.functionId) ?? 0) + 1)
    const existing = lastInvocations.get(execution.functionId)
    if (!existing || new Date(execution.startedAt) > new Date(existing)) {
      lastInvocations.set(execution.functionId, execution.startedAt)
    }
  }
  const existingTestEvents = Array.isArray(data.testEvents) ? data.testEvents : []
  let testEvents = data.schemaVersion >= 3
    ? existingTestEvents.filter((event) => normalizedFunctions.some((fn) => fn.id === event.functionId))
    : normalizedFunctions.flatMap((fn) => {
      const savedEvents = existingTestEvents.filter((event) => event.functionId === fn.id)
      return savedEvents.length ? savedEvents : createExampleTestEvents(fn.id, fn.behavior)
    })
  if (data.schemaVersion < 4) {
    for (const fn of normalizedFunctions) {
      const exampleId = `event-${fn.id}-${fn.behavior}`
      if (!testEvents.some((event) => event.id === exampleId)) {
        testEvents = [...testEvents, ...createExampleTestEvents(fn.id, fn.behavior).slice(0, 1)]
      }
    }
  }
  const normalizedExecutions = executionRecords.map((execution) => {
    const completedAt = execution.completedAt ??
      new Date(new Date(execution.startedAt).getTime() + (execution.durationMs ?? 0)).toISOString()
    const durationMs = Number.isFinite(execution.durationMs) && execution.durationMs >= 0
      ? execution.durationMs
      : Math.max(0, Date.parse(completedAt) - Date.parse(execution.startedAt))
    return {
      ...execution,
      status: execution.status === 'Success' || execution.status === 'SUCCESS' ? 'SUCCESS' : 'ERROR',
      invocationId: execution.invocationId ?? execution.id,
      completedAt,
      durationMs,
      output: execution.output ?? execution.result ?? null,
      logs: Array.isArray(execution.logs) ? execution.logs : [],
    }
  })
  const normalizedData = {
    ...data,
    schemaVersion: 9,
    demoDataLoaded: data.demoDataLoaded === true,
    settings: {
      defaultRuntime: runtimeOptions.includes(data.settings?.defaultRuntime)
        ? data.settings.defaultRuntime
        : runtimeOptions[0],
      defaultExecutionDelayMs: [35, 55, 80, 100, 120].includes(data.settings?.defaultExecutionDelayMs)
        ? data.settings.defaultExecutionDelayMs
        : 55,
      demoDataEnabled: data.settings?.demoDataEnabled !== false,
    },
    executions: normalizedExecutions,
    logs: data.schemaVersion < 5
      ? data.logs.filter((log) => !log.executionId?.startsWith('exec-seed-') && !log.id?.startsWith('exec-seed-'))
      : data.logs,
    functions: normalizedFunctions.map((fn) => ({
      ...fn,
      invocationCount: data.schemaVersion < 5 ? counts.get(fn.id) ?? 0 : counts.get(fn.id) ?? fn.invocationCount,
      lastInvokedAt: data.schemaVersion < 5 ? lastInvocations.get(fn.id) ?? null : lastInvocations.get(fn.id) ?? fn.lastInvokedAt,
    })),
    testEvents,
  }
  return normalizedData
}

function persistState(data) {
  saveSimulationState(data)
}

function createId(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`
}

function validateFunctionInput({ name, runtime, description, handler, code, behavior }) {
  const normalizedName = name.trim()
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(normalizedName)) {
    throw new Error('Use 1–64 letters, numbers, hyphens, or underscores. The name must start with a letter or number.')
  }
  if (!description.trim()) throw new Error('Enter a function description.')
  if (!runtimeOptions.includes(runtime)) throw new Error('Select one of the supported simulated runtimes.')
  if (!handler.trim()) throw new Error('Enter a handler.')
  if (!code.trim()) throw new Error('Enter function code.')
  if (!functionBehaviorOptions.some((item) => item.id === behavior)) throw new Error('Select a supported simulated behavior.')
  return { normalizedName, runtime, description: description.trim(), handler: handler.trim(), code, behavior }
}

function validateTestEventInput({ name, event }) {
  const normalizedName = name.trim()
  if (!normalizedName) throw new Error('Enter a name for this test event.')
  if (normalizedName.length > 80) throw new Error('Test event names must be 80 characters or fewer.')
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new Error('Test event JSON must be an object.')
  }
  return { name: normalizedName, event }
}

function createFunctionRecord(input) {
  const { normalizedName, runtime, description, handler, code, behavior } = validateFunctionInput(input)
  const now = new Date().toISOString()

  return {
    id: createId('fn'),
    name: normalizedName,
    description,
    runtime,
    handler,
    code,
    behavior,
    createdAt: now,
    updatedAt: now,
    status: 'Active',
    invocationCount: 0,
    lastInvokedAt: null,
    initials: normalizedName.slice(0, 2).toUpperCase(),
    color: getFunctionColor(normalizedName),
  }
}

export function SimulationProvider({ children }) {
  const [initialState] = useState(() => {
    const loaded = loadSimulationState(createInitialState)
    let data
    try {
      data = normalizeSimulationState(loaded.data)
    } catch (error) {
      return {
        data: createInitialState(),
        issue: error instanceof Error
          ? `Saved simulator data could not be migrated: ${error.message} Start a fresh workspace or reset stored data in Settings.`
          : 'Saved simulator data could not be migrated. Start a fresh workspace or reset stored data in Settings.',
      }
    }

    let issue = loaded.issue
    if (loaded.data.schemaVersion !== 9) {
      try {
        persistState(data)
      } catch (error) {
        issue = error instanceof Error
          ? `Saved workspace data was loaded, but the format update could not be saved: ${error.message}`
          : 'Saved workspace data was loaded, but the format update could not be saved.'
      }
    }
    return { data, issue }
  })
  const [data, setData] = useState(initialState.data)
  const [storageIssue, setStorageIssue] = useState(initialState.issue)
  const dataRef = useRef(data)

  function commit(nextData) {
    try {
      persistState(nextData)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Workspace changes could not be saved to browser storage.'
      setStorageIssue(message)
      throw error
    }
    dataRef.current = nextData
    setData(nextData)
    setStorageIssue(null)
  }

  function resetSimulationData() {
    const freshData = createInitialState()
    commit(freshData)
  }

  function loadDemoData() {
    const current = dataRef.current
    if (!current.settings.demoDataEnabled) {
      throw new Error('Demo data is disabled in Settings. Enable it before loading the demo dataset.')
    }
    if (current.functions.length || current.testEvents.length || current.executions.length || current.logs.length) {
      throw new Error('Demo data can only be loaded into an empty workspace. Reset the current workspace first if you want to use the demo dataset.')
    }
    commit(createDemoState())
  }

  function createFunction(input) {
    const fn = createFunctionRecord({ ...input, runtime: input.runtime ?? dataRef.current.settings.defaultRuntime })
    if (data.functions.some((existing) => existing.name.toLowerCase() === fn.name.toLowerCase())) {
      throw new Error(`A function named “${fn.name}” already exists.`)
    }
    commit({
      ...data,
      functions: [fn, ...data.functions],
      testEvents: [...data.testEvents, ...createExampleTestEvents(fn.id, fn.behavior)],
    })
    return fn
  }

  function updateFunction(functionId, input) {
    const existing = data.functions.find((fn) => fn.id === functionId)
    if (!existing) throw new Error('This function no longer exists.')
    const validated = validateFunctionInput(input)
    if (data.functions.some((fn) => fn.id !== functionId && fn.name.toLowerCase() === validated.normalizedName.toLowerCase())) {
      throw new Error(`A function named “${validated.normalizedName}” already exists.`)
    }

    const updated = {
      ...existing,
      name: validated.normalizedName,
      description: validated.description,
      runtime: validated.runtime,
      handler: validated.handler,
      code: validated.code,
      behavior: validated.behavior,
      updatedAt: new Date().toISOString(),
      initials: validated.normalizedName.slice(0, 2).toUpperCase(),
      color: getFunctionColor(validated.normalizedName),
    }
    commit({
      ...data,
      functions: data.functions.map((fn) => fn.id === functionId ? updated : fn),
      testEvents: data.testEvents.some((event) => event.id === `event-${functionId}-${updated.behavior}`)
        ? data.testEvents
        : [...data.testEvents, ...createExampleTestEvents(functionId, updated.behavior).slice(0, 1)],
      executions: data.executions.map((execution) => execution.functionId === functionId
        ? { ...execution, functionName: updated.name }
        : execution),
      logs: data.logs.map((log) => log.functionName === existing.name
        ? { ...log, functionName: updated.name }
        : log),
    })
    return updated
  }

  function deleteFunction(functionId) {
    const fn = data.functions.find((item) => item.id === functionId)
    if (!fn) throw new Error('This function no longer exists.')
    commit({
      ...data,
      functions: data.functions.filter((item) => item.id !== functionId),
      testEvents: data.testEvents.filter((event) => event.functionId !== functionId),
    })
    return fn
  }

  function createTestEvent(functionId, input) {
    if (!data.functions.some((fn) => fn.id === functionId)) throw new Error('Select an existing function for this test event.')
    const validated = validateTestEventInput(input)
    if (data.testEvents.some((item) => item.functionId === functionId && item.name.toLowerCase() === validated.name.toLowerCase())) {
      throw new Error(`A test event named “${validated.name}” already exists for this function.`)
    }
    const now = new Date().toISOString()
    const testEvent = { id: createId('event'), functionId, ...validated, createdAt: now, updatedAt: now }
    commit({ ...data, testEvents: [testEvent, ...data.testEvents] })
    return testEvent
  }

  function updateTestEvent(functionId, eventId, input) {
    const existing = data.testEvents.find((item) => item.id === eventId && item.functionId === functionId)
    if (!existing) throw new Error('This test event no longer exists.')
    const validated = validateTestEventInput(input)
    if (data.testEvents.some((item) =>
      item.functionId === functionId &&
      item.id !== eventId &&
      item.name.toLowerCase() === validated.name.toLowerCase()
    )) {
      throw new Error(`A test event named “${validated.name}” already exists for this function.`)
    }
    const updated = { ...existing, ...validated, updatedAt: new Date().toISOString() }
    commit({
      ...data,
      testEvents: data.testEvents.map((item) => item.id === eventId ? updated : item),
    })
    return updated
  }

  function deleteTestEvent(functionId, eventId) {
    const existing = data.testEvents.find((item) => item.id === eventId && item.functionId === functionId)
    if (!existing) throw new Error('This test event no longer exists.')
    commit({
      ...data,
      testEvents: data.testEvents.filter((item) => item.id !== eventId),
    })
    return existing
  }

  async function invokeFunction(functionId, event, testEventInfo = {}) {
    const fn = data.functions.find((item) => item.id === functionId)
    if (!fn) throw new Error('Select an existing function before invoking.')
    if (fn.status !== 'Active') throw new Error('Only active functions can be invoked.')
    const latestFunction = dataRef.current.functions.find((item) => item.id === functionId)
    if (!latestFunction) throw new Error('This function no longer exists.')
    const execution = await executeSimulatedFunction({
      functionRecord: latestFunction,
      event,
      testEventName: typeof testEventInfo.testEventName === 'string' ? testEventInfo.testEventName : null,
      invocationId: typeof testEventInfo.invocationId === 'string' ? testEventInfo.invocationId : undefined,
      executionDelayMs: dataRef.current.settings.defaultExecutionDelayMs,
    })
    if (typeof testEventInfo.testEventId === 'string') execution.testEventId = testEventInfo.testEventId
    if (typeof testEventInfo.testEventName === 'string') execution.testEventName = testEventInfo.testEventName
    const nextState = dataRef.current
    const newLogs = execution.logs.map((log) => ({
      ...log,
      executionId: execution.id,
      functionName: execution.functionName,
      time: new Date(log.timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + `.${String(new Date(log.timestamp).getMilliseconds()).padStart(3, '0')}`,
    }))
    commit({
      ...nextState,
      functions: nextState.functions.map((item) => item.id === functionId
        ? { ...item, invocationCount: item.invocationCount + 1, lastInvokedAt: execution.startedAt }
        : item),
      executions: [execution, ...nextState.executions],
      logs: [...newLogs, ...nextState.logs],
    })
    return execution
  }

  function updateSettings(settingsUpdate) {
    const current = dataRef.current
    const nextSettings = { ...current.settings, ...settingsUpdate }
    if (!runtimeOptions.includes(nextSettings.defaultRuntime)) throw new Error('Select a supported simulated runtime.')
    if (![35, 55, 80, 100, 120].includes(nextSettings.defaultExecutionDelayMs)) {
      throw new Error('Select a supported bounded execution delay.')
    }
    if (typeof nextSettings.demoDataEnabled !== 'boolean') throw new Error('Demo data setting must be enabled or disabled.')
    commit({ ...current, settings: nextSettings })
  }

  function replaceSimulationData(importedData) {
    if (!isValidImportedSimulationState(importedData)) {
      throw new Error('The selected file is not a valid LambdaLab data export.')
    }
    const normalized = normalizeSimulationState(importedData)
    commit(normalized)
  }

  const value = useMemo(
    () => ({
      ...data,
      storageIssue,
      resetSimulationData,
      loadDemoData,
      updateSettings,
      replaceSimulationData,
      createFunction,
      updateFunction,
      deleteFunction,
      createTestEvent,
      updateTestEvent,
      deleteTestEvent,
      invokeFunction,
    }),
    [data, storageIssue],
  )

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>
}

export function useSimulation() {
  const context = useContext(SimulationContext)
  if (!context) throw new Error('useSimulation must be used inside SimulationProvider.')
  return context
}
