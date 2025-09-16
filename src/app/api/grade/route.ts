import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import OpenAI from 'openai';
import { z } from 'zod';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


// Input validation schema
const RequestSchema = z.object({
  attemptId: z.string().uuid('Invalid attempt ID format'),
});

// Feedback schema for OpenAI response
const FeedbackSchema = z.object({
  fluency: z.number().min(0).max(100),
  pronunciation: z.number().min(0).max(100),
  grammar: z.number().min(0).max(100),
  vocabulary: z.number().min(0).max(100),
  coherence: z.number().min(0).max(100),
  task: z.number().min(0).max(100),
  strengths: z.string(),
  improvements: z.string(),
  actionable_tips: z.array(z.string()).min(3).max(3),
  grammarIssues: z.array(z.object({
    before: z.string(),
    after: z.string(),
    explanation: z.string()
  })).max(6).optional(),
});

type Feedback = z.infer<typeof FeedbackSchema>;

const SYSTEM_PROMPT = `You are an expert English speaking assessor. Evaluate the speaking attempt based on the transcript.

Return ONLY valid JSON with this EXACT structure:
{
  "fluency": integer 0-100,
  "pronunciation": integer 0-100,
  "grammar": integer 0-100,
  "vocabulary": integer 0-100,
  "coherence": integer 0-100,
  "task": integer 0-100,
  "strengths": "2-3 sentences about what the user did well",
  "improvements": "2-3 sentences about weaknesses",
  "actionable_tips": ["tip1", "tip2", "tip3"],
  "grammarIssues": [
    {"before": "error snippet", "after": "corrected", "explanation": "why"}
  ]
}

GRADING RUBRIC (score 0-100 integers for each):

1. FLUENCY: Speed, flow, pauses, hesitation
   - 85-100: Native-like fluency, natural pace, minimal hesitation
   - 70-84: Generally fluent with minor hesitations
   - 55-69: Some fluency issues but comprehensible
   - 40-54: Frequent pauses and hesitations
   - 0-39: Very limited fluency, difficult to follow

2. PRONUNCIATION: Clarity, stress, intonation
   - 85-100: Clear and natural pronunciation
   - 70-84: Minor pronunciation issues
   - 55-69: Generally clear despite some errors
   - 40-54: Often unclear pronunciation
   - 0-39: Very difficult to understand

3. GRAMMAR: Accuracy and variety of structures
   - 85-100: Excellent grammar with complex structures
   - 70-84: Good grammar with minor errors
   - 55-69: Adequate grammar, errors don't impede meaning
   - 40-54: Frequent errors that sometimes impede meaning
   - 0-39: Very limited grammar control

4. VOCABULARY: Range and precision
   - 85-100: Rich vocabulary, precise word choice
   - 70-84: Good vocabulary with minor limitations
   - 55-69: Adequate vocabulary for the task
   - 40-54: Limited vocabulary, some inappropriate usage
   - 0-39: Very limited vocabulary

5. COHERENCE: Organization, logical flow, relevance
   - 85-100: Excellent organization and logical flow
   - 70-84: Good organization with minor issues
   - 55-69: Adequate organization and relevance
   - 40-54: Some organization issues or off-topic content
   - 0-39: Poor organization or largely irrelevant

6. TASK FULFILLMENT: How fully the response answers the prompt
   - 85-100: Fully addresses prompt with details/examples
   - 70-84: Good response with most key points covered
   - 55-69: Adequate response, covers basic requirements
   - 40-54: Partial response, missing key elements
   - 0-39: Minimal or off-topic response

For EMPTY/SILENT transcripts: Set all scores to 0.

GRAMMAR ISSUES: Find up to 6 grammar errors. If none, return empty array.

Be constructive and student-friendly. Focus on actionable feedback.
Return ONLY valid JSON, no additional text.`;

export async function POST(request: NextRequest) {
  try {
    // 1. Server auth
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate input
    const body = await request.json();
    const validationResult = RequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { attemptId } = validationResult.data;

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-mock') {
      console.warn('OPENAI_API_KEY is not configured, using mock grading');
      // Return mock feedback for testing
      const mockFeedback = {
        overall: 75,
        fluency: 75,
        pronunciation: 80,
        grammar: 70,
        vocabulary: 75,
        coherence: 78,
        task: 72,
        strengths: "You demonstrated good speaking fluency with clear pronunciation. Your vocabulary usage was appropriate for the task.",
        improvements: "Work on sentence structure variety and expand your vocabulary range. Practice smoother transitions between ideas.",
        actionable_tips: [
          "Record yourself regularly to track progress",
          "Listen to native speakers and mimic their intonation",
          "Practice speaking for the full time limit"
        ],
        grammarIssues: [
          {
            before: "I have went there",
            after: "I have gone there",
            explanation: "Use past participle 'gone' with 'have'"
          }
        ],
        transcript: "[Mock mode - OpenAI API key not configured]",
        metrics: {
          durationSec: 30,
          wordsPerMinute: 120,
          fillerPerMin: 2.5,
          typeTokenRatio: 0.75,
          fillerCount: 3,
          wordCount: 60
        },
        cefr: 'B2' as const,
        model: 'mock',
        graded_at: new Date().toISOString()
      };
      
      return NextResponse.json({
        ok: true,
        feedback: mockFeedback,
        mock: true
      });
    }

    const supabase = getAdminSupabaseClient();

    // Get Supabase user ID
    const { data: supabaseUserId, error: userError } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      {
        p_clerk_user_id: userId,
        p_email: user?.emailAddresses[0]?.emailAddress,
        p_display_name: user?.firstName || user?.username || 'User'
      } as any
    );

    if (userError || !supabaseUserId) {
      console.error('Error getting user:', userError);
      return NextResponse.json(
        { error: 'Failed to authenticate user' },
        { status: 500 }
      );
    }

    // 2. Fetch the attempt (RLS ensures it belongs to the user)
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', supabaseUserId)
      .single();

    if (attemptError || !attempt) {
      console.error('Error fetching attempt:', attemptError);
      return NextResponse.json(
        { error: 'Attempt not found or access denied' },
        { status: 404 }
      );
    }

    // Check if already graded
    if (attempt.graded_at && attempt.feedback_json) {
      return NextResponse.json({
        ok: true,
        feedback: {
          ...attempt.feedback_json,
          overall: attempt.overall_score || attempt.score || 0,
          fluency: attempt.fluency_score || 0,
          pronunciation: attempt.pronunciation_score || 0,
          grammar: attempt.grammar_score || 0,
          vocabulary: attempt.vocabulary_score || 0,
          coherence: attempt.coherence_score || 0,
          transcript: attempt.transcript || '',
        },
        cached: true
      });
    }

    let transcript = attempt.transcript;

    // 3. If transcript is missing, transcribe the audio
    if (!transcript && attempt.audio_url) {
      try {
        console.log('Transcribing audio for attempt:', attemptId);
        
        // Handle different audio URL formats
        let storagePath: string;
        
        if (attempt.audio_url.startsWith('storage:')) {
          // New format: storage:user_id/attempt_id/filename
          storagePath = attempt.audio_url.replace('storage:', '');
        } else if (attempt.audio_url.startsWith('http')) {
          // Legacy format: extract from public URL
          const url = new URL(attempt.audio_url);
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/attempts\/(.+)/);
          
          if (!pathMatch) {
            throw new Error('Invalid audio URL format');
          }
          storagePath = pathMatch[1];
        } else {
          // Direct storage path
          storagePath = attempt.audio_url;
        }
        
        // Get a signed URL for the audio file
        const { data: signedUrlData, error: signedUrlError } = await supabase
          .storage
          .from('attempts')
          .createSignedUrl(storagePath, 300); // 5 minutes expiry

        if (signedUrlError || !signedUrlData) {
          throw new Error('Failed to create signed URL for audio');
        }

        // Download the audio file
        const audioResponse = await fetch(signedUrlData.signedUrl);
        if (!audioResponse.ok) {
          throw new Error('Failed to download audio file');
        }

        const audioBlob = await audioResponse.blob();
        const audioFile = new File([audioBlob], 'audio.webm', { type: audioBlob.type });

        // Transcribe with OpenAI Whisper
        console.log('Starting transcription for audio file...');
        const transcriptionResponse = await openai.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          language: 'en', // Assuming English for now
          response_format: 'text',
        });

        transcript = transcriptionResponse || '';
        console.log('Transcription result:', transcript);

        // Save transcript back to database
        const { error: updateError } = await supabase
          .from('attempts')
          .update({ transcript })
          .eq('id', attemptId);

        if (updateError) {
          console.error('Error saving transcript:', updateError);
        }
      } catch (error) {
        console.error('Transcription error:', error);
        
        // If transcription fails, try to continue with a placeholder
        if (error instanceof OpenAI.APIError && error.status === 401) {
          transcript = '[Transcription unavailable - API key issue]';
        } else {
          // For other errors, still try to provide feedback
          transcript = '[Transcription failed - please try again]';
        }
        
        // Don't return error, continue with limited transcript
        console.warn('Continuing with placeholder transcript:', transcript);
      }
    }

    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript available for grading' },
        { status: 400 }
      );
    }

    // Check if transcript is effectively empty (no meaningful speech)
    const isEmptyTranscript = !transcript.trim() || 
                              transcript.trim().length < 3 ||
                              /^[\s\.\,\!\?\-]*$/.test(transcript) ||
                              transcript.toLowerCase().includes('[silence]') ||
                              transcript.toLowerCase().includes('[inaudible]') ||
                              transcript.toLowerCase().includes('[no speech]');

    // 4. Call OpenAI for structured grading
    try {
      console.log('Grading attempt:', attemptId);
      console.log('Transcript:', transcript);
      console.log('Is empty transcript:', isEmptyTranscript);
      
      // If transcript is empty, provide specific feedback without calling OpenAI
      let feedback: Feedback;
      
      if (isEmptyTranscript) {
        // Return feedback for empty/silent recording
        feedback = {
          fluency: 0,
          pronunciation: 0,
          grammar: 0,
          vocabulary: 0,
          coherence: 0,
          task: 0,
          strengths: "You attempted the recording task. Good job starting the practice session.",
          improvements: "No speech was detected in your recording. Please ensure your microphone is working properly and speak clearly.",
          actionable_tips: [
            "Check your microphone settings and test it before recording",
            "Speak louder and more clearly into the microphone",
            "Practice in a quiet environment to minimize background noise"
          ],
          grammarIssues: []
        };
      } else {
        // Normal grading for non-empty transcript
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT
            },
            {
              role: 'user',
              content: `Evaluate this speaking attempt transcript:\n\nTask: ${attempt.prompt_text || 'General speaking task'}\n\nTranscript: "${transcript}"\n\nProvide detailed assessment in the specified JSON format.`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: 'json_object' },
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
          throw new Error('No response from grading model');
        }

        // Parse and validate the response
        try {
          const parsed = JSON.parse(responseText);
          feedback = FeedbackSchema.parse(parsed);
        } catch (parseError) {
          console.error('Failed to parse grading response:', responseText);
          console.error('Parse error:', parseError);
          
          // Provide fallback feedback when parsing fails
          feedback = {
            fluency: 50,
            pronunciation: 50,
            grammar: 50,
            vocabulary: 50,
            coherence: 50,
            task: 50,
            strengths: "You completed the speaking task and your response was recorded successfully.",
            improvements: "Unable to provide detailed feedback at this time. Please try again for a complete assessment.",
            actionable_tips: [
              "Practice speaking clearly and at a steady pace",
              "Focus on completing your thoughts before pausing",
              "Try to use varied vocabulary in your responses"
            ],
            grammarIssues: []
          };
        }
      }

      // Calculate overall score as average of all 6 categories
      const overall = Math.round(
        (feedback.fluency + feedback.pronunciation + feedback.grammar + 
         feedback.vocabulary + feedback.coherence + feedback.task) / 6
      );

      // Calculate metrics from transcript
      const words = transcript.toLowerCase().split(/\s+/).filter((w: string) => w.length > 0);
      const wordCount = words.length;
      const duration = 30; // Default duration, should come from actual recording
      const wordsPerMinute = duration > 0 ? Math.round((wordCount / duration) * 60) : 0;
      
      // Count fillers
      const fillers = ['um', 'uh', 'like', 'you know', 'so', 'actually', 'basically', 'literally'];
      let fillerCount = 0;
      const transcriptLower = transcript.toLowerCase();
      fillers.forEach(filler => {
        const regex = new RegExp(`\\b${filler}\\b`, 'g');
        const matches = transcriptLower.match(regex);
        if (matches) fillerCount += matches.length;
      });
      const fillerPerMin = duration > 0 ? Math.round((fillerCount / duration) * 60 * 10) / 10 : 0;
      
      // Type-token ratio
      const uniqueWords = new Set(words);
      const typeTokenRatio = wordCount > 0 ? Math.round((uniqueWords.size / wordCount) * 100) / 100 : 0;

      // Determine CEFR level based on overall score
      let cefr: 'A2' | 'B1' | 'B2' | 'C1';
      if (overall >= 82) cefr = 'C1';
      else if (overall >= 70) cefr = 'B2';
      else if (overall >= 55) cefr = 'B1';
      else cefr = 'A2';

      // 5. Save the scores and feedback to the database
      const feedbackJson = {
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        actionable_tips: feedback.actionable_tips,
        grammarIssues: feedback.grammarIssues || [],
        transcript: transcript,
        metrics: {
          durationSec: duration,
          wordsPerMinute,
          fillerPerMin,
          typeTokenRatio,
          fillerCount,
          wordCount,
        },
        cefr,
        model: 'gpt-4o-mini',
        graded_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('attempts')
        .update({
          score: overall,
          overall_score: overall,
          fluency_score: feedback.fluency / 20, // Convert to 0-5 scale for DB
          pronunciation_score: feedback.pronunciation / 20,
          grammar_score: feedback.grammar / 20,
          vocabulary_score: feedback.vocabulary / 20,
          coherence_score: feedback.coherence / 20,
          feedback_json: feedbackJson,
          feedback: feedback.strengths, // Store strengths as legacy feedback
          graded_at: new Date().toISOString(),
        })
        .eq('id', attemptId);

      if (updateError) {
        console.error('Error saving feedback:', updateError);
        // Continue anyway - we have the feedback to return
      }

      // 6. Respond to client with all rubric data
      return NextResponse.json({
        ok: true,
        feedback: {
          overall,
          fluency: feedback.fluency,
          pronunciation: feedback.pronunciation,
          grammar: feedback.grammar,
          vocabulary: feedback.vocabulary,
          coherence: feedback.coherence,
          task: feedback.task,
          strengths: feedback.strengths,
          improvements: feedback.improvements,
          actionable_tips: feedback.actionable_tips,
          grammarIssues: feedback.grammarIssues || [],
          transcript,
          metrics: feedbackJson.metrics,
          cefr,
        },
      });

    } catch (error) {
      console.error('Grading error:', error);
      
      if (error instanceof OpenAI.APIError) {
        console.error('OpenAI API Error:', error.status, error.message);
        
        if (error.status === 401) {
          return NextResponse.json(
            { error: 'Invalid OpenAI API key. Please check your configuration.' },
            { status: 500 }
          );
        }
        
        if (error.status === 429) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' },
            { status: 429 }
          );
        }
        
        if (error.status === 400) {
          return NextResponse.json(
            { error: 'Invalid request to OpenAI. Please try again.' },
            { status: 400 }
          );
        }
      }
      
      // Log the full error for debugging
      console.error('Full error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to grade attempt' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Grade API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}