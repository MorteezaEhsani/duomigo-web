'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { QuestionSchema } from './AdminQuestionsClient';

interface Question {
  id: string;
  type: string;
  prompt: string;
  image_url?: string | null;
  target_language: string;
  source_language: string;
  difficulty: number;
  prep_seconds: number;
  min_seconds: number;
  max_seconds: number;
}

interface QuestionType {
  id: string;
  label: string;
  description?: string;
}

interface QuestionFormProps {
  question: Question | null;
  questionTypes: QuestionType[];
  onSave: (data: z.infer<typeof QuestionSchema>) => void;
  onClose: () => void;
  loading: boolean;
}

export default function QuestionForm({ 
  question, 
  questionTypes, 
  onSave, 
  onClose,
  loading 
}: QuestionFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    type: question?.type || questionTypes[0]?.id || 'listen_then_speak',
    prompt: question?.prompt || '',
    image_url: question?.image_url || '',
    target_language: question?.target_language || 'English',
    source_language: question?.source_language || 'English',
    difficulty: question?.difficulty || 1,
    prep_seconds: question?.prep_seconds || 20,
    min_seconds: question?.min_seconds || 30,
    max_seconds: question?.max_seconds || 90,
    metadata: question?.metadata || {}
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    setUploadingImage(true);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload via API route
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const { url } = await response.json();
      
      setFormData(prev => ({ ...prev, image_url: url }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    console.log('Form submitted with data:', formData);
    console.log('Is editing:', !!question);

    // Validate with Zod
    try {
      // Clean up data before validation
      const dataToValidate = {
        ...formData,
        image_url: formData.image_url || null,  // Convert empty string to null
        metadata: formData.metadata || {}
      };
      const validData = QuestionSchema.parse(dataToValidate);
      console.log('Validation passed, calling onSave with:', validData);
      onSave(validData);
    } catch (error) {
      console.error('Validation failed:', error);
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0].toString()] = issue.message;
          }
        });
        setErrors(fieldErrors);
        console.log('Validation errors:', fieldErrors);
      }
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-200">
          <h2 className="text-2xl font-bold text-zinc-900">
            {question ? 'Edit Question' : 'Create Question'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Question Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Question Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              disabled={!!question}
            >
              {questionTypes.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
            {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              {formData.type === 'speak_about_photo' ? 'Instructions for the Photo' : 'Prompt Text'}
            </label>
            <textarea
              value={formData.prompt}
              onChange={(e) => handleChange('prompt', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder={
                formData.type === 'speak_about_photo' 
                  ? "Enter instructions for what the user should describe about the photo..."
                  : "Enter the question prompt..."
              }
            />
            {errors.prompt && <p className="mt-1 text-sm text-red-600">{errors.prompt}</p>}
          </div>

          {/* Image Upload for speak_about_photo */}
          {formData.type === 'speak_about_photo' && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Image <span className="text-red-500">*</span>
              </label>
              {formData.image_url && (
                <div className="mb-3">
                  <img 
                    src={formData.image_url} 
                    alt="Question image" 
                    className="w-full max-h-48 object-contain rounded-lg bg-zinc-100"
                  />
                </div>
              )}
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {uploadingImage ? 'Uploading...' : 'Upload Image'}
                </button>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => handleChange('image_url', e.target.value)}
                  placeholder="Or enter image URL..."
                  className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {errors.image_url && <p className="mt-1 text-sm text-red-600">{errors.image_url}</p>}
            </div>
          )}

          {/* Languages */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Target Language
              </label>
              <select
                value={formData.target_language}
                onChange={(e) => handleChange('target_language', e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Italian">Italian</option>
                <option value="Portuguese">Portuguese</option>
                <option value="Chinese">Chinese</option>
                <option value="Japanese">Japanese</option>
              </select>
              {errors.target_language && <p className="mt-1 text-sm text-red-600">{errors.target_language}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Source Language
              </label>
              <select
                value={formData.source_language}
                onChange={(e) => handleChange('source_language', e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Italian">Italian</option>
                <option value="Portuguese">Portuguese</option>
                <option value="Chinese">Chinese</option>
                <option value="Japanese">Japanese</option>
              </select>
              {errors.source_language && <p className="mt-1 text-sm text-red-600">{errors.source_language}</p>}
            </div>
          </div>

          {/* Timing Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Prep Time (seconds)
              </label>
              <input
                type="number"
                value={formData.prep_seconds}
                onChange={(e) => handleChange('prep_seconds', parseInt(e.target.value) || 20)}
                min="5"
                max="60"
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              {errors.prep_seconds && <p className="mt-1 text-sm text-red-600">{errors.prep_seconds}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Min Duration (seconds)
              </label>
              <input
                type="number"
                value={formData.min_seconds}
                onChange={(e) => handleChange('min_seconds', parseInt(e.target.value) || 30)}
                min="5"
                max="180"
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              {errors.min_seconds && <p className="mt-1 text-sm text-red-600">{errors.min_seconds}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Max Duration (seconds)
              </label>
              <input
                type="number"
                value={formData.max_seconds}
                onChange={(e) => handleChange('max_seconds', parseInt(e.target.value) || 90)}
                min="10"
                max="300"
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              {errors.max_seconds && <p className="mt-1 text-sm text-red-600">{errors.max_seconds}</p>}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Difficulty Level
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleChange('difficulty', level)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    formData.difficulty === level
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            {errors.difficulty && <p className="mt-1 text-sm text-red-600">{errors.difficulty}</p>}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}