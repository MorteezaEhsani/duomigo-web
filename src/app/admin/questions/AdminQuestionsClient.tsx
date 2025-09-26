'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import QuestionsList from './QuestionsList';
import type { Database } from '@/types/database.types';

type Question = Database['public']['Tables']['questions']['Row'];
type QuestionType = 'listen_then_speak' | 'speak_about_photo' | 'read_then_speak';

interface QuestionFormData {
  type: QuestionType;
  prompt: string;
  targetLanguage: string;
  sourceLanguage: string;
  difficulty: number;
  prepSeconds: number;
  minSeconds: number;
  maxSeconds: number;
  imageUrl?: string;
}

export default function AdminQuestionsClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [refreshList, setRefreshList] = useState(0);

  const [formData, setFormData] = useState<QuestionFormData>({
    type: 'listen_then_speak',
    prompt: '',
    targetLanguage: 'English',
    sourceLanguage: 'English',
    difficulty: 2,
    prepSeconds: 20,
    minSeconds: 30,
    maxSeconds: 90,
    imageUrl: '',
  });

  const handleEdit = (question: Question) => {
    setEditingId(question.id);
    setFormData({
      type: question.type as QuestionType,
      prompt: question.prompt,
      targetLanguage: question.target_language,
      sourceLanguage: question.source_language,
      difficulty: question.difficulty,
      prepSeconds: question.prep_seconds,
      minSeconds: question.min_seconds,
      maxSeconds: question.max_seconds,
      imageUrl: question.image_url || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const questionData = {
        type: formData.type,
        prompt: formData.prompt.trim(),
        target_language: formData.targetLanguage,
        source_language: formData.sourceLanguage,
        difficulty: formData.difficulty,
        prep_seconds: formData.prepSeconds,
        min_seconds: formData.minSeconds,
        max_seconds: formData.maxSeconds,
        image_url: formData.type === 'speak_about_photo' && formData.imageUrl
          ? formData.imageUrl.trim()
          : null
      };

      if (editingId) {
        // Update existing question
        const { error } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Question updated successfully!');
      } else {
        // Add new question
        const { error } = await supabase
          .from('questions')
          .insert(questionData);

        if (error) throw error;
        toast.success('Question added successfully!');
      }

      // Reset form
      setFormData({
        type: 'listen_then_speak',
        prompt: '',
        targetLanguage: 'English',
        sourceLanguage: 'English',
        difficulty: 2,
        prepSeconds: 20,
        minSeconds: 30,
        maxSeconds: 90,
        imageUrl: '',
      });
      setEditingId(null);
      setShowForm(false);
      setRefreshList(prev => prev + 1); // Trigger list refresh
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error(editingId ? 'Failed to update question' : 'Failed to add question');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      type: 'listen_then_speak',
      prompt: '',
      targetLanguage: 'English',
      sourceLanguage: 'English',
      difficulty: 2,
      prepSeconds: 20,
      minSeconds: 30,
      maxSeconds: 90,
      imageUrl: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Question Management</h1>
              <p className="text-sm text-gray-600 mt-1">Add, edit, or delete practice questions</p>
            </div>
            <div className="flex gap-3">
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  + Add New Question
                </button>
              )}
              <button
                onClick={() => router.push('/app')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Question' : 'Add New Question'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Question Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as QuestionType })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                >
                  <option value="listen_then_speak">Listen Then Speak</option>
                  <option value="speak_about_photo">Speak About Photo</option>
                  <option value="read_then_speak">Read Then Speak</option>
                </select>
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt/Question Text
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder={
                    formData.type === 'listen_then_speak'
                      ? 'What are your hobbies and why do you enjoy them?'
                      : formData.type === 'speak_about_photo'
                      ? 'Describe what you see in the image and what might be happening.'
                      : 'Read the following passage and discuss its main ideas...'
                  }
                  required
                />
              </div>

              {/* Image URL (only for speak_about_photo) */}
              {formData.type === 'speak_about_photo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="https://example.com/image.jpg"
                    required={formData.type === 'speak_about_photo'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload image to Supabase storage or another service and paste the URL here
                  </p>
                </div>
              )}

              {/* Languages */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source Language
                  </label>
                  <input
                    type="text"
                    value={formData.sourceLanguage}
                    onChange={(e) => setFormData({ ...formData, sourceLanguage: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Language
                  </label>
                  <input
                    type="text"
                    value={formData.targetLanguage}
                    onChange={(e) => setFormData({ ...formData, targetLanguage: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Level (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>

              {/* Timing */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prep Time (seconds)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={formData.prepSeconds}
                    onChange={(e) => setFormData({ ...formData, prepSeconds: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Speaking (seconds)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={formData.minSeconds}
                    onChange={(e) => setFormData({ ...formData, minSeconds: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Speaking (seconds)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="300"
                    value={formData.maxSeconds}
                    onChange={(e) => setFormData({ ...formData, maxSeconds: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? 'Saving...' : (editingId ? 'Update Question' : 'Add Question')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Questions List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <QuestionsList key={refreshList} onEdit={handleEdit} />
        </div>
      </div>
    </div>
  );
}