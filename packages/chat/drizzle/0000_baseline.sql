CREATE TABLE IF NOT EXISTS "agentskit_chat_decisions" (
	"tenant_id" text NOT NULL,
	"session_id" text NOT NULL,
	"tool_call_id" text NOT NULL,
	"status" text NOT NULL,
	"decision" text,
	"reason" text,
	"record" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agentskit_chat_decisions_pkey" PRIMARY KEY("tenant_id","session_id","tool_call_id"),
	CONSTRAINT "agentskit_chat_decisions_status_check" CHECK ("agentskit_chat_decisions"."status" IN ('pending', 'claimed', 'complete', 'failed', 'denied')),
	CONSTRAINT "agentskit_chat_decisions_decision_check" CHECK ("agentskit_chat_decisions"."decision" IN ('approve', 'deny'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agentskit_chat_sessions" (
	"tenant_id" text NOT NULL,
	"session_id" text NOT NULL,
	"cursor" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agentskit_chat_sessions_pkey" PRIMARY KEY("tenant_id","session_id"),
	CONSTRAINT "agentskit_chat_sessions_cursor_check" CHECK ("agentskit_chat_sessions"."cursor" >= 0)
);
