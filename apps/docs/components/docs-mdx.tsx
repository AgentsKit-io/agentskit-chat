import { Card, Cards } from 'fumadocs-ui/components/card'
import { Callout } from 'fumadocs-ui/components/callout'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { Framework, FrameworkTabs } from '@/components/framework-tabs'
import { InstallCommand } from '@/components/install-command'
import { Mermaid } from '@/components/mermaid'
import { Pre } from '@/components/code-block'
import { SurfaceGrid } from '@/components/surface-grid'

/** Components available inside canonical docs MDX/Markdown. */
export const docsMdxComponents = {
  Card,
  Cards,
  Callout,
  Tab,
  Tabs,
  Framework,
  FrameworkTabs,
  InstallCommand,
  SurfaceGrid,
  Mermaid,
  pre: Pre,
  // Fumadocs may emit mermaid fences as code blocks with language mermaid —
  // handled via custom remark if needed; authors can also use <Mermaid chart="..." />.
}
