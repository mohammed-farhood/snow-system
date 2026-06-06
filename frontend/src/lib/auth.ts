const TOKEN_KEY = "snow_factory_token";
const USER_KEY = "snow_factory_user";

export interface JWTPayload {
  id: number;
  username: string;
  role: "OWNER" | "SUPERVISOR" | "WORKER";
  name: string;
  iat?: number;
  exp?: number;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function decodeJWT(token: string): JWTPayload | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload) as JWTPayload;
  } catch {
    return null;
  }
}

export function getUser(): JWTPayload | null {
  if (typeof window === "undefined") return null;
  const token = getToken();
  if (!token) return null;
  return decodeJWT(token);
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  const token = getToken();
  if (!token) return false;
  const payload = decodeJWT(token);
  if (!payload) return false;
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    removeToken();
    return false;
  }
  return true;
}

export function hasRole(role: "OWNER" | "SUPERVISOR" | "WORKER"): boolean {
  const user = getUser();
  if (!user) return false;

  const roleHierarchy: Record<string, number> = {
    OWNER: 3,
    SUPERVISOR: 2,
    WORKER: 1,
  };

  return (roleHierarchy[user.role] ?? 0) >= (roleHierarchy[role] ?? 0);
}

export function isOwner(): boolean {
  const user = getUser();
  return user?.role === "OWNER";
}

export function isSupervisorOrAbove(): boolean {
  const user = getUser();
  if (!user) return false;
  return user.role === "OWNER" || user.role === "SUPERVISOR";
}

export function logout(): void {
  removeToken();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
