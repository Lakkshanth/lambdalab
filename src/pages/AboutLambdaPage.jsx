import { icons } from '../components/Icons.jsx'

const concepts = [
  {
    title: 'Lambda functions',
    description: 'A function is a deployable unit of code with configuration such as a name, runtime, handler, and permissions.',
    icon: 'Braces',
  },
  {
    title: 'Runtimes',
    description: 'A runtime provides the language environment and conventions used to initialize and run a function. Examples include Python, Node.js, and Java.',
    icon: 'Code2',
  },
  {
    title: 'Handlers',
    description: 'The handler is the function entry point Lambda calls for an invocation. It receives the event and, in many runtimes, a context describing the invocation.',
    icon: 'Zap',
  },
  {
    title: 'Events',
    description: 'An event is the input data describing something to process, such as a request or a scheduled task. Its shape depends on the event source and application.',
    icon: 'FileCode2',
  },
  {
    title: 'Invocations',
    description: 'An invocation is one request for a function to process an event. It produces a success or error outcome and execution metadata.',
    icon: 'Activity',
  },
  {
    title: 'Results, logs & monitoring',
    description: 'The caller can receive a result or error. Logs and metrics help developers understand behavior, failures, and performance over time.',
    icon: 'ChartNoAxesCombined',
  },
]

const workflow = [
  { title: 'Create', detail: 'Configure function', icon: 'Braces' },
  { title: 'Choose runtime', detail: 'Select language environment', icon: 'Code2' },
  { title: 'Set handler', detail: 'Identify code entry point', icon: 'Zap' },
  { title: 'Receive event', detail: 'Provide input data', icon: 'FileCode2' },
  { title: 'Invoke & observe', detail: 'Review result and logs', icon: 'Activity' },
]

const mapping = [
  ['Lambda function', 'A saved simulated function with name, description, handler, runtime, and behavior.'],
  ['Runtime', 'A selected simulated Python, Node.js, or Java runtime label; the runtime itself is not launched.'],
  ['Handler', 'A saved entry-point string shown with the function configuration; source code is stored as text.'],
  ['Event', 'A named JSON test event saved locally and associated with a simulated function.'],
  ['Invocation', 'A controlled simulator run with an invocation ID, bounded duration, status, and generated logs.'],
  ['Execution result', 'The output or error returned by one of LambdaLab’s predefined behavior strategies.'],
  ['Logging & monitoring', 'Simulated log entries, execution history, and analytics calculated from saved simulator records.'],
]

export default function AboutLambdaPage() {
  return (
    <div className="about-lambda-page">
      <div className="page-title-row">
        <div>
          <div className="eyebrow">SERVICE OVERVIEW</div>
          <h1>About AWS Lambda</h1>
          <p className="page-subtitle">A concise guide to Lambda’s serverless function model and how this project demonstrates its core concepts.</p>
        </div>
        <span className="simulation-mode-label"><icons.ShieldCheck size={14} />Simulation Mode</span>
      </div>

      <section className="about-lambda-intro">
        <span className="about-lambda-intro-icon"><icons.Zap size={20} /></span>
        <div>
          <h2>What is AWS Lambda?</h2>
          <p>AWS Lambda is a serverless compute service for running code in response to events. You provide function code and configuration; AWS manages the compute environment used to run it. It is commonly used for event-driven application logic without managing servers directly.</p>
          <p>It is useful for tasks such as processing requests, reacting to changes, and running scheduled work. A function runs when invoked rather than requiring an application server to continuously handle that function’s work.</p>
        </div>
      </section>

      <section className="about-lambda-section" aria-labelledby="lambda-workflow-title">
        <div className="about-lambda-section-heading">
          <div><h2 id="lambda-workflow-title">Basic Lambda workflow</h2><p>Configuration and event input lead to an invocation and an observable outcome.</p></div>
        </div>
        <ol className="lambda-workflow-diagram">
          {workflow.map(({ title, detail, icon }, index) => {
            const Icon = icons[icon]
            return (
              <li className="lambda-workflow-step" key={title}>
                <span className="lambda-workflow-icon"><Icon size={17} /></span>
                <span className="lambda-workflow-copy"><strong>{title}</strong><small>{detail}</small></span>
                {index < workflow.length - 1 && <icons.ArrowRight className="lambda-workflow-arrow" size={15} aria-hidden="true" />}
              </li>
            )
          })}
        </ol>
      </section>

      <section className="about-lambda-section" aria-labelledby="lambda-concepts-title">
        <div className="about-lambda-section-heading">
          <div><h2 id="lambda-concepts-title">Core concepts</h2><p>The building blocks behind a Lambda function lifecycle.</p></div>
        </div>
        <div className="lambda-concept-grid">
          {concepts.map(({ title, description, icon }) => {
            const Icon = icons[icon]
            return (
              <article className="lambda-concept-card" key={title}>
                <span className="lambda-concept-icon"><Icon size={17} /></span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="about-lambda-section" aria-labelledby="simulation-mapping-title">
        <div className="about-lambda-section-heading">
          <div><h2 id="simulation-mapping-title">Simulation Mapping</h2><p>How Lambda concepts are represented in LambdaLab.</p></div>
        </div>
        <div className="lambda-mapping-table-wrap">
          <table className="lambda-mapping-table">
            <thead><tr><th>AWS Lambda concept</th><th>LambdaLab simulation feature</th></tr></thead>
            <tbody>{mapping.map(([concept, feature]) => (
              <tr key={concept}><th scope="row">{concept}</th><td>{feature}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <div className="about-lambda-disclaimer">
        <icons.ShieldCheck size={15} />
        <p><strong>Simulation Mode:</strong> LambdaLab is an educational browser-based simulation. It does not connect to AWS infrastructure, deploy functions, start real runtimes, or execute the source code entered here.</p>
      </div>
    </div>
  )
}
