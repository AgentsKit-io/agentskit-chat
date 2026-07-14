<script lang="ts">
  import { resolveChoiceListFrame, selectChoice } from '@agentskit/chat'
  import type { ComponentManifest } from '@agentskit/chat'
  import type { ComponentSelectionEvent } from '@agentskit/chat/protocol'

  let { frame, manifest, onSelect, disabled = false }: { frame: unknown; manifest: ComponentManifest; onSelect: (event: ComponentSelectionEvent) => void; disabled?: boolean } = $props()
  const resolved = $derived(resolveChoiceListFrame(frame, manifest))
</script>

{#if resolved.ok}
  <fieldset aria-label={resolved.props.prompt} data-ak-component="choice-list">
    <legend>{resolved.props.prompt}</legend>
    {#each resolved.props.choices as choice (choice.id)}
      <button type="button" {disabled} onclick={() => onSelect(selectChoice(resolved.frame, choice.id))}>
        <span>{choice.label}</span>{#if choice.description !== undefined}<small>{choice.description}</small>{/if}
      </button>
    {/each}
  </fieldset>
{/if}
