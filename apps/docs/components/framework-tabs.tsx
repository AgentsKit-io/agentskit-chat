'use client'

import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'

const STORAGE_KEY = 'agentskit-chat:framework'
const EVENT = 'agentskit-chat:framework-change'

const LABELS: Record<string, string> = {
  react: 'React',
  vue: 'Vue',
  svelte: 'Svelte',
  solid: 'Solid',
  angular: 'Angular',
  'react-native': 'React Native',
  ink: 'Ink',
}

type FrameworkProps = {
  readonly name: string
  readonly label?: string
  readonly children: ReactNode
}

export function Framework({ children }: FrameworkProps) {
  return <>{children}</>
}
Framework.displayName = 'Framework'

function readStored(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function subscribe(listener: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}

function setFramework(value: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT))
}

function collect(children: ReactNode): ReactElement<FrameworkProps>[] {
  const list: ReactElement<FrameworkProps>[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const type = child.type as { displayName?: string }
    if (type === Framework || type?.displayName === 'Framework') {
      list.push(child as ReactElement<FrameworkProps>)
    }
  })
  return list
}

export function FrameworkTabs({
  children,
  defaultValue = 'react',
}: {
  readonly children: ReactNode
  readonly defaultValue?: string
}) {
  const items = useMemo(() => collect(children), [children])
  const stored = useSyncExternalStore(subscribe, readStored, () => null)
  const [local, setLocal] = useState(defaultValue)
  const active = items.some((item) => item.props.name === stored)
    ? (stored as string)
    : items.some((item) => item.props.name === local)
      ? local
      : (items[0]?.props.name ?? defaultValue)
  const current = items.find((item) => item.props.name === active) ?? items[0]

  if (items.length === 0) return null

  return (
    <div className="not-prose my-5 overflow-hidden rounded-xl border border-fd-border bg-fd-card">
      <div
        role="tablist"
        aria-label="Framework examples"
        className="flex flex-wrap gap-1 border-b border-fd-border bg-fd-secondary/40 p-2"
      >
        {items.map((item) => {
          const name = item.props.name
          const selected = name === active
          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`min-h-11 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                selected
                  ? 'bg-fd-background text-fd-foreground shadow-sm'
                  : 'text-fd-muted-foreground hover:bg-fd-background/70 hover:text-fd-foreground'
              }`}
              onClick={() => {
                setLocal(name)
                setFramework(name)
              }}
            >
              {item.props.label ?? LABELS[name] ?? name}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" className="prose max-w-none p-4 dark:prose-invert">
        {current?.props.children}
      </div>
    </div>
  )
}
