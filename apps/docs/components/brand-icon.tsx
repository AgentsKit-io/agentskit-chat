const BRAND_COLORS: Record<string, string> = {
  react: '#61DAFB',
  vuedotjs: '#4FC08D',
  svelte: '#FF3E00',
  solid: '#76B3E1',
  angular: '#DD0031',
  expo: '#E7EDF4',
  typescript: '#3178C6',
}

function BrandShape({ slug }: { slug: string }) {
  if (slug === 'react') return <>
    <ellipse cx="12" cy="12" rx="10" ry="4.2" />
    <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
  </>
  if (slug === 'vuedotjs') return <path fill="currentColor" stroke="none" d="M24 1.61H14.06L12 5.16 9.94 1.61H0L12 22.39 24 1.61ZM12 14.08 5.16 2.23h4.43L12 6.41l2.41-4.18h4.43L12 14.08Z" />
  if (slug === 'svelte') return <path d="M17.4 5.2a4.4 4.4 0 0 0-6-1.4L6.8 6.7a3.8 3.8 0 0 0-1.2 5.2 4.2 4.2 0 0 0 5.8 1.3l2.5-1.6a1.5 1.5 0 0 1 2.1.5 1.4 1.4 0 0 1-.5 2l-4.7 3a1.8 1.8 0 0 1-2.5-.6M6.6 18.8a4.4 4.4 0 0 0 6 1.4l4.6-2.9a3.8 3.8 0 0 0 1.2-5.2 4.2 4.2 0 0 0-5.8-1.3l-2.5 1.6A1.5 1.5 0 0 1 8 11.9a1.4 1.4 0 0 1 .5-2l4.7-3a1.8 1.8 0 0 1 2.5.6" />
  if (slug === 'solid') return <>
    <path fill="currentColor" stroke="none" opacity=".75" d="M4 7 11 2l9 3-7 5-9-3Z" />
    <path fill="currentColor" stroke="none" d="m4 9 9 3 7-5v6l-9 6-7-3V9Zm0 9 7 2 9-5v3l-9 5-7-2v-3Z" />
  </>
  if (slug === 'angular') return <>
    <path d="M12 2 3 5.2 4.4 18 12 22l7.6-4L21 5.2 12 2Z" />
    <path d="m8 17 4-10 4 10M9.5 13.5h5" />
  </>
  if (slug === 'expo') return <path d="M2.5 20.5 10 5.2c1-2 3-2 4 0l7.5 15.3M7 16l5-8 5 8" />
  if (slug === 'typescript') return <>
    <rect x="2" y="2" width="20" height="20" rx="2" fill="currentColor" stroke="none" />
    <text x="12" y="16" textAnchor="middle" fill="#fff" stroke="none" fontFamily="ui-monospace, monospace" fontSize="9" fontWeight="700">TS</text>
  </>
  return null
}

export function BrandIcon({
  slug,
  label,
  size = 20,
  imgClass = '',
}: {
  slug: string | null
  label: string
  size?: number
  imgClass?: string
}) {
  const monogram = label.replace(/[^a-zA-Z0-9]/g, '').charAt(0).toUpperCase() || '•'
  if (!slug || !BRAND_COLORS[slug]) {
    return <span
      aria-hidden="true"
      className="inline-flex items-center justify-center font-mono font-bold text-ak-graphite"
      style={{ width: size, height: size, fontSize: size * 0.7 }}
    >{monogram}</span>
  }

  return <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={imgClass}
    style={{ width: size, height: size, color: BRAND_COLORS[slug] }}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <BrandShape slug={slug} />
  </svg>
}
