---
title: Angular quick start
description: Render an AgentsKit Chat definition with the native Angular shell.
---

# Angular quick start

## Install

```bash
pnpm add @agentskit/chat @agentskit/core @agentskit/angular @angular/core @angular/common rxjs
```

## Shell

```ts
import { Component } from '@angular/core'
import { AgentChatComponent } from '@agentskit/chat/angular'
import { createSupportChat } from './support-chat'
import { adapter } from './adapter'

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [AgentChatComponent],
  template: `
    <ak-agent-chat [definition]="supportChat" placeholder="Ask about the product">
      <ng-template #message let-message>
        <article [attr.data-role]="message.role">{{ message.content }}</article>
      </ng-template>
    </ak-agent-chat>
  `,
})
export class SupportComponent {
  readonly supportChat = createSupportChat(adapter)
}
```

`AgentChatComponent` delegates state, streaming, tools, confirmation, retry, editing, regeneration,
cancellation, and teardown to `AgentskitChat` from `@agentskit/angular`. Each mounted shell receives
an isolated service provider. Content templates customize `container`, `message`, `input`,
`thinking`, `confirmation`, and `choiceList` without entering the shared definition.

## Next

- [Get started overview](/docs/getting-started)
