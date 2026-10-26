// Accès à l'API : URL relatives /api/... (relayées par le proxy Vite).

const TOKEN_KEY = 'occaz.token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// Erreur renvoyée par l'API au format {"error":{"code","message"}}
export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch(`/api${path}`, { ...options, headers })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Serveur injoignable, réessayez plus tard.')
  }

  // Session expirée : seulement si on avait envoyé un token
  // (un 401 au login = mauvais identifiants, à afficher dans le formulaire).
  if (res.status === 401 && token) {
    clearToken()
    window.location.assign('/login?expired=1')
  }

  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.code ?? 'UNKNOWN', body?.error?.message ?? 'Erreur inattendue')
  }
  return body as T
}
