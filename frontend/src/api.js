/**
 * Centralised API client for the inRebus Agency backend.
 *
 * All requests are routed through the Vite dev-server proxy at /api,
 * which forwards them to the FastAPI backend at http://localhost:8000.
 */

const BASE_URL = '/api'

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const message = body.detail || `HTTP ${response.status}: ${response.statusText}`
    throw new Error(message)
  }

  if (response.status === 204) return null
  return response.json()
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

export const candidatesApi = {
  list: (skip = 0, limit = 50) =>
    request(`/candidates?skip=${skip}&limit=${limit}`),

  get: (id) => request(`/candidates/${id}`),

  create: (payload) =>
    request('/candidates', { method: 'POST', body: JSON.stringify(payload) }),

  delete: (id) => request(`/candidates/${id}`, { method: 'DELETE' }),

  getMatches: (id) => request(`/candidates/${id}/matches`),

  getRankings: (id, topN = 10) => request(`/candidates/${id}/rankings?top_n=${topN}`),
}

// ---------------------------------------------------------------------------
// Job offers
// ---------------------------------------------------------------------------

export const jobOffersApi = {
  list: (skip = 0, limit = 50) =>
    request(`/job-offers?skip=${skip}&limit=${limit}`),

  get: (id) => request(`/job-offers/${id}`),

  create: (payload) =>
    request('/job-offers', { method: 'POST', body: JSON.stringify(payload) }),

  delete: (id) => request(`/job-offers/${id}`, { method: 'DELETE' }),

  toggleActive: (id) => request(`/job-offers/${id}/toggle-active`, { method: 'PATCH' }),

  getRankings: (id, topN = 10) =>
    request(`/job-offers/${id}/rankings?top_n=${topN}`),
}

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------

export const matchesApi = {
  compute: (candidateId, jobOfferId) =>
    request('/matches', {
      method: 'POST',
      body: JSON.stringify({ candidate_id: candidateId, job_offer_id: jobOfferId }),
    }),
}

// ---------------------------------------------------------------------------
// Shortlists
// ---------------------------------------------------------------------------

export const shortlistApi = {
  get: () => request('/shortlist'),
  toggle: (candidateId) => request(`/shortlist/${candidateId}/toggle`, { method: 'POST' }),
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

export const demoApi = {
  seed: () => request('/demo/seed', { method: 'POST' }),
}
