const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function uploadEnterprise(
  file: File,
  orgId: string,
  projectId: string
): Promise<{ job_id: string; status: string; stream_url: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("org_id", orgId);
  form.append("project_id", projectId);

  const res = await fetch(`${API_BASE}/api/enterprise/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getJobResult(jobId: string) {
  const res = await fetch(`${API_BASE}/api/enterprise/job/${jobId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadConsumerFile(
  file: File,
  preferredLanguage = "en"
) {
  const form = new FormData();
  form.append("file", file);
  form.append("preferred_language", preferredLanguage);

  const res = await fetch(`${API_BASE}/api/consumer/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadConsumerPhoto(
  image: File,
  preferredLanguage = "en"
) {
  const form = new FormData();
  form.append("image", image);
  form.append("preferred_language", preferredLanguage);

  const res = await fetch(`${API_BASE}/api/consumer/photo`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function ragChat(
  orgId: string,
  projectId: string,
  query: string,
  history: { role: string; content: string }[]
) {
  const res = await fetch(`${API_BASE}/api/enterprise/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      org_id: orgId,
      project_id: projectId,
      query,
      conversation_history: history,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
