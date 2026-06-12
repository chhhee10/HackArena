"use client";
import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload, FileText, CheckCircle2, Loader2, AlertCircle,
  ExternalLink, ChevronDown, ChevronUp, Copy, Clock,
  Zap, GitPullRequest, Bell, Database, AlertTriangle,
  ShieldAlert, Info, BarChart3
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useStore, PipelineEvent, JobResult } from "@/store/useStore";
import { uploadEnterprise, getJobResult } from "@/lib/api";
import { subscribeToJob } from "@/lib/sse";

const STEPS = [
  { key: "ingest_complete",         label: "Ingest",      sub: "File validation & hash" },
  { key: "extraction_complete",     label: "Extract",     sub: "Clause segmentation" },
  { key: "memory_scan_complete",    label: "Memory Scan", sub: "ChromaDB vector search" },
  { key: "classification_complete", label: "Classify",    sub: "Risk scoring per clause" },
  { key: "redline_complete",        label: "Redline",     sub: "Compliant replacements" },
  { key: "pipeline_complete",       label: "Report",      sub: "GitHub PR + Slack" },
];

const RISK_COLOR: Record<string, string> = {
  violation: "#ff4d4d", high: "#ff8c42", medium: "#ffc542",
  low: "#42b4ff", compliant: "#42ffa1",
};

function RiskBadge({ level }: { level: string }) {
  return <span className={`badge badge-${level}`}>{level}</span>;
}

function ClauseCard({ clause }: { clause: JobResult["clauses"][0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderRadius: "16px", overflow: "hidden",
      background: "var(--bg-card)",
      border: `1px solid ${RISK_COLOR[clause.risk_level] ?? "var(--border)"}33`,
      marginBottom: "8px",
    }}>
      <button
        style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: "14px", padding: "18px 20px", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: RISK_COLOR[clause.risk_level], flexShrink: 0, marginTop: "6px", boxShadow: `0 0 8px ${RISK_COLOR[clause.risk_level]}66` }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
            <RiskBadge level={clause.risk_level} />
            <span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {clause.clause_type.replace(/_/g, " ")}
            </span>
            <span className="badge" style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "1px solid var(--border-bright)" }}>
              {clause.regulation}
            </span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-body)", WebkitLineClamp: 2, overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical" }}>
            {clause.text}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{Math.round(clause.confidence * 100)}%</span>
          {open ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ paddingTop: "16px", marginBottom: "12px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "6px" }}>ORIGINAL</p>
            <p style={{ fontSize: "13px", color: "var(--accent)" }}>{clause.text}</p>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "6px" }}>RISK EXPLANATION</p>
            <p style={{ fontSize: "13px", color: "var(--text-body)" }}>{clause.explanation}</p>
          </div>
          {clause.redlined_text && (
            <div style={{ padding: "14px 16px", borderRadius: "12px", background: "rgba(66,255,161,0.06)", border: "1px solid rgba(66,255,161,0.2)" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#42ffa1", marginBottom: "6px" }}>✦ COMPLIANT REDLINE</p>
              <p style={{ fontSize: "13px", color: "var(--accent)" }}>{clause.redlined_text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UploadZone({ onJobStart }: { onJobStart: (id: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [orgId, setOrgId] = useState("org_001");
  const [projectId, setProjectId] = useState("proj_001");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback((f: File[]) => { if (f[0]) { setFile(f[0]); setError(null); } }, []),
    accept: { "application/pdf": [".pdf"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
    maxFiles: 1, maxSize: 52_428_800,
  });

  async function submit() {
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const r = await uploadEnterprise(file, orgId, projectId);
      onJobStart(r.job_id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setUploading(false);
    }
  }

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      <div {...getRootProps()} className={`drop-zone ${isDragActive ? "active" : ""}`}
        style={{ padding: "72px 40px", textAlign: "center" }}>
        <input {...getInputProps()} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "20px", background: "var(--accent-muted)", border: "1px solid var(--border-bright)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {file ? <FileText size={32} color="var(--accent)" /> : <Upload size={32} color="var(--accent)" />}
          </div>
          {file ? (
            <div>
              <p style={{ fontWeight: 600, color: "var(--accent)" }}>{file.name}</p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
            </div>
          ) : (
            <div>
              <p style={{ fontWeight: 600, color: "var(--accent)", marginBottom: "6px" }}>{isDragActive ? "Drop it here!" : "Drop your contract here"}</p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>PDF or DOCX · max 50MB</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "16px 0" }}>
        {[["ORG ID", orgId, setOrgId], ["PROJECT ID", projectId, setProjectId]].map(([label, val, setter]) => (
          <div key={label as string}>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "8px" }}>{label as string}</p>
            <input className="input-field" value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)} />
          </div>
        ))}
      </div>

      {error && (
        <div style={{ display: "flex", gap: "10px", padding: "14px 16px", borderRadius: "12px", background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.25)", marginBottom: "12px" }}>
          <AlertCircle size={15} color="#ff7070" />
          <span style={{ fontSize: "13px", color: "#ff7070" }}>{error}</span>
        </div>
      )}

      <button className="btn-primary" disabled={!file || uploading}
        style={{ width: "100%", justifyContent: "center", padding: "16px", fontSize: "15px", opacity: !file || uploading ? 0.4 : 1 }}
        onClick={submit}>
        {uploading ? <Loader2 size={18} className="anim-spin" /> : <Zap size={18} />}
        {uploading ? "Uploading…" : "Launch 7-Agent Pipeline"}
      </button>
    </div>
  );
}

function PipelineMonitor({ jobId, onComplete }: { jobId: string; onComplete: (r: JobResult) => void }) {
  const { pipelineEvents, addPipelineEvent } = useStore();
  const [activeStep, setActiveStep] = useState(0);
  const completedKeys = pipelineEvents.map(e => e.event);

  useEffect(() => {
    const unsub = subscribeToJob(jobId,
      (ev) => {
        addPipelineEvent(ev as PipelineEvent);
        const idx = STEPS.findIndex(s => s.key === (ev as PipelineEvent).event);
        if (idx >= 0) setActiveStep(idx);
      },
      async () => {
        try { onComplete(await getJobResult(jobId)); } catch { /* noop */ }
      }
    );
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", marginBottom: "24px" }}>
        <div>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em" }}>JOB ID</p>
          <p style={{ fontFamily: "monospace", fontSize: "13px", color: "var(--accent)" }}>{jobId}</p>
        </div>
        <button onClick={() => navigator.clipboard.writeText(jobId)} style={{ background: "none", border: "none", cursor: "pointer" }}>
          <Copy size={14} color="var(--text-muted)" />
        </button>
      </div>

      <div>
        {STEPS.map((step, i) => {
          const done = completedKeys.includes(step.key);
          const active = !done && i === activeStep;
          const classify = pipelineEvents.find(e => e.event === "classification_progress");
          return (
            <div key={step.key} className={`step-line ${done ? "done" : ""}`} style={{ position: "relative", display: "flex", gap: "16px", marginBottom: "8px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "12px", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? "rgba(66,255,161,0.12)" : active ? "var(--accent-muted)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${done ? "rgba(66,255,161,0.35)" : active ? "var(--border-bright)" : "rgba(255,255,255,0.07)"}`,
                transition: "all 0.4s",
              }}>
                {done ? <CheckCircle2 size={18} color="#42ffa1" /> : active ? <Loader2 size={18} color="var(--accent)" className="anim-spin" /> : <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--text-muted)" }} />}
              </div>
              <div style={{ paddingBottom: "24px", flex: 1 }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: done ? "var(--accent)" : active ? "var(--accent)" : "var(--text-muted)" }}>{step.label}</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {step.sub}
                  {step.key === "extraction_complete" && done && <> · {pipelineEvents.find(e => e.event === "extraction_complete")?.clause_count} clauses</>}
                  {step.key === "classification_complete" && classify && <> · {classify.done}/{classify.total}</>}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RiskReport({ result }: { result: JobResult }) {
  const [tab, setTab] = useState<"clauses" | "contradictions" | "flags">("clauses");

  return (
    <div>
      {/* header */}
      <div className="card" style={{ padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div>
          <p className="section-label" style={{ marginBottom: "6px" }}>ANALYSIS COMPLETE</p>
          <h2 className="font-display" style={{ fontSize: "clamp(28px, 3vw, 44px)", color: "var(--accent)", lineHeight: 0.95 }}>{result.filename}</h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>
            <Clock size={12} style={{ display: "inline", marginRight: "4px" }} />
            {result.duration_seconds?.toFixed(1)}s · {result.summary.total_clauses} clauses
          </p>
        </div>
        {result.github_pr_url && (
          <a href={result.github_pr_url} target="_blank" rel="noreferrer">
            <button className="btn-ghost"><GitPullRequest size={14} /> View PR</button>
          </a>
        )}
      </div>

      {/* summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "16px" }}>
        {(["violation","high","medium","low","compliant"] as const).map(level => (
          <div key={level} style={{ padding: "20px", borderRadius: "16px", background: "var(--bg-card)", border: `1px solid ${RISK_COLOR[level]}33`, textAlign: "center" }}>
            <div className="font-display" style={{ fontSize: "40px", color: RISK_COLOR[level], lineHeight: 1 }}>{result.summary[level as keyof typeof result.summary]}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", textTransform: "capitalize" }}>{level}</div>
          </div>
        ))}
      </div>

      {/* outputs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
        {[
          { icon: GitPullRequest, color: "#42ffa1", title: "GitHub PR Created", sub: result.github_pr_url ? "View redline diff →" : "—" },
          { icon: Bell, color: "#ffc542", title: "Slack Alert Sent", sub: "3-line severity summary" },
          { icon: Database, color: "var(--accent)", title: "Audit Trail Logged", sub: `sha256:${result.audit_trail?.file_hash?.slice(0,10)}…` },
        ].map((item, i) => (
          <div key={i} className="card" style={{ padding: "18px 20px", display: "flex", gap: "12px", alignItems: "center" }}>
            <item.icon size={18} color={item.color} />
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)" }}>{item.title}</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {(["clauses","contradictions","flags"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "9px 20px", borderRadius: "100px", fontSize: "13px", fontWeight: 600,
            background: tab === t ? "var(--accent)" : "transparent",
            color: tab === t ? "var(--bg)" : "var(--text-muted)",
            border: `1px solid ${tab === t ? "var(--accent)" : "var(--border)"}`,
            cursor: "pointer", transition: "all 0.2s",
          }}>
            {t === "flags" ? "Hist. Flags" : t.charAt(0).toUpperCase() + t.slice(1)}
            <span style={{ marginLeft: "6px", opacity: 0.6, fontSize: "11px" }}>
              {t === "clauses" ? result.clauses.length : t === "contradictions" ? result.contradictions.length : result.historical_flags.length}
            </span>
          </button>
        ))}
      </div>

      {tab === "clauses" && (
        <div>
          {(["violation","high","medium","low","compliant"] as const).map(level => {
            const clauses = result.clauses.filter(c => c.risk_level === level);
            if (!clauses.length) return null;
            return (
              <div key={level} style={{ marginBottom: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <RiskBadge level={level} />
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{clauses.length} clause{clauses.length > 1 ? "s" : ""}</span>
                </div>
                {clauses.map(c => <ClauseCard key={c.clause_id} clause={c} />)}
              </div>
            );
          })}
        </div>
      )}

      {tab === "contradictions" && (
        <div>
          {result.contradictions.length === 0 ? (
            <div className="card" style={{ padding: "60px", textAlign: "center" }}>
              <CheckCircle2 size={32} color="#42ffa1" style={{ margin: "0 auto 12px" }} />
              <p style={{ color: "var(--text-muted)" }}>No contradictions detected.</p>
            </div>
          ) : result.contradictions.map((c, i) => (
            <div key={i} className="card" style={{ padding: "24px", marginBottom: "12px" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <AlertTriangle size={16} color="#ff8c42" />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#ff8c42" }}>Contradiction — {c.severity}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[{id: c.clause_a_id, text: c.clause_a_text}, {id: c.clause_b_id, text: c.clause_b_text}].map((s, j) => (
                  <div key={j} style={{ padding: "14px 16px", borderRadius: "12px", background: "rgba(255,140,66,0.06)", border: "1px solid rgba(255,140,66,0.2)" }}>
                    <p style={{ fontFamily: "monospace", fontSize: "12px", color: "#ff8c42", marginBottom: "6px" }}>{s.id}</p>
                    <p style={{ fontSize: "13px", color: "var(--text-body)" }}>{s.text}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "12px" }}>{c.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "flags" && (
        <div>
          {result.historical_flags.length === 0 ? (
            <div className="card" style={{ padding: "60px", textAlign: "center" }}>
              <ShieldAlert size={32} color="#42ffa1" style={{ margin: "0 auto 12px" }} />
              <p style={{ color: "var(--text-muted)" }}>No historical flags found.</p>
            </div>
          ) : result.historical_flags.map((f, i) => (
            <div key={i} className="card" style={{ padding: "24px", marginBottom: "12px" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                <Info size={15} color="var(--accent)" />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent)" }}>Previously flagged</span>
                <RiskBadge level={f.original_risk_level} />
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-body)", marginBottom: "10px" }}>{f.text}</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {f.flagged_in_project} · {f.flagged_in_job} · {new Date(f.flagged_date).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EnterprisePage() {
  const { currentJobId, jobResult, isProcessing, setCurrentJobId, setJobResult, setIsProcessing, resetPipeline } = useStore();

  const phase = !currentJobId ? "upload" : isProcessing ? "monitor" : "result";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />
      <div style={{ paddingTop: "100px", paddingBottom: "80px", padding: "100px 28px 80px" }}>
        {/* header */}
        <div style={{ maxWidth: "1200px", margin: "0 auto 60px", textAlign: "center" }}>
          <p className="section-label" style={{ marginBottom: "12px" }}>CAVEAT · ENTERPRISE PIPELINE</p>
          <h1 className="font-display" style={{ fontSize: "clamp(56px, 9vw, 120px)", color: "var(--accent)", lineHeight: 0.88, letterSpacing: "-0.02em" }}>
            CONTRACT
            <br />
            <span style={{ color: "rgba(232,148,255,0.35)" }}>ANALYSIS</span>
          </h1>
          <p style={{ marginTop: "20px", fontSize: "16px", color: "var(--text-body)" }}>
            7-agent LangGraph pipeline · Risk classify · Redline · GitHub PR · Slack
          </p>

          {/* phase tabs */}
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "32px" }}>
            {[
              { key: "upload", label: "Upload", icon: Upload },
              { key: "monitor", label: "Pipeline", icon: BarChart3 },
              { key: "result", label: "Results", icon: CheckCircle2 },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "10px 20px", borderRadius: "100px", fontSize: "13px", fontWeight: 600,
                background: phase === key ? "var(--accent)" : "transparent",
                color: phase === key ? "var(--bg)" : "var(--text-muted)",
                border: `1px solid ${phase === key ? "var(--accent)" : "var(--border)"}`,
              }}>
                <Icon size={14} />{label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {phase === "upload" && (
            <UploadZone onJobStart={id => { resetPipeline(); setCurrentJobId(id); setIsProcessing(true); }} />
          )}
          {phase === "monitor" && currentJobId && (
            <PipelineMonitor jobId={currentJobId} onComplete={r => { setJobResult(r); setIsProcessing(false); }} />
          )}
          {phase === "result" && jobResult && <RiskReport result={jobResult} />}
        </div>

        {phase !== "upload" && (
          <div style={{ textAlign: "center", marginTop: "40px" }}>
            <button className="btn-ghost" onClick={resetPipeline} style={{ fontSize: "13px" }}>
              ← Analyse another contract
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
