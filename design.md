# AgentsKit Chat design system

AgentsKit Chat is a product in the AgentsKit ecosystem, with its own purpose and identity: define a chat experience once and render it natively across web, mobile, and terminal. Use the AgentsKit visual language without turning Chat into a copy of the AgentsKit home.

## Color and contrast

- Default to the dark theme. Use the generated `apps/docs/app/brand-tokens.css` tokens; do not edit generated token output directly.
- On the home only, legacy utility aliases map midnight/foam/graphite to the canonical background/foreground/muted tokens. Keep that compatibility mapping route-scoped so Fumadocs pages keep their own surface styling.
- Midnight (`#0d1117`) is the base, surface (`#161b22`) is for focused controls, foam (`#e6edf3`) is primary text, and graphite (`#8b949e`) is secondary text.
- Keep the product accent amber (`#f59e0b`) for Chat-specific emphasis. Blue (`#58a6ff`) and green (`#2ea043`) are quiet ecosystem signals for focus, links, and ambient background light.
- Maintain readable text contrast. Do not use low-opacity text for essential labels or body copy.

## Typography

- Use Inter for interface and body copy, Space Grotesk for display headings, and JetBrains Mono for commands, code, and compact uppercase labels.
- Keep a clear scale: strong compact labels, readable body text with relaxed line height, and display headings with tight leading and tracking.
- Sentence case is preferred. All public interface copy is English.

## Home background and glass

- The `/` route may use slow, broad blue/green radial light and the pointer-following liquid cursor. Keep the effect behind content, low opacity, pointer-transparent, desktop-only, and absent from documentation and internal routes.
- On coarse pointers and when reduced motion is requested, remove the moving cursor layer. Do not make content depend on animation.
- Reserve glass for the product header and the hero conversation demo: translucent midnight/surface fills, restrained backdrop blur, a fine border, and a soft shadow only where needed for separation. Keep the footer open and transparent, following the AgentsKit home footer hierarchy.
- Keep regular content sections open and transparent. Avoid turning every section into a card.

## Borders, surfaces, and radii

- Use the existing border and surface tokens. Borders should separate content subtly rather than frame every element.
- Use 24px corners for the main hero conversation surface, 18px on narrow screens, and smaller radii for controls and code panels. Primary actions may use pill shapes when they remain consistent with their interaction role.
- Preserve visible focus rings and clear interactive states.

## Motion

- Motion should explain the product: the existing interactive chat scenes demonstrate one definition across native shells. Preserve scene selection and playback behavior.
- The homepage framework reel rotates one framework name and mark at a time using the AgentsKit home cadence and restrained vertical flip. The code showcase cycles through all seven supported renderers; hover, keyboard focus, or manual selection pauses it.
- Use CSS transitions/animations for these small home-only transitions; do not add a motion dependency. Both stop under `prefers-reduced-motion`.
- The liquid cursor follows the pointer with a slow, soft transition; it must never obstruct input or content.
- Follow `prefers-reduced-motion`; avoid relying on continuous motion to communicate information.

## Responsive behavior and accessibility

- Keep the hero, install command, demo, and footer readable without horizontal page overflow. Let framework marks wrap and demo scene tabs scroll within their own rail.
- Keep touch targets at least 44px where interactive and preserve keyboard navigation and visible focus.
- Check text contrast, keyboard access, narrow-screen overflow, and reduced-motion behavior in a real browser.

## Reuse boundaries

- Reuse the AgentsKit home’s liquid cursor behavior and established brand tokens; do not add a UI or animation dependency for this treatment.
- Keep the ecosystem navigation bar shared and unchanged. This guide applies to the Chat home only; Fumadocs content and internal docs remain calm and free of cursor effects.
- The embedded ecosystem tour remains the shared `<agentskit-ecosystem>` element sourced from AgentsKit. Do not fork its product data or change its global navigation from this repository.
- Render the shared ecosystem tour with `data-visual="agentskit-home"` so the six product-specific accent colors stay subdued, while the current product remains selected.
- Use the AgentsKit home footer's Start / Build / Ecosystem / Community hierarchy. Read product links from the shared ecosystem manifest and mark Chat as the current product.
- Keep the current `HeroDemo`, `ProductHeader`, and `SiteFooter` components and refine them through scoped home styles rather than duplicating product components.
