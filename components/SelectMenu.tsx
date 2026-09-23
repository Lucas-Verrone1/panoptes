'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Icon } from './Icon'

export type SelectOption = { value: string; label: string; description?: string }

type Props = {
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  ariaLabel: string
  className?: string
  triggerClassName?: string
  leading?: ReactNode
  eyebrow?: string
}

export function SelectMenu({ id, name, value, onChange, options, ariaLabel, className = '', triggerClassName = '', leading, eyebrow }: Props) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const reactId = useId().replace(/:/g, '')
  const listId = `${id || reactId}-listbox`
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value))
  const selected = options[selectedIndex] ?? options[0]

  useEffect(() => {
    const handlePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setActiveIndex(selectedIndex)
    requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus())
  }, [open, selectedIndex])

  const choose = (index: number) => {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const onOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      const next = (index + step + options.length) % options.length
      setActiveIndex(next)
      optionRefs.current[next]?.focus()
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const next = event.key === 'Home' ? 0 : options.length - 1
      setActiveIndex(next)
      optionRefs.current[next]?.focus()
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); choose(index)
    } else if (event.key === 'Escape') {
      event.preventDefault(); setOpen(false); triggerRef.current?.focus()
    }
  }

  return (
    <div className={`select-menu ${className}`} ref={rootRef}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className={`select-trigger ${triggerClassName}`}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        onClick={() => setOpen(current => !current)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true)
          } else if (event.key === 'Escape') setOpen(false)
        }}
      >
        {leading}
        <span className="select-trigger-copy">
          {eyebrow && <small>{eyebrow}</small>}
          <strong>{selected?.label}</strong>
        </span>
        <Icon name="chevron-down" size={15} className="select-chevron" />
      </button>
      {open && (
        <div id={listId} className="select-menu-popover" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={element => { optionRefs.current[index] = element }}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`select-option ${option.value === value ? 'selected' : ''} ${index === activeIndex ? 'active' : ''}`}
              onClick={() => choose(index)}
              onKeyDown={event => onOptionKeyDown(event, index)}
            >
              <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
              {option.value === value && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
