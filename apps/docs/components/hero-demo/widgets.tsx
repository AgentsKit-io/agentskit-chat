export function FlightList() {
  const flights = [
    { airline: 'Delta', dep: '06:15', arr: '14:45', dur: '5h 30m', stops: 'nonstop', price: 289 },
    { airline: 'JetBlue', dep: '09:40', arr: '18:05', dur: '5h 25m', stops: 'nonstop', price: 312 },
    { airline: 'United', dep: '13:20', arr: '23:55', dur: '7h 35m', stops: '1 stop · DEN', price: 248 },
  ]
  return (
    <div className="rounded-lg border border-ak-border bg-ak-midnight p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="font-mono text-xs text-ak-graphite">LAX → JFK · Apr 18</div>
        <span className="font-mono text-xs text-ak-graphite">3 results</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {flights.map((f) => (
          <div
            key={f.airline}
            className="flex items-center gap-3 rounded-md border border-ak-border bg-ak-surface p-2.5"
          >
            <div className="w-14 font-mono text-xs font-semibold text-ak-foam">{f.airline}</div>
            <div className="flex flex-1 items-center gap-2 font-mono text-sm text-ak-foam">
              <span>{f.dep}</span>
              <div className="flex flex-1 items-center gap-1 text-ak-graphite">
                <span className="h-px flex-1 bg-ak-border" />
                <span className="text-[10px]">{f.dur}</span>
                <span className="h-px flex-1 bg-ak-border" />
              </div>
              <span>{f.arr}</span>
            </div>
            <div className="w-20 text-right">
              <div className="font-semibold text-ak-foam">${f.price}</div>
              <div className="font-mono text-[10px] text-ak-graphite">{f.stops}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ApprovalCard() {
  return (
    <div className="rounded-lg border border-ak-border bg-ak-midnight p-3 shadow-lg">
      <div className="mb-2 font-mono text-xs text-ak-graphite">policy · requires confirmation</div>
      <div className="mb-3 text-sm text-ak-foam">
        Refund <span className="font-mono text-ak-blue">#4821</span> for <span className="font-mono">$84.00</span>?
      </div>
      <div className="flex gap-2">
        <span className="rounded-md bg-ak-green/15 px-3 py-1.5 font-mono text-xs font-semibold text-ak-green">Approve</span>
        <span className="rounded-md border border-ak-border px-3 py-1.5 font-mono text-xs text-ak-graphite">Deny</span>
      </div>
    </div>
  )
}

export function TerminalMirror() {
  return (
    <div className="overflow-hidden rounded-lg border border-ak-border bg-black/40 font-mono text-xs shadow-lg">
      <div className="border-b border-ak-border px-3 py-1.5 text-ak-graphite">ink · ops shell</div>
      <div className="space-y-1 p-3 text-ak-foam">
        <div><span className="text-ak-green">✓</span> checkout p95 <span className="text-ak-red">812ms</span> (+48%)</div>
        <div><span className="text-ak-blue">→</span> deploy 14:02 correlated</div>
        <div className="text-ak-graphite">same definition as web support chat</div>
      </div>
    </div>
  )
}

export function MobileShell() {
  return (
    <div className="mx-auto w-[min(100%,220px)] rounded-[1.4rem] border border-ak-border bg-ak-midnight p-2 shadow-xl">
      <div className="mb-2 flex justify-center">
        <span className="h-1 w-10 rounded-full bg-ak-border" />
      </div>
      <div className="rounded-xl border border-ak-border bg-ak-surface p-2.5">
        <div className="mb-2 font-mono text-[10px] text-ak-graphite">React Native · support</div>
        <div className="mb-2 rounded-lg bg-ak-blue/15 px-2 py-1.5 text-right text-xs text-ak-foam">Need a refund</div>
        <div className="rounded-lg bg-ak-midnight px-2 py-1.5 text-xs text-ak-foam">
          Same ChatDefinition as web.
        </div>
      </div>
    </div>
  )
}
