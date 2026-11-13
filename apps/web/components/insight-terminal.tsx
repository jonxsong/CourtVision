"use client";

import { ArrowUp, Bot, LoaderCircle, RotateCcw, Sparkles, UserRound } from "lucide-react";
import { type FormEvent, useMemo, useRef, useState } from "react";
import { askCourtVision, type AskHistoryMessage } from "@/lib/live-data";

type ChatMessage = AskHistoryMessage & {
  id: string;
  sources?: string[];
  error?: boolean;
};

const SUGGESTIONS = [
  "Compare Luka Dončić and Shai Gilgeous-Alexander this season.",
  "Who are the NBA scoring leaders right now?",
  "Break down Stephen Curry's shot profile.",
  "What does true shooting percentage tell us?",
];

function messageId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function displayAnswer(value: string) {
  return value.replace(/\*\*/g, "").replace(/^#{1,6}\s+/gm, "");
}

export function InsightTerminal() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const history = useMemo<AskHistoryMessage[]>(
    () => messages.filter((message) => !message.error).map(({ role, content }) => ({ role, content })),
    [messages],
  );

  async function submitQuestion(event?: FormEvent) {
    event?.preventDefault();
    const prompt = question.trim();
    if (!prompt || pending) return;
    const userMessage: ChatMessage = { id: messageId(), role: "user", content: prompt };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setPending(true);
    controller.current = new AbortController();
    try {
      const result = await askCourtVision(prompt, history, controller.current.signal);
      setMessages((current) => [...current, {
        id: messageId(), role: "assistant", content: result.answer, sources: result.sources,
      }]);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Ask CV could not answer right now.";
      setMessages((current) => [...current, {
        id: messageId(), role: "assistant", content: message, error: true,
      }]);
    } finally {
      setPending(false);
      controller.current = null;
    }
  }

  function resetChat() {
    controller.current?.abort();
    setPending(false);
    setMessages([]);
    setQuestion("");
  }

  return <div className="insight-terminal ask-terminal">
    <div className="terminal-head">
      <span><Sparkles size={16} /> Ask CV · grounded NBA research</span>
      <div className="terminal-actions"><span className="live-data-badge"><i /> NBA data connected</span>{messages.length > 0 && <button type="button" onClick={resetChat}><RotateCcw size={13} /> New chat</button>}</div>
    </div>

    <div className="chat-scroll" aria-live="polite">
      {messages.length === 0 ? <div className="terminal-empty">
        <div className="insight-glyph"><Sparkles size={35} /></div>
        <h2>Ask anything about the NBA.</h2>
        <p>Ask CV can research current players, compare production, inspect shot profiles, explain metrics, and read today&apos;s game slate. Current facts are retrieved from CourtVision tools before the answer is written.</p>
        <div className="prompt-chips">{SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => setQuestion(suggestion)}>{suggestion}</button>)}</div>
      </div> : <div className="chat-thread">{messages.map((message) => <article key={message.id} className={`chat-message ${message.role}${message.error ? " error" : ""}`}>
        <div className="chat-avatar">{message.role === "assistant" ? <Bot size={17} /> : <UserRound size={17} />}</div>
        <div><small>{message.role === "assistant" ? "Ask CV" : "You"}</small><p>{message.role === "assistant" ? displayAnswer(message.content) : message.content}</p>{message.sources && message.sources.length > 0 && <div className="source-chips">{message.sources.map((source) => <span key={source}>{source}</span>)}</div>}</div>
      </article>)}{pending && <article className="chat-message assistant"><div className="chat-avatar"><LoaderCircle className="spin" size={17} /></div><div><small>Ask CV</small><p>Retrieving CourtVision data and checking the numbers…</p></div></article>}</div>}
    </div>

    <form onSubmit={submitQuestion} className="question-box chat-composer">
      <label className="sr-only" htmlFor="ask-cv-question">Ask an NBA question</label>
      <textarea id="ask-cv-question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitQuestion(); } }} placeholder="Ask about a player, matchup, stat, shot profile, or tonight's games…" maxLength={500} disabled={pending} />
      <button aria-label="Send question" disabled={pending || question.trim().length < 2}>{pending ? <LoaderCircle className="spin" size={18} /> : <ArrowUp size={18} />}</button>
      <small>Powered by OpenAI · grounded in CourtVision NBA tools · current facts are cited</small>
    </form>
  </div>;
}
