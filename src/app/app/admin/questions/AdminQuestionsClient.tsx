'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import QuestionForm from './QuestionForm';

// Validation schemas
const BaseQuestionSchema = z.object({
  type: z.enum([
    'listen_then_speak', 
    'read_then_speak',
    'speak_about_photo',
    // Keep other types for validation of existing questions
    'read_aloud', 
    'describe_image', 
    'answer_question', 
    'speak_on_topic', 
    'custom_prompt'
  ]),
  prompt: z.string().min(1, 'Prompt is required').max(1000),
  target_language: z.string().min(1, 'Target language is required'),
  source_language: z.string().min(1, 'Source language is required'),
  difficulty: z.number().min(1).max(5).optional().default(1),
  prep_seconds: z.number().min(5).max(60).optional().default(20),
  min_seconds: z.number().min(5).max(180).optional().default(30),
  max_seconds: z.number().min(10).max(300).optional().default(90),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  image_url: z.string().nullable().optional(),
}).refine(
  (data) => {
    // Require image_url for speak_about_photo questions
    if (data.type === 'speak_about_photo') {
      return data.image_url && data.image_url.length > 0;
    }
    return true;
  },
  {
    message: "Image is required for 'Speak About the Photo' questions",
    path: ['image_url'],
  }
);

export const QuestionSchema = BaseQuestionSchema;

interface Question {
  id: string;
  type: string;
  prompt: string;
  image_url?: string | null;
  target_language: string;
  source_language: string;
  difficulty: number | null;
  prep_seconds: number;
  min_seconds: number;
  max_seconds: number;
  metadata?: Record<string, unknown> | null;
  created_at: string | null;
}

interface QuestionType {
  id: string;
  label: string;
  description?: string;
}

interface AdminQuestionsClientProps {
  initialQuestions: Question[];
  questionTypes: QuestionType[];
  supabaseUserId: string;
}

export default function AdminQuestionsClient({ 
  initialQuestions, 
  questionTypes,
  supabaseUserId 
}: AdminQuestionsClientProps) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [filteredType, setFilteredType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    const matchesType = filteredType === 'all' || q.type === filteredType;
    const matchesSearch = searchQuery === '' || 
      q.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleSaveQuestion = async (data: z.infer<typeof QuestionSchema>) => {
    setLoading(true);
    
    try {
      if (editingQuestion) {
        // Update existing question
        const payload = {
          ...data,
          difficulty: data.difficulty || 1,
          prep_seconds: data.prep_seconds || 20,
          min_seconds: data.min_seconds || 30,
          max_seconds: data.max_seconds || 90,
          metadata: { ...editingQuestion.metadata, updated_at: new Date().toISOString() }
        };
        console.log('Updating question with payload:', payload);
        
        const response = await fetch(`/api/admin/questions?id=${editingQuestion.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Update failed:', response.status, errorText);
          let errorMessage = 'Failed to update question';
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {}
          throw new Error(errorMessage);
        }

        const updatedQuestion = await response.json();

        // Update local state
        setQuestions(questions.map(q => 
          q.id === editingQuestion.id ? updatedQuestion : q
        ));
        
        toast.success('Question updated successfully');
      } else {
        // Create new question
        const payload = {
          ...data,
          difficulty: data.difficulty || 1,
          prep_seconds: data.prep_seconds || 20,
          min_seconds: data.min_seconds || 30,
          max_seconds: data.max_seconds || 90,
          metadata: { 
            created_by: supabaseUserId,
            created_at: new Date().toISOString()
          }
        };
        console.log('Creating question with payload:', payload);
        
        const response = await fetch('/api/admin/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Create failed:', response.status, errorText);
          let errorMessage = 'Failed to create question';
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {}
          throw new Error(errorMessage);
        }

        const newQuestion = await response.json();

        // Update local state
        setQuestions([newQuestion, ...questions]);
        toast.success('Question created successfully');
      }

      setShowForm(false);
      setEditingQuestion(null);
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/questions?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete question');
      }

      // Update local state after successful deletion
      setQuestions(questions.filter(q => q.id !== id));
      toast.success('Question deleted successfully');
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete question');
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingQuestion(null);
    setShowForm(true);
  };

  const getTypeLabel = (typeId: string) => {
    return questionTypes.find(t => t.id === typeId)?.label || typeId;
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Question Management</h1>
            <p className="text-zinc-600 mt-1">Create and manage practice questions</p>
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Question
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-zinc-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <select
              value={filteredType}
              onChange={(e) => setFilteredType(e.target.value)}
              className="px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              {questionTypes.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Questions List */}
        <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Prompt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Language
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Timing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredQuestions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      No questions found
                    </td>
                  </tr>
                ) : (
                  filteredQuestions.map((question) => (
                    <tr key={question.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                          {getTypeLabel(question.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs truncate text-sm text-zinc-900">
                          {question.prompt}
                        </div>
                        {question.image_url && (
                          <span className="text-xs text-zinc-500">📷 Has image</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                        {question.target_language}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                        {question.prep_seconds}s prep, {question.min_seconds}-{question.max_seconds}s
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 ${
                                i < (question.difficulty || 0) ? 'text-yellow-400' : 'text-zinc-300'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(question)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <QuestionForm
            question={editingQuestion}
            questionTypes={questionTypes}
            onSave={handleSaveQuestion}
            onClose={() => {
              setShowForm(false);
              setEditingQuestion(null);
            }}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}