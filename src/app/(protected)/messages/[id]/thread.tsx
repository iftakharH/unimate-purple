"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { timeAgo } from "@/lib/format";
import { initialActionState } from "@/lib/validation/helpers";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { markConversationReadAction, sendMessageAction } from "../actions";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

/**
 * The live thread: server-rendered history + a Realtime subscription that
 * appends new messages as they land (the sender's own included — the DB is
 * always the source of truth, so refresh and Realtime converge on the same
 * list). Read receipts update on view and on each incoming message.
 */
export function Thread({
  conversationId,
  userId,
  initialMessages,
}: {
  conversationId: string;
  userId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [state, action] = useActionState(sendMessageAction, initialActionState);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    void markConversationReadAction(conversationId);
  }, [conversationId]);

  useEffect(() => {
    const channel = supabase
      .channel(`thread-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) =>
            prev.some((message) => message.id === row.id) ? prev : [...prev, row],
          );
          if (row.sender_id !== userId) {
            void markConversationReadAction(conversationId);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (state.status === "success" && inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }, [state]);

  return (
    <div className="space-y-4">
      <div aria-live="polite" className="space-y-2.5">
        {messages.length === 0 && (
          <p className="rounded-2xl border bg-card p-4 text-center text-sm text-muted-foreground">
            Say hello — agree on a time and a place on campus to meet.
          </p>
        )}

        {messages.map((message) => {
          const mine = message.sender_id === userId;
          return (
            <div
              key={message.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[82%] rounded-3xl px-4 py-2.5 text-sm shadow-xs",
                  mine
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md border bg-card",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                <p
                  suppressHydrationWarning
                  className={cn(
                    "tabular mt-1 text-[10px]",
                    mine ? "text-primary-foreground/60" : "text-muted-foreground",
                  )}
                >
                  {timeAgo(message.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-center text-sm text-destructive">
          {state.message}
        </p>
      )}

      <form
        action={action}
        className="glass sticky bottom-4 flex items-center gap-2 rounded-full p-1.5 pl-4"
      >
        <input type="hidden" name="conversation_id" value={conversationId} />
        <input
          ref={inputRef}
          name="body"
          required
          maxLength={2000}
          placeholder="Write a message…"
          aria-label="Message"
          autoComplete="off"
          className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <SubmitButton
          size="icon"
          className="rounded-full"
          pendingText=""
          aria-label="Send message"
        >
          <Send aria-hidden />
        </SubmitButton>
      </form>
    </div>
  );
}
