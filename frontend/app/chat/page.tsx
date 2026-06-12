"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Database, Trash2, MessageSquare, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useStore } from "@/store/useStore";
import { ragChat } from "@/lib/api";

const SUGGESTIONS = [
  "Which contracts allow unlimited sub-processing?",
  "Show me all data retention clauses",
  "What DPDP violations were found?",
  "Compare termination clauses across vendors",
];

export default function ChatPage() {
  const { chatHistory, addChatMessage, clearChat } = useStore();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState("org_001");
  const [projectId, setProjectId] = useState("proj_001");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, loading]);

  async function send() {
    const q = query.trim(); if (!q || loading) return;
    setQuery(""); addChatMessage({ role: "user", content: q }); setLoading(true);
    try {
      const res = await ragChat(orgId, projectId, q, chatHistory.map(m => ({ role: m.role, content: m.content })));
      addChatMessage({ role: "assistant", content: res.answer, sources: res.sources });
    } catch (e: unknown) {
      addChatMessage({ role: "assistant", content: `Error: ${e instanceof Error ? e.message : "Something went wrong"}` });
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <Navbar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: "72px" }}>

        {/* header bar */}
        <div style={{ padding: "16px 28px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "var(--accent-muted)", border: "1px solid var(--border-bright)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Database size={18} color="var(--accent)" />
            </div>
            <div>
              <p style={{ fontWeight: 700, color: "var(--accent)", fontSize: "15px" }}>RAG Contract Chat</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>ChromaDB + Qwen3-32B · Ask across all project contracts</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input className="input-field" style={{ width: "130px", fontSize: "13px", padding: "9px 14px" }} placeholder="Org ID" value={orgId} onChange={e => setOrgId(e.target.value)} />
            <input className="input-field" style={{ width: "150px", fontSize: "13px", padding: "9px 14px" }} placeholder="Project ID" value={projectId} onChange={e => setProjectId(e.target.value)} />
            {chatHistory.length > 0 && (
              <button onClick={clearChat} style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Trash2 size={14} color="#ff7070" />
              </button>
            )}
          </div>
        </div>

        {/* messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
          {chatHistory.length === 0 && (
            <div style={{ maxWidth: "640px", margin: "40px auto 0", width: "100%" }}>
              <div style={{ textAlign: "center", marginBottom: "48px" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "24px", background: "var(--accent-muted)", border: "1px solid var(--border-bright)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                  <MessageSquare size={36} color="var(--accent)" />
                </div>
                <h2 className="font-display" style={{ fontSize: "clamp(40px, 6vw, 72px)", color: "var(--accent)", lineHeight: 0.9, letterSpacing: "-0.02em" }}>
                  ASK YOUR<br /><span style={{ color: "var(--white)" }}>CONTRACTS</span>
                </h2>
                <p style={{ marginTop: "16px", fontSize: "15px", color: "var(--text-body)" }}>
                  Natural language queries across all documents. Answers grounded in actual contract text.
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => setQuery(s)} className="card" style={{
                    padding: "16px 18px", textAlign: "left", fontSize: "13px", color: "var(--text-body)",
                    background: "var(--bg-card)", cursor: "pointer", border: "1px solid var(--border)",
                    borderRadius: "16px", transition: "all 0.2s",
                  }}>
                    <span style={{ color: "var(--accent)" }}>→ </span>{s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatHistory.map((msg, i) => (
            <div key={i} style={{ display: "flex", gap: "12px", maxWidth: "800px", margin: "0 auto", width: "100%", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "12px", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: msg.role === "user" ? "var(--accent)" : "var(--bg-card)",
                border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
              }}>
                {msg.role === "user" ? <User size={15} color="var(--bg)" /> : <Bot size={15} color="var(--accent)" />}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div className={msg.role === "user" ? "bubble-user" : "bubble-ai"} style={{ padding: "14px 18px", maxWidth: "85%", fontSize: "14px", lineHeight: "1.65" }}>
                  {msg.content}
                </div>

                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ width: "100%" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "8px" }}>SOURCES</p>
                    {msg.sources.map((src, j) => (
                      <div key={j} style={{ padding: "12px 16px", borderRadius: "12px", background: "var(--accent-muted)", border: "1px solid var(--border)", display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "6px" }}>
                        <Database size={13} color="var(--accent)" style={{ flexShrink: 0, marginTop: "2px" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)" }}>{src.filename}</span>
                            <span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "10px" }}>{src.clause_id}</span>
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{Math.round(src.relevance_score * 100)}%</span>
                          </div>
                          <p style={{ fontSize: "12px", color: "var(--text-body)" }}>{src.clause_text}</p>
                        </div>
                        <ExternalLink size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: "12px", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: "var(--bg-card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Bot size={15} color="var(--accent)" />
              </div>
              <div className="bubble-ai" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "10px" }}>
                <Loader2 size={14} color="var(--accent)" className="anim-spin" />
                <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Searching contracts…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* input bar */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border)", background: "rgba(35,0,43,0.92)", backdropFilter: "blur(16px)" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", gap: "12px" }}>
            <input className="input-field" style={{ flex: 1 }}
              placeholder="Ask about any clause, regulation, or risk…"
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} disabled={loading} />
            <button className="btn-primary" onClick={send} disabled={!query.trim() || loading}
              style={{ opacity: !query.trim() || loading ? 0.4 : 1, padding: "12px 24px" }}>
              {loading ? <Loader2 size={16} className="anim-spin" /> : <Send size={16} />}
              Send
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: "12px", marginTop: "8px", color: "var(--text-muted)" }}>
            Answers grounded in contract corpus · Not legal advice
          </p>
        </div>
      </div>
    </div>
  );
}
