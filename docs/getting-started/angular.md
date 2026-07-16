# Angular quick start

Install the application shell and its native peers:

```bash
pnpm add @agentskit/chat @agentskit/chat/angular @agentskit/angular @angular/core @angular/common rxjs
```

Keep the definition in a framework-neutral module, then import the standalone component:

```ts
import { Component } from '@angular/core'
import { AgentChatComponent } from '@agentskit/chat/angular'
import { supportChat } from './support-chat'

@Component({
  selector: 'app-support', standalone: true, imports: [AgentChatComponent],
  template: `<ak-agent-chat [definition]="supportChat" placeholder="Ask about the product">
    <ng-template #message let-message><article [attr.data-role]="message.role">{{ message.content }}</article></ng-template>
  </ak-agent-chat>`,
})
export class SupportComponent { readonly supportChat = supportChat }
```

`AgentChatComponent` delegates state, streaming, tools, confirmation, retry, editing, regeneration, cancellation, and teardown to `AgentskitChat` from `@agentskit/angular`. Each mounted shell receives an isolated service provider. Content templates customize `container`, `message`, `input`, `thinking`, `confirmation`, and `choiceList` without entering the shared definition. A custom container receives the default `content` template and must render it with `ngTemplateOutlet`.

The default shell uses a polite log, semantic alerts, labeled controls, and native buttons/fieldset elements. A replacement template owns equivalent accessibility semantics.

