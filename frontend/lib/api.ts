const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function uploadText(title: string, text: string) {
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, text }),
  });
  return res.json();
}

export async function fetchGraph() {
  const res = await fetch(`${API_BASE}/graph`);
  return res.json();
}
