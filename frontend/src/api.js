// Empty in dev (Vite proxies /api). In production set VITE_API_URL to the Render URL.
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* keep status text */
    }
    throw new Error(detail);
  }
  return res.json();
}

export const fetchAlgorithms = () => request("/api/algorithms");

export const runAlgorithm = (id, payload) =>
  request(`/api/run/${id}`, { method: "POST", body: JSON.stringify(payload) });
