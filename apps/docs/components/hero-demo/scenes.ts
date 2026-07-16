export type WidgetKind = 'flight' | 'terminal' | 'mobile' | 'approval'

export type Event =
  | { type: 'userType'; text: string; cps?: number }
  | { type: 'userSend' }
  | { type: 'thinking' }
  | { type: 'tool'; label: string; ms: number }
  | { type: 'widget'; kind: WidgetKind }
  | { type: 'assistantStream'; text: string; cps?: number }
  | { type: 'pause'; ms: number }

export type Scene = {
  readonly id: string
  readonly label: string
  readonly surface: 'web' | 'mobile' | 'terminal'
  readonly events: readonly Event[]
}

export const SCENES: readonly Scene[] = [
  {
    id: 'web-flights',
    label: 'web',
    surface: 'web',
    events: [
      { type: 'userType', text: 'flights LAX to NYC tomorrow' },
      { type: 'userSend' },
      { type: 'thinking' },
      { type: 'tool', label: 'flights.search({ from: "LAX", to: "JFK" })', ms: 800 },
      { type: 'widget', kind: 'flight' },
      { type: 'assistantStream', text: 'Three options under $320. Delta is the fastest nonstop.' },
      { type: 'pause', ms: 2200 },
    ],
  },
  {
    id: 'mobile-approve',
    label: 'mobile',
    surface: 'mobile',
    events: [
      { type: 'userType', text: 'refund order #4821' },
      { type: 'userSend' },
      { type: 'thinking' },
      { type: 'tool', label: 'orders.refund.propose({ id: "4821" })', ms: 600 },
      { type: 'widget', kind: 'approval' },
      { type: 'assistantStream', text: 'Needs your confirmation — same policy as web and CLI.' },
      { type: 'pause', ms: 2200 },
    ],
  },
  {
    id: 'terminal-ops',
    label: 'terminal',
    surface: 'terminal',
    events: [
      { type: 'userType', text: 'why is checkout latency up?' },
      { type: 'userSend' },
      { type: 'thinking' },
      { type: 'tool', label: 'metrics.query({ service: "checkout", window: "1h" })', ms: 700 },
      { type: 'widget', kind: 'terminal' },
      { type: 'assistantStream', text: 'p95 jumped after deploy 14:02. Same definition as the dashboard chat.' },
      { type: 'pause', ms: 2200 },
    ],
  },
  {
    id: 'web-same-def',
    label: 'one def',
    surface: 'web',
    events: [
      { type: 'userType', text: 'open the support chat on React Native' },
      { type: 'userSend' },
      { type: 'thinking' },
      { type: 'widget', kind: 'mobile' },
      { type: 'assistantStream', text: 'Same ChatDefinition. Native shell. Zero fork.' },
      { type: 'pause', ms: 2200 },
    ],
  },
] as const
