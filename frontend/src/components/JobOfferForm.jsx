/**
 * JobOfferForm component.
 *
 * Renders a form to publish a new job offer with title, company,
 * description, and comma-separated required skills.
 */

import { useState } from 'react'
import { Briefcase, X } from 'lucide-react'
import { jobOffersApi } from '../api.js'

export default function JobOfferForm({ onCreated }) {
  const [form, setForm] = useState({
    title: '',
    company: '',
    description: '',
    required_skills: '',
  })
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
      const required_skills = form.required_skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      if (required_skills.length === 0) {
        setError('Inserire almeno una competenza richiesta.')
        setLoading(false)
        return
      }

      const offer = await jobOffersApi.create({
        title: form.title.trim(),
        company: form.company.trim(),
        description: form.description.trim(),
        required_skills,
      })
      setForm({ title: '', company: '', description: '', required_skills: '' })
      onCreated(offer)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 sm:p-5 space-y-4">
      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <Briefcase size={18} className="text-brand-600" />
        Pubblica offerta di lavoro
      </h3>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <X size={14} className="flex-shrink-0 mt-0.5 text-red-500" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="title" className="form-label">
            Titolo posizione
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            minLength={2}
            className="form-input"
            placeholder="Es. Operatore CNC Senior"
            value={form.title}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="company" className="form-label">
            Azienda
          </label>
          <input
            id="company"
            name="company"
            type="text"
            required
            minLength={2}
            className="form-input"
            placeholder="Es. FIAT SpA"
            value={form.company}
            onChange={handleChange}
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="form-label">
          Descrizione offerta
        </label>
        <textarea
          id="description"
          name="description"
          required
          minLength={10}
          rows={4}
          className="form-input resize-y"
          placeholder="Descrivere la posizione, le responsabilità e il contesto aziendale..."
          value={form.description}
          onChange={handleChange}
        />
      </div>

      <div>
        <label htmlFor="required_skills" className="form-label">
          Competenze richieste{' '}
          <span className="font-normal text-gray-400">(separate da virgola)</span>
        </label>
        <input
          id="required_skills"
          name="required_skills"
          type="text"
          required
          className="form-input"
          placeholder="Es. tornitura cnc, programmazione fanuc, metrologia"
          value={form.required_skills}
          onChange={handleChange}
        />
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn-primary">
          <Briefcase size={15} />
          {loading ? 'Pubblicazione...' : 'Pubblica offerta'}
        </button>
      </div>
    </form>
  )
}
