"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Building2, User, Puzzle, ArrowRight,
  Shield, AlertTriangle, Eye, Check, Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";

const TICKS = [
  "DPDP ACT 2023", "GDPR", "RBI GUIDELINES", "7 AI AGENTS",
  "REAL-TIME SSE", "MULTILINGUAL", "CONTRADICTION DETECTION",
  "GITHUB PR", "SLACK ALERTS", "VECTOR MEMORY", "CHROMADB", "LANGGRAPH",
];

const AGENTS = [
  { id: "1",  name: "Ingestor",   desc: "File validation · SHA-256 hash · job ID" },
  { id: "2A", name: "Extractor",  desc: "PDF/DOCX parsing → ClauseManifest" },
  { id: "2B", name: "Reg Loader", desc: "DPDP/GDPR/RBI corpus + live web search" },
  { id: "2C", name: "Memory",     desc: "ChromaDB embed · contradiction detect" },
  { id: "3",  name: "Classifier", desc: "Risk level + confidence · reflection loop" },
  { id: "5",  name: "Redliner",   desc: "Compliant clause replacement drafts" },
  { id: "6",  name: "Reporter",   desc: "GitHub PR · Slack · SSE pipeline_complete" },
];

export default function Home() {
  const [activeAgent, setActiveAgent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveAgent(p => (p + 1) % AGENTS.length), 1600);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Navbar />

      {/* HERO */}
      <section style={{ height: "100vh", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          transform: "scaleX(0.55)",
          transformOrigin: "center bottom",
          userSelect: "none",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}>
          {/* Row 1: THE FINE */}
          <div style={{ lineHeight: 0.82, position: "relative", display: "block" }}>
            <span className="font-display" style={{
              fontSize: "20vw", color: "var(--accent)",
              WebkitTextStroke: "2px var(--accent)",
            }}>THE</span>
            <span style={{ display: "inline-block", width: "2vw" }} />
            <span className="font-display" style={{
              fontSize: "20vw", color: "var(--accent)",
              display: "inline-block", transform: "skewX(-8deg)",
              WebkitTextStroke: "2px var(--accent)", // Makes the text physically bolder
            }}>FINE</span>
          </div>
          
          {/* Row 2: PRINT FINALLY. */}
          <div style={{ lineHeight: 0.82, position: "relative", display: "block", marginTop: "2vw" }}>
            <span className="font-display" style={{
              fontSize: "19vw", color: "var(--accent)",
              WebkitTextStroke: "2px var(--accent)",
            }}>PRINT</span>
            <span style={{ display: "inline-block", width: "1.5vw" }} />
            <span className="font-display" style={{
              fontSize: "19vw", color: "var(--accent)",
              WebkitTextStroke: "2px var(--accent)",
            }}>FINALLY.</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          LIGHT THEME CONTENT (Everything below Hero)
      ══════════════════════════════════════════ */}
      <div className="theme-light">
      
      {/* CTA strip */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "14px",
          padding: "48px 20px",
        }}
      >
        <Link href="/enterprise">
          <button className="btn-primary">
            <Building2 size={15} />
            Enterprise Dashboard
            <ArrowRight size={14} />
          </button>
        </Link>
        <Link href="/consumer">
          <button className="btn-ghost">
            <User size={15} />
            Consumer Tool
          </button>
        </Link>
      </div>

      {/* ══════════════════════════════════════════
          THREE SURFACES
      ══════════════════════════════════════════ */}
      <section style={{ padding: "120px 36px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ marginBottom: "72px" }}>
            <p className="section-label" style={{ marginBottom: "14px" }}>THREE DELIVERY SURFACES</p>
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(60px, 9vw, 120px)",
                color: "var(--accent)",
                lineHeight: 0.88,
                letterSpacing: "-0.02em",
              }}
            >
              ONE<br />
              <span style={{ color: "rgba(232,148,255,0.35)" }}>INTELLIGENCE</span>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {[
              { icon: Building2, label: "Enterprise", title: "Pipeline", desc: "7-agent LangGraph orchestration. Risk classification, redlining, GitHub PR, Slack alerts — all under 45 seconds.", href: "/enterprise", cta: "Open Dashboard" },
              { icon: User, label: "Consumer", title: "Clarity", desc: "Photograph a physical document. Plain-language breakdown in Hindi, Kannada, Tamil, Telugu or 5 more languages.", href: "/consumer", cta: "Try It Free" },
              { icon: Puzzle, label: "Browser", title: "Extension", desc: "MutationObserver detects every ToS wall. Icon glows amber → red. Sidebar analysis without leaving the page.", href: "#extension", cta: "Learn More" },
            ].map((card, i) => (
              <div key={i} className="card" style={{ padding: "36px", display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "var(--accent-muted)", border: "1px solid var(--border-bright)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <card.icon size={22} color="var(--accent)" />
                </div>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: "4px" }}>{card.label}</p>
                  <h3 className="font-display" style={{ fontSize: "clamp(36px, 4vw, 54px)", color: "var(--accent)", lineHeight: 0.9 }}>{card.title}</h3>
                </div>
                <p style={{ fontSize: "14px", lineHeight: "1.65", color: "var(--text-body)", flex: 1 }}>{card.desc}</p>
                <Link href={card.href}>
                  <button className="btn-ghost" style={{ fontSize: "13px", padding: "10px 20px" }}>{card.cta} <ArrowRight size={13} /></button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          7 AGENTS
      ══════════════════════════════════════════ */}
      <section style={{ padding: "120px 36px", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
          <div>
            <p className="section-label" style={{ marginBottom: "14px" }}>LANGGRAPH ORCHESTRATION</p>
            <h2 className="font-display" style={{ fontSize: "clamp(64px, 8vw, 110px)", lineHeight: 0.88, letterSpacing: "-0.02em", color: "var(--accent)", marginBottom: "28px" }}>
              7<br /><span style={{ color: "rgba(232,148,255,0.35)" }}>AGENTS.</span><br />1<br /><span style={{ color: "rgba(232,148,255,0.35)" }}>PIPELINE.</span>
            </h2>
            <p style={{ fontSize: "15px", lineHeight: "1.7", color: "var(--text-body)", maxWidth: "380px" }}>
              Parallel fan-out for extraction, regulation loading, and memory scanning. Risk report in under 45 seconds.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {AGENTS.map((agent, i) => (
              <div key={agent.id} onClick={() => setActiveAgent(i)} style={{
                display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px",
                borderRadius: "14px", cursor: "pointer", transition: "all 0.35s ease",
                background: activeAgent === i ? "var(--accent-muted)" : "transparent",
                border: `1px solid ${activeAgent === i ? "var(--border-bright)" : "transparent"}`,
                transform: activeAgent === i ? "translateX(8px)" : "translateX(0)",
              }}>
                <div style={{
                  width: "38px", height: "38px", borderRadius: "10px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: 800, flexShrink: 0,
                  background: activeAgent === i ? "var(--accent)" : "rgba(232,148,255,0.07)",
                  color: activeAgent === i ? "var(--bg)" : "var(--text-muted)",
                  transition: "all 0.35s",
                }}>
                  {agent.id}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: activeAgent === i ? "var(--accent)" : "var(--text-body)" }}>{agent.name}</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{agent.desc}</p>
                </div>
                {activeAgent === i && <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--accent)" }} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          MEMORY
      ══════════════════════════════════════════ */}
      <section style={{ padding: "120px 36px", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="card" style={{ padding: "72px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
            <div>
              <p className="section-label" style={{ marginBottom: "14px" }}>CHROMADB VECTOR MEMORY</p>
              <h2 className="font-display" style={{ fontSize: "clamp(52px, 6vw, 88px)", lineHeight: 0.88, color: "var(--accent)", marginBottom: "28px", letterSpacing: "-0.02em" }}>
                MEMORY<br />THAT<br /><span style={{ color: "rgba(232,148,255,0.35)" }}>NEVER</span><br /><span style={{ color: "rgba(232,148,255,0.35)" }}>FORGETS</span>
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {[
                  { icon: AlertTriangle, text: "Cross-document contradiction detection" },
                  { icon: Eye,           text: "Historical flag inheritance across projects" },
                  { icon: Shield,        text: "RAG Q&A over all project contracts" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <item.icon size={15} color="var(--accent)" />
                    <span style={{ fontSize: "14px", color: "var(--text-body)" }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { label: "org_acme_global",       count: 847, max: 900 },
                { label: "org_acme_proj_vendors",  count: 124, max: 900 },
                { label: "org_acme_proj_saas",     count: 53,  max: 900 },
              ].map((col, i) => (
                <div key={i} style={{ padding: "18px 22px", borderRadius: "14px", background: "rgba(232,148,255,0.05)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "13px", color: "var(--accent)" }}>{col.label}</span>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{col.count} clauses</span>
                  </div>
                  <div style={{ height: "3px", borderRadius: "2px", background: "rgba(232,148,255,0.1)" }}>
                    <div style={{ height: "100%", borderRadius: "2px", width: `${(col.count / col.max) * 100}%`, background: "var(--accent)" }} />
                  </div>
                </div>
              ))}
              <div style={{ padding: "14px 18px", borderRadius: "14px", background: "rgba(66,255,161,0.06)", border: "1px solid rgba(66,255,161,0.2)", display: "flex", gap: "10px", alignItems: "center" }}>
                <Check size={14} color="#42ffa1" />
                <span style={{ fontSize: "13px", color: "#42ffa1" }}>GitHub PR #47 created · Slack sent · 38.4s</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          MULTILINGUAL
      ══════════════════════════════════════════ */}
      <section style={{ padding: "120px 36px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <p className="section-label" style={{ marginBottom: "14px" }}>INDICTRANS2 + TESSERACT OCR</p>
          <h2 className="font-display" style={{ fontSize: "clamp(72px, 13vw, 180px)", lineHeight: 0.88, letterSpacing: "-0.02em", marginBottom: "44px" }}>
            BUILT FOR<br /><span style={{ color: "rgba(232,148,255,0.45)" }}>BHARAT</span>
          </h2>
          <p style={{ fontSize: "17px", color: "var(--text-body)", marginBottom: "44px", maxWidth: "560px", margin: "0 auto 44px", lineHeight: "1.65" }}>
            Photo a physical paper in any Indian script. Results delivered in your language.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
            {[["हिंदी", true],["ಕನ್ನಡ", true],["தமிழ்", true],["తెలుగు", true],["മലയാളം", true],["বাংলা", true],["English", false],["Marathi", false]].map(([lang, isIndian], i) => (
              <div key={i} style={{ padding: "10px 22px", borderRadius: "100px", fontSize: "15px", fontWeight: 500, background: isIndian ? "var(--accent-muted)" : "rgba(255,255,255,0.04)", border: `1px solid ${isIndian ? "var(--border-bright)" : "rgba(255,255,255,0.1)"}`, color: isIndian ? "var(--accent)" : "rgba(255,255,255,0.4)" }}>
                {lang}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA
      ══════════════════════════════════════════ */}
      <section style={{ padding: "120px 36px 160px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <Zap size={42} color="var(--accent)" style={{ margin: "0 auto 24px" }} />
          <h2 className="font-display" style={{ fontSize: "clamp(72px, 13vw, 170px)", lineHeight: 0.88, letterSpacing: "-0.02em", marginBottom: "36px" }}>
            READY TO<br /><span style={{ color: "rgba(232,148,255,0.45)" }}>ANALYSE?</span>
          </h2>
          <p style={{ fontSize: "17px", color: "var(--text-body)", marginBottom: "36px" }}>
            Drop your first contract. Caveat runs the pipeline in under 45 seconds.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "14px" }}>
            <Link href="/enterprise">
              <button className="btn-primary" style={{ fontSize: "15px", padding: "14px 32px" }}>
                <Building2 size={16} /> Enterprise Dashboard
              </button>
            </Link>
            <Link href="/consumer">
              <button className="btn-ghost" style={{ fontSize: "15px", padding: "14px 32px" }}>
                <User size={16} /> Consumer Tool
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "24px 36px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--text-muted)" }}>
        <span className="font-display" style={{ fontSize: "16px", color: "var(--accent)" }}>CAVEAT</span>
        <span>The fine print, finally.</span>
        <span>Awareness & education only · Not legal advice</span>
      </footer>
      </div>
    </div>
  );
}
