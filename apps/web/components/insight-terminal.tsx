"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { DemoBadge } from "./demo-badge";

const prompts = ["What drives Miles Avery’s efficiency?", "Where did the game turn?", "Compare the top scoring profiles."];

export function InsightTerminal() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(false);
  const submit = (event: FormEvent) => { event.preventDefault(); if (question.trim().length >= 3) setAnswer(true); };
  return (
    <div className="insight-terminal">
      <div className="terminal-head"><span><Sparkles size={16} /> Research workspace</span><DemoBadge /></div>
      {!answer ? <div className="terminal-empty"><div className="insight-glyph"><Sparkles size={35} /></div><h2>Ask a basketball question.</h2><p>Answers are built from typed statistical retrieval. Facts, sample sizes, and interpretation stay visibly separate.</p><div className="prompt-chips">{prompts.map(prompt => <button key={prompt} onClick={() => setQuestion(prompt)}>{prompt}</button>)}</div></div> : <article className="answer-card"><div className="answer-label"><Sparkles size={15} /> CourtVision analysis</div><h2>Miles Avery pairs scoring volume with efficient shot selection.</h2><p>In the deterministic 2025–26 demonstration dataset, Avery scores <strong>27.4 points per game</strong> on <strong>64.2% true shooting</strong> across 64 games.</p><div className="fact-grid"><div><small>Points per game</small><b>27.4</b><span>64-game sample</span></div><div><small>True shooting</small><b>64.2%</b><span>64-game sample</span></div><div><small>At-rim accuracy</small><b>68.4%</b><span>191 attempts</span></div></div><div className="interpretation"><small>Interpretation</small><p>The profile suggests that rim pressure and above-the-break volume create the efficiency. This is a descriptive interpretation, not a causal finding.</p></div><div className="limitations"><strong>Limitations</strong><span>Synthetic fixture data · No external model call · Not an NBA player</span></div></article>}
      <form onSubmit={submit} className="question-box"><textarea aria-label="Ask CourtVision" placeholder="Ask about a player, game, or trend…" value={question} onChange={event => { setQuestion(event.target.value); setAnswer(false); }} /><button aria-label="Submit question"><ArrowUp size={18} /></button><small>Demo retrieval · numerical claims cite fixture data</small></form>
    </div>
  );
}
