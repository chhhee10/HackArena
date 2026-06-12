"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Camera, FileText, AlertCircle, Loader2, RefreshCw, Scale, Globe, Zap, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useStore, ConsumerAnalysis } from "@/store/useStore";
import { uploadConsumerFile, uploadConsumerPhoto } from "@/lib/api";

const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "ml", label: "മലയാളം" },
  { code: "bn", label: "বাংলা" },
];

function UnfairClause({ clause }: { clause: ConsumerAnalysis["unfair_clauses"][0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: "16px", overflow: "hidden", background: "rgba(255,77,77,0.06)", border: "1px solid rgba(255,77,77,0.2)", marginBottom: "10px" }}>
      <button style={{ width: "100%", display: "flex", gap: "12px", padding: "18px 20px", textAlign: "left", background: "none", border: "none", cursor: "pointer", alignItems: "flex-start" }}
        onClick={() => setOpen(o => !o)}>
        <ShieldAlert size={16} color="#ff7070" style={{ flexShrink: 0, marginTop: "2px" }} />
        <p style={{ flex: 1, fontSize: "13px", color: "var(--accent)" }}>{clause.clause_text}</p>
        {open ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
      </button>
      {open && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid rgba(255,77,77,0.12)" }}>
          <div style={{ paddingTop: "14px", marginBottom: "12px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#ff7070", marginBottom: "6px" }}>WHY THIS IS UNFAIR</p>
            <p style={{ fontSize: "13px", color: "var(--text-body)" }}>{clause.explanation}</p>
          </div>
          <div style={{ padding: "14px 16px", borderRadius: "12px", background: "rgba(66,255,161,0.06)", border: "1px solid rgba(66,255,161,0.2)" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#42ffa1", marginBottom: "6px" }}>✦ FAIR VERSION</p>
            <p style={{ fontSize: "13px", color: "var(--accent)" }}>{clause.fair_alternative}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ConsumerReport({ analysis }: { analysis: ConsumerAnalysis }) {
  const riskColor: Record<string, string> = { high: "#ff4d4d", medium: "#ffc542", low: "#42b4ff", compliant: "#42ffa1" };
  const rc = riskColor[analysis.risk_level] ?? "#ffc542";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* risk banner */}
      <div style={{ padding: "24px 28px", borderRadius: "20px", background: `${rc}12`, border: `1px solid ${rc}40`, display: "flex", gap: "16px", alignItems: "center" }}>
        <span style={{ fontSize: "40px" }}>{analysis.risk_level === "high" ? "⚠️" : analysis.risk_level === "medium" ? "🔶" : "✅"}</span>
        <div>
          <p style={{ fontSize: "18px", fontWeight: 700, color: rc }}>{analysis.risk_level.toUpperCase()} RISK</p>
          <p style={{ fontSize: "13px", color: "var(--text-body)", marginTop: "4px" }}>
            {analysis.unfair_clauses.length} unfair clause{analysis.unfair_clauses.length !== 1 ? "s" : ""} · {analysis.ambiguity_flags.length} vague terms
          </p>
        </div>
      </div>

      {/* summary */}
      <div className="card" style={{ padding: "24px 28px" }}>
        <p className="section-label" style={{ marginBottom: "16px" }}>PLAIN ENGLISH SUMMARY</p>
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
          {analysis.summary.map((b, i) => (
            <li key={i} style={{ display: "flex", gap: "10px", fontSize: "14px", color: "var(--text-body)" }}>
              <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: "1px" }}>✦</span>{b}
            </li>
          ))}
        </ul>
      </div>

      {/* obligation map */}
      <div>
        <p className="section-label" style={{ marginBottom: "12px" }}>OBLIGATION ASYMMETRY</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[
            { label: "WHAT YOU AGREE TO", items: analysis.obligation_map.user_obligations, color: "#ff4d4d" },
            { label: "WHAT THEY AGREE TO", items: analysis.obligation_map.company_obligations, color: "#42ffa1" },
          ].map((col, i) => (
            <div key={i} className="card" style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: col.color, marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Scale size={13} /> {col.label}
              </p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                {col.items.map((item, j) => (
                  <li key={j} style={{ display: "flex", gap: "8px", fontSize: "13px", color: "var(--text-body)" }}>
                    <span style={{ color: col.color, flexShrink: 0 }}>→</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* unfair clauses */}
      {analysis.unfair_clauses.length > 0 && (
        <div>
          <p className="section-label" style={{ color: "#ff7070", marginBottom: "12px" }}>UNFAIR CLAUSES</p>
          {analysis.unfair_clauses.map((c, i) => <UnfairClause key={i} clause={c} />)}
        </div>
      )}

      {/* ambiguity */}
      {analysis.ambiguity_flags.length > 0 && (
        <div>
          <p className="section-label" style={{ color: "#ffc542", marginBottom: "12px" }}>VAGUE TERMS</p>
          {analysis.ambiguity_flags.map((f, i) => (
            <div key={i} className="card" style={{ padding: "18px 20px", marginBottom: "8px" }}>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#ffc542", marginBottom: "6px" }}>"{f.term}"</p>
              <p style={{ fontSize: "13px", color: "var(--text-body)" }}>{f.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {/* benchmarks */}
      {analysis.benchmark_comparisons?.length > 0 && (
        <div>
          <p className="section-label" style={{ color: "#42b4ff", marginBottom: "12px" }}>BENCHMARKS</p>
          {analysis.benchmark_comparisons.map((b, i) => (
            <div key={i} className="card" style={{ padding: "18px 20px", marginBottom: "8px", borderColor: "rgba(66,180,255,0.2)" }}>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#42b4ff", marginBottom: "6px" }}>{b.finding}</p>
              <p style={{ fontSize: "13px", color: "var(--text-body)" }}>{b.context}</p>
            </div>
          ))}
        </div>
      )}

      {/* disclaimer */}
      <div className="card" style={{ padding: "18px 20px", textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>
        {analysis.disclaimer}
      </div>
    </div>
  );
}

export default function ConsumerPage() {
  const { consumerAnalysis, consumerLoading, setConsumerAnalysis, setConsumerLoading } = useStore();
  const [mode, setMode] = useState<"file" | "photo">("file");
  const [lang, setLang] = useState("en");
  const [error, setError] = useState<string | null>(null);
  const [lowConf, setLowConf] = useState(false);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]; if (!file) return;
    setError(null); setLowConf(false); setConsumerLoading(true); setConsumerAnalysis(null);
    try {
      let res;
      if (mode === "photo") {
        res = await uploadConsumerPhoto(file, lang);
        if (res.status === "low_confidence") { setLowConf(true); setConsumerLoading(false); return; }
      } else {
        res = await uploadConsumerFile(file, lang);
      }
      setConsumerAnalysis(res.analysis as ConsumerAnalysis);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally { setConsumerLoading(false); }
  }, [mode, lang, setConsumerAnalysis, setConsumerLoading]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: mode === "photo"
      ? { "image/jpeg": [".jpg",".jpeg"], "image/png": [".png"], "image/webp": [".webp"] }
      : { "application/pdf": [".pdf"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
    maxFiles: 1,
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />
      <div style={{ paddingTop: "100px", padding: "100px 28px 80px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          {/* header */}
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <p className="section-label" style={{ marginBottom: "12px" }}>CAVEAT · CONSUMER CLARITY</p>
            <h1 className="font-display" style={{ fontSize: "clamp(56px, 10vw, 130px)", color: "var(--accent)", lineHeight: 0.88, letterSpacing: "-0.02em" }}>
              WHAT ARE YOU
              <br />
              <span style={{ color: "rgba(232,148,255,0.35)" }}>SIGNING?</span>
            </h1>
            <p style={{ marginTop: "20px", fontSize: "16px", color: "var(--text-body)" }}>
              Upload or photograph any document. Plain-language breakdown in your language.
            </p>
          </div>

          {!consumerAnalysis && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* mode toggle */}
              <div style={{ display: "flex", gap: "8px", padding: "6px", borderRadius: "20px", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                {([["file", FileText, "PDF / DOCX"], ["photo", Camera, "Photo / Image"]] as const).map(([m, Icon, label]) => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    padding: "12px", borderRadius: "14px", fontSize: "14px", fontWeight: 600,
                    background: mode === m ? "var(--accent)" : "transparent",
                    color: mode === m ? "var(--bg)" : "var(--text-muted)",
                    border: "none", cursor: "pointer", transition: "all 0.2s",
                  }}>
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>

              {/* language */}
              <div>
                <p className="section-label" style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Globe size={12} /> OUTPUT LANGUAGE
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {LANGS.map(l => (
                    <button key={l.code} onClick={() => setLang(l.code)} style={{
                      padding: "9px 18px", borderRadius: "100px", fontSize: "14px", fontWeight: 500,
                      background: lang === l.code ? "var(--accent)" : "rgba(255,255,255,0.03)",
                      color: lang === l.code ? "var(--bg)" : "var(--text-muted)",
                      border: `1px solid ${lang === l.code ? "var(--accent)" : "var(--border)"}`,
                      cursor: "pointer", transition: "all 0.2s",
                    }}>{l.label}</button>
                  ))}
                </div>
              </div>

              {/* drop zone */}
              <div {...getRootProps()} className={`drop-zone ${isDragActive ? "active" : ""}`} style={{ padding: "72px 40px", textAlign: "center" }}>
                <input {...getInputProps()} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "72px", height: "72px", borderRadius: "20px", background: "var(--accent-muted)", border: "1px solid var(--border-bright)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {mode === "photo" ? <Camera size={32} color="var(--accent)" /> : <Upload size={32} color="var(--accent)" />}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: "var(--accent)", marginBottom: "6px" }}>
                      {isDragActive ? "Drop it!" : mode === "photo" ? "Drop a photo or click to capture" : "Drop PDF/DOCX or click to browse"}
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                      {mode === "photo" ? "JPG, PNG, WEBP · Supports Devanagari, Kannada, Tamil…" : "PDF or DOCX · Under 60 seconds"}
                    </p>
                  </div>
                </div>
              </div>

              {consumerLoading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "48px" }}>
                  <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--accent-muted)", border: "1px solid var(--border-bright)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Zap size={28} color="var(--accent)" />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontWeight: 600, color: "var(--accent)" }}>Analysing…</p>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                      {mode === "photo" ? "OCR + script detection + translation" : "Extracting & analysing clauses"}
                    </p>
                  </div>
                  <Loader2 size={22} color="var(--accent)" className="anim-spin" />
                </div>
              )}

              {lowConf && (
                <div className="card" style={{ padding: "40px", textAlign: "center" }}>
                  <Camera size={36} color="#ffc542" style={{ margin: "0 auto 12px" }} />
                  <p style={{ fontWeight: 600, fontSize: "16px", color: "#ffc542" }}>Photo quality too low</p>
                  <p style={{ fontSize: "13px", color: "var(--text-body)", marginTop: "8px", marginBottom: "20px" }}>
                    Retake in better lighting with the full document visible.
                  </p>
                  <button className="btn-ghost" onClick={() => setLowConf(false)}>
                    <RefreshCw size={14} /> Try again
                  </button>
                </div>
              )}

              {error && (
                <div style={{ display: "flex", gap: "10px", padding: "14px 16px", borderRadius: "12px", background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.25)" }}>
                  <AlertCircle size={15} color="#ff7070" />
                  <span style={{ fontSize: "13px", color: "#ff7070" }}>{error}</span>
                </div>
              )}
            </div>
          )}

          {consumerAnalysis && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
                <button className="btn-ghost" style={{ fontSize: "13px" }}
                  onClick={() => { setConsumerAnalysis(null); setError(null); }}>
                  <RefreshCw size={14} /> Analyse another
                </button>
              </div>
              <ConsumerReport analysis={consumerAnalysis} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
