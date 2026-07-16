import { Card, Cards } from 'fumadocs-ui/components/card'
import { Callout } from 'fumadocs-ui/components/callout'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { Framework, FrameworkTabs } from '@/components/framework-tabs'
import { InstallCommand } from '@/components/install-command'
import { Mermaid } from '@/components/mermaid'
import { Pre } from '@/components/code-block'
import { SurfaceGrid } from '@/components/surface-grid'
import { BasicChatExample } from '@/components/examples/basic-chat'
import { ComponentGallery } from '@/components/examples/component-gallery'
import { AdaptersCallout, AgentsKitRef, EcosystemStrip } from '@/components/agentskit-ref'

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
  BasicChatExample,
  ComponentGallery,
  AgentsKitRef,
  AdaptersCallout,
  EcosystemStrip,
  pre: Pre,
}
