/**
 * inRebus Agency - Main Application Component.
 *
 * Provides tabbed navigation between:
 *   1. Recruiter Dashboard  (candidate rankings, match scores, gap analysis)
 *   2. Candidates           (registration and listing)
 *   3. Job Offers           (publication and listing)
 *
 * State for candidates and job offers is managed centrally here and passed
 * down to child components to avoid redundant API calls.
 */

import { useEffect, useState, useCallback } from 'react'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Trash2,
  AlertCircle,
  Building2,
  RefreshCw,
} from 'lucide-react'

import RecruiterDashboard from './components/RecruiterDashboard.jsx'
import CandidateForm from './components/CandidateForm.jsx'
import JobOfferForm from './components/JobOfferForm.jsx'
import { candidatesApi, jobOffersApi } from './api.js'

// ---------------------------------------------------------------------------
// Navigation tabs definition
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'candidates', label: 'Candidati', icon: Users },
  { id: 'job-offers', label: 'Offerte', icon: Briefcase },
]

// ---------------------------------------------------------------------------
// Shared error banner
// ---------------------------------------------------------------------------

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
      <p>{message}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Candidate list item
// ---------------------------------------------------------------------------

function CandidateListItem({ candidate, onDelete }) {
  return (
    <div className="card p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{candidate.full_name}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{candidate.cv_text}</p>
        {candidate.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {candidate.skills.slice(0, 5).map((s) => (
              <span key={s} className="badge-skill">
                {s}
              </span>
            ))}
            {candidate.skills.length > 5 && (
              <span className="badge-skill">+{candidate.skills.length - 5}</span>
            )}
          </div>
        )}
      </div>
      <button
        onClick={() => onDelete(candidate.id)}
        className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        title="Elimina candidato"
        aria-label={`Elimina ${candidate.full_name}`}
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Job offer list item
// ---------------------------------------------------------------------------

function JobOfferListItem({ offer, onDelete }) {
  return (
    <div className="card p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{offer.title}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
          <Building2 size={12} />
          {offer.company}
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {offer.required_skills.slice(0, 5).map((s) => (
            <span key={s} className="badge-skill">
              {s}
            </span>
          ))}
          {offer.required_skills.length > 5 && (
            <span className="badge-skill">+{offer.required_skills.length - 5}</span>
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(offer.id)}
        className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        title="Elimina offerta"
        aria-label={`Elimina ${offer.title}`}
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [candidates, setCandidates] = useState([])
  const [jobOffers, setJobOffers] = useState([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [errorCandidates, setErrorCandidates] = useState(null)
  const [errorOffers, setErrorOffers] = useState(null)

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchCandidates = useCallback(async () => {
    setLoadingCandidates(true)
    setErrorCandidates(null)
    try {
      const data = await candidatesApi.list()
      setCandidates(data)
    } catch (err) {
      setErrorCandidates(err.message)
    } finally {
      setLoadingCandidates(false)
    }
  }, [])

  const fetchJobOffers = useCallback(async () => {
    setLoadingOffers(true)
    setErrorOffers(null)
    try {
      const data = await jobOffersApi.list()
      setJobOffers(data)
    } catch (err) {
      setErrorOffers(err.message)
    } finally {
      setLoadingOffers(false)
    }
  }, [])

  useEffect(() => {
    fetchCandidates()
    fetchJobOffers()
  }, [fetchCandidates, fetchJobOffers])

  // ---------------------------------------------------------------------------
  // Mutation handlers
  // ---------------------------------------------------------------------------

  function handleCandidateCreated(candidate) {
    setCandidates((prev) => [candidate, ...prev])
  }

  async function handleDeleteCandidate(id) {
    try {
      await candidatesApi.delete(id)
      setCandidates((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setErrorCandidates(err.message)
    }
  }

  function handleJobOfferCreated(offer) {
    setJobOffers((prev) => [offer, ...prev])
  }

  async function handleDeleteJobOffer(id) {
    try {
      await jobOffersApi.delete(id)
      setJobOffers((prev) => prev.filter((o) => o.id !== id))
    } catch (err) {
      setErrorOffers(err.message)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <Briefcase size={16} className="text-white" />
              </div>
              <span className="text-base font-bold text-gray-900 hidden sm:block">
                inRebus Agency
              </span>
            </div>

            {/* Tabs */}
            <nav className="flex items-center gap-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === id
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={15} />
                  <span className="hidden sm:block">{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard tab */}
        {activeTab === 'dashboard' && (
          <RecruiterDashboard jobOffers={jobOffers} />
        )}

        {/* Candidates tab */}
        {activeTab === 'candidates' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Candidati</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Gestisci i profili dei candidati registrati nel sistema.
                </p>
              </div>
              <button
                onClick={fetchCandidates}
                disabled={loadingCandidates}
                className="btn-secondary"
                aria-label="Aggiorna lista candidati"
              >
                <RefreshCw size={14} className={loadingCandidates ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Aggiorna</span>
              </button>
            </div>

            <CandidateForm onCreated={handleCandidateCreated} />

            <ErrorBanner message={errorCandidates} />

            <div className="space-y-3">
              {loadingCandidates && candidates.length === 0 ? (
                <div className="card p-8 text-center">
                  <RefreshCw size={24} className="mx-auto text-gray-300 animate-spin mb-2" />
                  <p className="text-sm text-gray-400">Caricamento candidati...</p>
                </div>
              ) : candidates.length === 0 ? (
                <div className="card p-8 text-center">
                  <Users size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">
                    Nessun candidato registrato. Utilizza il modulo sopra per aggiungerne uno.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500">
                    {candidates.length} candidato{candidates.length !== 1 ? 'i' : ''} registrato{candidates.length !== 1 ? 'i' : ''}
                  </p>
                  {candidates.map((candidate) => (
                    <CandidateListItem
                      key={candidate.id}
                      candidate={candidate}
                      onDelete={handleDeleteCandidate}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* Job offers tab */}
        {activeTab === 'job-offers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Offerte di lavoro</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Pubblica e gestisci le offerte di lavoro basate sulla Tassonomia Regionale Piemontese.
                </p>
              </div>
              <button
                onClick={fetchJobOffers}
                disabled={loadingOffers}
                className="btn-secondary"
                aria-label="Aggiorna lista offerte"
              >
                <RefreshCw size={14} className={loadingOffers ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Aggiorna</span>
              </button>
            </div>

            <JobOfferForm onCreated={handleJobOfferCreated} />

            <ErrorBanner message={errorOffers} />

            <div className="space-y-3">
              {loadingOffers && jobOffers.length === 0 ? (
                <div className="card p-8 text-center">
                  <RefreshCw size={24} className="mx-auto text-gray-300 animate-spin mb-2" />
                  <p className="text-sm text-gray-400">Caricamento offerte...</p>
                </div>
              ) : jobOffers.length === 0 ? (
                <div className="card p-8 text-center">
                  <Briefcase size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">
                    Nessuna offerta pubblicata. Utilizza il modulo sopra per pubblicarne una.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500">
                    {jobOffers.length} offerta{jobOffers.length !== 1 ? 'e' : ''} pubblicata{jobOffers.length !== 1 ? 'e' : ''}
                  </p>
                  {jobOffers.map((offer) => (
                    <JobOfferListItem
                      key={offer.id}
                      offer={offer}
                      onDelete={handleDeleteJobOffer}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
