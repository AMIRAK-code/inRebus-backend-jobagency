/**
 * CandidateForm component.
 */

import { useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { candidatesApi } from '../api.js'

export default function CandidateForm({ onCreated }) {
  const [form, setForm] = useState({ full_name: '', cv_text: '', skills: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const skills = form.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const candidate = await candidatesApi.create({
        full_name: form.full_name.trim(),
        cv_text: form.cv_text.trim(),
        skills,
      })
      setForm({ full_name: '', cv_text: '', skills: '' })
      onCreated(candidate)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card !p-5 space-y-5">
      <h3 className="heading-font text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
        <UserPlus size={18} className="text-[var(--primary)]" />
        Registra candidato
      </h3>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
          <X size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div>
        <label htmlFor="full_name" className="form-label">
          Nome e cognome
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          minLength={2}
          className="form-input"
          placeholder="Es. Mario Rossi"
          value={form.full_name}
          onChange={handleChange}
        />
      </div>

      <div>
        <label htmlFor="cv_text" className="form-label">
          Testo curriculum vitae
        </label>
        <textarea
          id="cv_text"
          name="cv_text"
          required
          minLength={10}
          rows={5}
          className="form-input resize-y py-3"
          placeholder="Incollare qui il testo completo del CV del candidato..."
          value={form.cv_text}
          onChange={handleChange}
        />
      </div>

      <div>
        <label htmlFor="skills" className="form-label">
          Competenze dichiarate{' '}
          <span className="font-normal text-[var(--text-muted)] lowercase tracking-normal">(separate da virgola)</span>
        </label>
        <input
          id="skills"
          name="skills"
          type="text"
          className="form-input"
          placeholder="Es. python, sql, docker, machine learning"
          value={form.skills}
          onChange={handleChange}
        />
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          <UserPlus size={15} />
          {loading ? 'Registrazione...' : 'Registra'}
        </button>
      </div>
    </form>
  )
}
