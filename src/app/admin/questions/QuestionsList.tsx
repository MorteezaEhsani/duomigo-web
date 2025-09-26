'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/types/database.types';

type Question = Database['public']['Tables']['questions']['Row'];

interface QuestionsListProps {
  onEdit: (question: Question) => void;
}

export default function QuestionsList({ onEdit }: QuestionsListProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    setDeleting(id);
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Question deleted successfully');
      setQuestions(questions.filter(q => q.id !== id));
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    } finally {
      setDeleting(null);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'listen_then_speak': return 'bg-blue-100 text-blue-800';
      case 'speak_about_photo': return 'bg-green-100 text-green-800';
      case 'read_then_speak': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyStars = (difficulty: number) => {
    return '⭐'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No questions found. Add your first question above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Existing Questions ({questions.length})
      </h2>

      <div className="grid gap-4">
        {questions.map((question) => (
          <div
            key={question.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(question.type)}`}>
                  {question.type.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span className="text-sm" title="Difficulty">
                  {getDifficultyStars(question.difficulty)}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(question)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(question.id)}
                  disabled={deleting === question.id}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {deleting === question.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>

            <p className="text-gray-700 line-clamp-2 mb-2">
              {question.prompt}
            </p>

            <div className="flex gap-4 text-xs text-gray-500">
              <span>Prep: {question.prep_seconds}s</span>
              <span>Speaking: {question.min_seconds}-{question.max_seconds}s</span>
              <span>{question.source_language} → {question.target_language}</span>
              {question.image_url && <span>📷 Has image</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}