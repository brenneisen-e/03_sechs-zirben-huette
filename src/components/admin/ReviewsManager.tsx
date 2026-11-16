'use client';

import { useState, useEffect } from 'react';
import { RichTextEditor } from './RichTextEditor';
import {
  Star,
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  X,
  Save,
  AlertCircle,
} from 'lucide-react';

interface Review {
  id: number;
  gast_name: string;
  bewertung: number;
  titel: string | null;
  text: string | null;
  aufenthalt_von: string | null;
  aufenthalt_bis: string | null;
  quelle: string | null;
  sichtbar: number;
  created_at: string;
}

const QUELLEN = ['Google', 'Booking.com', 'Airbnb', 'FeWo-direkt', 'Direkt', 'Andere'];

const emptyForm = {
  gast_name: '',
  bewertung: 5,
  titel: '',
  text: '',
  aufenthalt_von: '',
  aufenthalt_bis: '',
  quelle: 'Google',
  sichtbar: true,
};

export default function ReviewsManager() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reviews');
      const data = (await res.json()) as { reviews?: Review[]; error?: string };
      if (data.reviews) {
        setReviews(data.reviews);
      } else {
        setError(data.error || 'Fehler beim Laden');
      }
    } catch {
      setError('Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { ...form, id: editingId } : form;

      const res = await fetch('/api/admin/reviews', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        await loadReviews();
      } else {
        setError(data.error || 'Fehler beim Speichern');
      }
    } catch {
      setError('Verbindungsfehler');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (review: Review) => {
    setForm({
      gast_name: review.gast_name,
      bewertung: review.bewertung,
      titel: review.titel || '',
      text: review.text || '',
      aufenthalt_von: review.aufenthalt_von || '',
      aufenthalt_bis: review.aufenthalt_bis || '',
      quelle: review.quelle || 'Google',
      sichtbar: review.sichtbar === 1,
    });
    setEditingId(review.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bewertung wirklich löschen?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/reviews?id=${id}`, { method: 'DELETE' });
      const data = (await res.json()) as { success?: boolean };
      if (data.success) {
        await loadReviews();
      }
    } catch {
      setError('Fehler beim Löschen');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleVisibility = async (review: Review) => {
    try {
      await fetch('/api/admin/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: review.id, sichtbar: review.sichtbar !== 1 }),
      });
      await loadReviews();
    } catch {
      setError('Fehler beim Aktualisieren');
    }
  };

  const avgRating =
    reviews.length > 0
      ? (
          reviews.filter((r) => r.sichtbar === 1).reduce((sum, r) => sum + r.bewertung, 0) /
          reviews.filter((r) => r.sichtbar === 1).length
        ).toFixed(1)
      : '–';

  const visibleCount = reviews.filter((r) => r.sichtbar === 1).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-3 text-sm text-gray-500">Lade Bewertungen...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Bewertungen</h2>
          <p className="text-sm text-gray-500">
            {reviews.length} Bewertungen ({visibleCount} sichtbar) · Ø {avgRating} Sterne
          </p>
        </div>
        <button
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Neue Bewertung
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">
                {editingId ? 'Bewertung bearbeiten' : 'Neue Bewertung'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Gastname */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name des Gastes *
                </label>
                <input
                  type="text"
                  required
                  value={form.gast_name}
                  onChange={(e) => setForm({ ...form, gast_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  placeholder="z.B. Familie M."
                />
              </div>

              {/* Titel */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                <input
                  type="text"
                  value={form.titel}
                  onChange={(e) => setForm({ ...form, titel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  placeholder="z.B. Traumhafter Urlaub"
                />
              </div>

              {/* Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bewertungstext
                </label>
                <RichTextEditor
                  value={form.text}
                  onChange={(html) => setForm({ ...form, text: html })}
                  placeholder="Der Bewertungstext..."
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sterne-Rating *
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setForm({ ...form, bewertung: star })}
                      className="p-0.5"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= form.bewertung
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Quelle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quelle</label>
                <select
                  value={form.quelle}
                  onChange={(e) => setForm({ ...form, quelle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                >
                  {QUELLEN.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              {/* Aufenthalt */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aufenthalt von
                  </label>
                  <input
                    type="date"
                    value={form.aufenthalt_von}
                    onChange={(e) => setForm({ ...form, aufenthalt_von: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aufenthalt bis
                  </label>
                  <input
                    type="date"
                    value={form.aufenthalt_bis}
                    onChange={(e) => setForm({ ...form, aufenthalt_bis: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                </div>
              </div>

              {/* Sichtbar */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.sichtbar}
                  onChange={(e) => setForm({ ...form, sichtbar: e.target.checked })}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Auf der Website anzeigen</span>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingId ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Keine Bewertungen vorhanden</p>
          <p className="text-sm mt-1">
            Tragen Sie nur echte Bewertungen ein – wortgetreu und mit Quelle (Google, Booking.com,
            FeWo-direkt).
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className={`bg-white border rounded-lg p-4 ${
                review.sichtbar === 1 ? 'border-gray-200' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">{review.gast_name}</span>
                    {review.quelle && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {review.quelle}
                      </span>
                    )}
                    {review.sichtbar !== 1 && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                        Versteckt
                      </span>
                    )}
                  </div>

                  <div className="flex gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.bewertung
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>

                  {review.titel && (
                    <p className="font-medium text-gray-800 text-sm mb-1">{review.titel}</p>
                  )}
                  {review.text && (
                    <p className="text-gray-600 text-sm line-clamp-2">{review.text}</p>
                  )}

                  {review.aufenthalt_von && (
                    <p className="text-xs text-gray-400 mt-2">
                      Aufenthalt: {new Date(review.aufenthalt_von).toLocaleDateString('de-DE')}
                      {review.aufenthalt_bis &&
                        ` – ${new Date(review.aufenthalt_bis).toLocaleDateString('de-DE')}`}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleVisibility(review)}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                    title={review.sichtbar === 1 ? 'Verstecken' : 'Anzeigen'}
                  >
                    {review.sichtbar === 1 ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(review)}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                    title="Bearbeiten"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    disabled={deleting === review.id}
                    className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 disabled:opacity-50"
                    title="Löschen"
                  >
                    {deleting === review.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
