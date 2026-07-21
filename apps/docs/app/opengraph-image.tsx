import { ImageResponse } from 'next/og'

export const alt = 'AgentsKit Chat — One agent experience. Every surface.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0d1117', color: '#e6edf3', padding: '72px 84px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 28, fontWeight: 700 }}>
        <div style={{ display: 'flex', width: 48, height: 48, alignItems: 'center', justifyContent: 'center', border: '2px solid #6157ff', borderRadius: 14, color: '#8b82ff' }}>•••</div>
        AgentsKit Chat
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 950, fontSize: 78, lineHeight: 1.02, letterSpacing: '-4px', fontWeight: 750 }}>
          <span>One agent experience.</span>
          <span style={{ color: '#8b949e' }}>Every surface.</span>
        </div>
        <div style={{ fontSize: 27, color: '#a8b3c2' }}>Define once. Render natively on web, mobile, and terminal.</div>
      </div>
      <div style={{ display: 'flex', gap: 18, color: '#8b949e', fontSize: 22 }}>
        <span>React</span><span>Vue</span><span>Svelte</span><span>Angular</span><span>React Native</span><span>Ink</span>
      </div>
    </div>,
    size,
  )
}
