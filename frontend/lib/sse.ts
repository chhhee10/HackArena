const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export function subscribeToJob(
  jobId: string,
  onEvent: (event: Record<string, unknown>) => void,
  onComplete: () => void,
  onError?: (err: Event) => void
): () => void {
  const es = new EventSource(`${API_BASE}/api/stream/${jobId}`);

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
      if (data.event === "pipeline_complete" || data.event === "pipeline_error") {
        es.close();
        onComplete();
      }
    } catch {
      // ignore parse errors
    }
  };

  es.onerror = (err) => {
    onError?.(err);
    es.close();
    onComplete();
  };

  return () => es.close();
}
