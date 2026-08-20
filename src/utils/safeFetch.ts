export async function parseResponseJson<T = any>(res: any, fallback: T = {} as any): Promise<T> {
  try {
    if (!res) return fallback;
    if (typeof res.text === 'function') {
      const text = await res.text();
      if (!text || !text.trim()) {
        return fallback;
      }
      return JSON.parse(text) as T;
    }
    if (typeof res.json === 'function') {
      const data = await res.json();
      return data !== undefined && data !== null ? data : fallback;
    }
    if (typeof res === 'object') {
      return res as T;
    }
    return fallback;
  } catch (err) {
    console.warn('Failed to parse response JSON:', err);
    return fallback;
  }
}

export async function safeFetch<T = any>(url: string, options?: RequestInit, fallback: T = {} as any): Promise<T> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      console.warn(`Fetch to ${url} returned status ${res.status}`);
      return fallback;
    }
    return await parseResponseJson<T>(res, fallback);
  } catch (err) {
    console.warn(`safeFetch error for ${url}:`, err);
    return fallback;
  }
}
