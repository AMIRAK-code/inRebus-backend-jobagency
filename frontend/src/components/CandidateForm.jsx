/**
 * CandidateForm component.
 *
 * Renders a form to register a new candidate with name, CV text,
 * and a comma-separated list of explicit skills.
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
    <form onSubmit={handleSubmit} className="card p-4 sm:p-5 space-y-4">
      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <UserPlus size={18} className="text-brand-600" />
        Registra candidato
      </h3>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <X size={14} className="flex-shrink-0 mt-0.5 text-red-500" />
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
          className="form-input resize-y"
          placeholder="Incollare qui il testo completo del CV del candidato..."
          value={form.cv_text}
          onChange={handleChange}
        />
      </div>

      <div>
        <label htmlFor="skills" className="form-label">
          Competenze dichiarate{' '}
          <span className="font-normal text-gray-400">(separate da virgola)</span>
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

      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn-primary">
          <UserPlus size={15} />
          {loading ? 'Registrazione...' : 'Registra candidato'}
        </button>
      </div>
    </form>
  )
}
