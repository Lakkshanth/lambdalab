import { useRef } from 'react'

export default function CodeEditor({ value, onChange, onSave, language, name }) {
  const textareaRef = useRef(null)
  const lineCount = Math.max(1, value.split('\n').length)

  function handleKeyDown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      onSave()
      return
    }

    if (event.key === 'Tab') {
      event.preventDefault()
      const textarea = textareaRef.current
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const nextValue = `${value.slice(0, start)}  ${value.slice(end)}`
      onChange(nextValue)
      requestAnimationFrame(() => {
        textarea.selectionStart = start + 2
        textarea.selectionEnd = start + 2
      })
      return
    }

    if (event.key === 'Enter') {
      const textarea = textareaRef.current
      const lineStart = value.lastIndexOf('\n', textarea.selectionStart - 1) + 1
      const indentation = value.slice(lineStart, textarea.selectionStart).match(/^\s*/)?.[0] ?? ''
      if (indentation) {
        event.preventDefault()
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const nextValue = `${value.slice(0, start)}\n${indentation}${value.slice(end)}`
        onChange(nextValue)
        requestAnimationFrame(() => {
          textarea.selectionStart = start + indentation.length + 1
          textarea.selectionEnd = start + indentation.length + 1
        })
      }
    }
  }

  function syncScroll(event) {
    const gutter = event.currentTarget.previousElementSibling
    if (gutter) gutter.scrollTop = event.currentTarget.scrollTop
  }

  return (
    <div className="code-editor" data-language={language}>
      <div className="code-editor-gutter" aria-hidden="true">
        {Array.from({ length: lineCount }, (_, index) => <span key={index}>{index + 1}</span>)}
      </div>
      <textarea
        ref={textareaRef}
        className="code-editor-input"
        aria-label={name}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
        wrap="off"
      />
    </div>
  )
}
