const CQC_API_BASE = "https://api.service.cqc.org.uk/public/v1";

function getApiKey(): string {
  const key = process.env.CQC_API_KEY;
  if (!key) throw new Error("CQC_API_KEY not set");
  return key;
}

export async function cqcFetch(path: string) {
  const res = await fetch(`${CQC_API_BASE}${path}`, {
    headers: { "Ocp-Apim-Subscription-Key": getApiKey() },
    next: { revalidate: 86400 }, // cache 24h
  });
  if (!res.ok) {
    throw new Error(`CQC API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function getLocation(locationId: string) {
  return cqcFetch(`/locations/${locationId}`);
}

export async function listLocations(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return cqcFetch(`/locations?${qs}`);
}
