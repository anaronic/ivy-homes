import { BASE_URL, apiHeaders } from "./api";

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { email: string };
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { ...apiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data: LoginResponse = await res.json();

  const expiresAt = Date.now() + data.expires_in * 1000;
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  localStorage.setItem("expires_at", String(expiresAt));
  localStorage.setItem("user_email", data.user.email);

  return data;
}

export async function refreshToken() {
  const refresh_token = localStorage.getItem("refresh_token");
  if (!refresh_token) throw new Error("No refresh token");

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { ...apiHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });
  if (!res.ok) throw new Error("Refresh failed");
  const data: LoginResponse = await res.json();

  const expiresAt = Date.now() + data.expires_in * 1000;
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  localStorage.setItem("expires_at", String(expiresAt));

  return data.access_token;
}

export async function getValidToken(): Promise<string | null> {
  const token = localStorage.getItem("access_token");
  const expiresAt = Number(localStorage.getItem("expires_at") || 0);
  if (!token) return null;

  // refresh if expiring within the next 30 seconds
  if (Date.now() > expiresAt - 30_000) {
    try {
      return await refreshToken();
    } catch {
      logout();
      return null;
    }
  }
  return token;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("expires_at");
  localStorage.removeItem("user_email");
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem("access_token");
}