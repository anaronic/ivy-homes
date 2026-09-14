const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY!;

export function apiHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = { "X-API-Key": API_KEY };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export { BASE_URL };