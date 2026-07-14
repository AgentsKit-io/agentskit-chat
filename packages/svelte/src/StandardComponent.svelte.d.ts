import type { Component } from 'svelte'
import type { ComponentManifest } from '@agentskit/chat'
import type { ComponentInteractionEvent, ComponentRenderFrame } from '@agentskit/chat/protocol'
declare const StandardComponent: Component<{ frame: ComponentRenderFrame; manifest: ComponentManifest; onInteract: (event: ComponentInteractionEvent) => void; disabled?: boolean }>
export default StandardComponent
