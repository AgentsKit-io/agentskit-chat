import { createChatHandler } from '@agentskit/chat-server'
import type { ChatHandlerOptions } from '@agentskit/chat-server'
import type { ChatDefinition, SessionStorage } from '@agentskit/chat'

type TenantContext = { readonly tenantId: string }
type TenantHandlerOptions = {
  readonly authenticate: NonNullable<ChatHandlerOptions<TenantContext>['authenticate']>
  readonly definitionFor: (tenantId: string) => ChatDefinition
  readonly storageFor: (tenantId: string) => SessionStorage
}

export const createTenantHandler = (options: TenantHandlerOptions) => createChatHandler<TenantContext>({
  authenticate: options.authenticate,
  resolveDefinition: context => options.definitionFor(context!.tenantId),
  sessionStorage: context => options.storageFor(context!.tenantId),
})
