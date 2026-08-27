"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

type FeedbackKind = "MESSAGE" | "RECOMMENDATION";

export function FooterFeedbackForm({ className }: { className?: string }) {
  const [kind, setKind] = useState<FeedbackKind>("MESSAGE");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await apiFetch<{ ok: boolean }>("/feedback/", {
        method: "POST",
        body: JSON.stringify({
          kind,
          name: name.trim(),
          email: email.trim(),
          body: body.trim(),
        }),
      });
      setDone(true);
      setName("");
      setEmail("");
      setBody("");
    } catch (err) {
      setError(isApiError(err) ? err.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <p className={cn("text-body-sm text-primary", className)}>
        Merci — votre message a bien été reçu.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-3", className)}>
      <div className="flex gap-2">
        {(
          [
            ["MESSAGE", "Message"],
            ["RECOMMENDATION", "Recommandation"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={cn(
              "rounded-none px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors",
              kind === value
                ? "bg-primary text-white"
                : "bg-white/10 text-white/70 hover:bg-white/15"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={120}
        placeholder="Votre nom"
        className="h-10 w-full rounded-none border border-white/15 bg-white/5 px-3 text-body-sm text-white outline-none placeholder:text-white/35 focus:border-primary"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        maxLength={254}
        placeholder="Email (optionnel)"
        className="h-10 w-full rounded-none border border-white/15 bg-white/5 px-3 text-body-sm text-white outline-none placeholder:text-white/35 focus:border-primary"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={5}
        maxLength={3000}
        rows={3}
        placeholder={
          kind === "RECOMMENDATION"
            ? "Votre recommandation pour SERVIS…"
            : "Votre message…"
        }
        className="w-full rounded-none border border-white/15 bg-white/5 px-3 py-2 text-body-sm text-white outline-none placeholder:text-white/35 focus:border-primary"
      />
      {error && <p className="text-caption text-error">{error}</p>}
      <Button
        type="submit"
        variant="primary"
        loading={sending}
        className="rounded-none uppercase tracking-wide"
      >
        Envoyer
      </Button>
    </form>
  );
}
