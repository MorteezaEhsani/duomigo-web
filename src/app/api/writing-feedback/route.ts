import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import OpenAI from 'openai';
import { z } from 'zod';
import { updateUserLevel, updatePromptUsageScore } from '@/lib/prompts/selector';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Input validation schema
const RequestSchema = z.object({
  writingText: z.string().min(1),
  questionId: z.string(),
  questionType: z.string(),
  sessionId: z.string(),
  duration: z.number(),
  imageUrl: z.string().nullable().optional(),
  prompt: z.string(),
  // For interactive writing
  step1Text: z.string().optional(),
  step2Text: z.string().optional(),
  step2Prompt: z.string().optional(),
});

// Feedback schema for OpenAI response
const FeedbackSchema = z.object({
  task_achievement: z.number().min(0).max(100),
  coherence: z.number().min(0).max(100),
  lexical_resource: z.number().min(0).max(100),
  grammar: z.number().min(0).max(100),
  overall: z.number().min(0).max(100),
  strengths: z.array(z.string()).min(0),
  improvements: z.array(z.string()).min(0),
  actionable_tips: z.array(z.string()).min(1),
  grammarIssues: z.array(z.object({
    before: z.string(),
    after: z.string(),
    explanation: z.string()
  })).max(6).optional(),
  cefr: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  // For interactive writing
  step1Feedback: z.object({
    strengths: z.array(z.string()).optional(),
    improvements: z.array(z.string()).optional(),
  }).optional(),
  step2Feedback: z.object({
    strengths: z.array(z.string()).optional(),
    improvements: z.array(z.string()).optional(),
  }).optional(),
});

type Feedback = z.infer<typeof FeedbackSchema>;

const SYSTEM_PROMPT = `You are an expert English writing assessor trained in IELTS, TOEFL, and PTE evaluation criteria.
Evaluate the writing sample based on international English proficiency standards.

Return ONLY valid JSON with this EXACT structure:
{
  "task_achievement": integer 0-100,
  "coherence": integer 0-100,
  "lexical_resource": integer 0-100,
  "grammar": integer 0-100,
  "overall": integer 0-100,
  "strengths": ["strength1", "strength2", ...],
  "improvements": ["improvement1", "improvement2", ...],
  "actionable_tips": ["tip1", "tip2", "tip3"],
  "grammarIssues": [
    {"before": "error snippet", "after": "corrected", "explanation": "why"}
  ],
  "cefr": "A1|A2|B1|B2|C1|C2"
}

GRADING RUBRIC (score 0-100 integers for each):

1. TASK ACHIEVEMENT: How well the response addresses the prompt
   - 85-100: Fully addresses all parts, well-developed ideas, relevant details
   - 70-84: Addresses all parts adequately, mostly developed ideas
   - 55-69: Addresses the prompt but may be limited or overgeneralized
   - 40-54: Partially addresses prompt, underdeveloped ideas
   - 0-39: Minimal response or largely off-topic

2. COHERENCE & COHESION: Organization, logical flow, linking
   - 85-100: Excellent progression, skillful use of cohesive devices
   - 70-84: Good organization with clear progression
   - 55-69: Adequate organization, some cohesive devices
   - 40-54: Some organization issues, limited cohesion
   - 0-39: Poor organization, confusing progression

3. LEXICAL RESOURCE: Vocabulary range, precision, spelling
   - 85-100: Wide range, precise vocabulary, rare errors
   - 70-84: Good vocabulary range, generally precise
   - 55-69: Adequate vocabulary, some inappropriate usage
   - 40-54: Limited vocabulary, frequent errors
   - 0-39: Very limited vocabulary, impedes communication

4. GRAMMATICAL RANGE & ACCURACY: Variety and correctness
   - 85-100: Wide range of structures, rare errors
   - 70-84: Good variety, errors don't impede communication
   - 55-69: Mix of simple and complex structures, some errors
   - 40-54: Limited structures, frequent errors
   - 0-39: Very limited grammar, many errors

5. OVERALL: Holistic evaluation combining all criteria

CEFR LEVEL GUIDELINES:
- C2 (85-100): Mastery level, native-like proficiency
- C1 (75-84): Advanced, effective operational proficiency
- B2 (65-74): Upper intermediate, independent user
- B1 (50-64): Intermediate, threshold level
- A2 (35-49): Elementary, waystage
- A1 (0-34): Beginner, breakthrough level

IMPORTANT INSTRUCTIONS:
- Provide 2-4 specific strengths about what the writer did well
- Provide 2-4 specific areas for improvement
- Give 3 actionable, practical tips for improvement
- Identify up to 6 grammar issues with corrections and explanations
- Be encouraging but honest in your assessment
- Consider the task type and time constraints in your evaluation

FOR INTERACTIVE WRITING (2-part tasks):
- Provide overall scores based on combined performance
- Include step1Feedback with strengths and improvements for Part 1
- Include step2Feedback with strengths and improvements for Part 2
- Overall strengths/improvements should synthesize both parts`;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = RequestSchema.parse(body);

    // Get or create Supabase user
    const supabase = getAdminSupabaseClient();
    const { data: supabaseUserId, error: userError } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      {
        p_clerk_user_id: userId,
        p_email: user?.emailAddresses[0]?.emailAddress,
        p_display_name: user?.firstName || user?.username || 'User'
      }
    );

    if (userError || !supabaseUserId) {
      console.error('Error getting/creating user:', userError);
      return NextResponse.json(
        { error: 'Failed to get user' },
        { status: 500 }
      );
    }

    // Build user prompt based on question type
    let userPrompt = `TASK: ${validatedData.prompt}\n\nUSER'S WRITING:\n${validatedData.writingText}\n\nWRITING TIME: ${validatedData.duration} seconds`;

    if (validatedData.questionType === 'write_about_photo' && validatedData.imageUrl) {
      userPrompt = `TASK: Write a description of the image\nIMAGE DESCRIPTION CONTEXT: The user was shown an image and asked to write a description.\n\nUSER'S WRITING:\n${validatedData.writingText}\n\nWRITING TIME: ${validatedData.duration} seconds`;
    }

    if (validatedData.questionType === 'interactive_writing' && validatedData.step1Text && validatedData.step2Text) {
      userPrompt = `This is an interactive writing exercise with two parts.

PART 1 TASK: ${validatedData.prompt}
PART 1 RESPONSE:
${validatedData.step1Text}

PART 2 TASK: ${validatedData.step2Prompt || 'Follow-up question'}
PART 2 RESPONSE:
${validatedData.step2Text}

Evaluate both parts holistically, but also provide specific feedback for each part in the step1Feedback and step2Feedback fields.
The overall scores should reflect the combined performance across both parts.`;
    }

    // Call OpenAI for feedback
    console.log('Calling OpenAI for writing feedback...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const feedbackText = completion.choices[0]?.message?.content;
    if (!feedbackText) {
      throw new Error('No feedback generated');
    }

    console.log('Raw OpenAI response:', feedbackText);

    // Parse and validate feedback
    const feedbackData = JSON.parse(feedbackText);
    const validatedFeedback = FeedbackSchema.parse(feedbackData);

    // Calculate word count
    const wordCount = validatedData.writingText.trim().split(/\s+/).length;

    // Store attempt in database
    const attemptId = crypto.randomUUID();
    const { error: insertError } = await supabase
      .from('attempts')
      .insert({
        id: attemptId,
        session_id: validatedData.sessionId,
        question_id: validatedData.questionId,
        user_id: supabaseUserId,
        transcript: validatedData.writingText,
        score: validatedFeedback.overall,
        overall_score: validatedFeedback.overall,
        grammar_score: validatedFeedback.grammar / 20, // Convert 0-100 to 0-5
        vocabulary_score: validatedFeedback.lexical_resource / 20, // Convert 0-100 to 0-5
        coherence_score: validatedFeedback.coherence / 20, // Convert 0-100 to 0-5
        feedback: JSON.stringify(validatedFeedback),
        feedback_json: validatedFeedback,
        graded_at: new Date().toISOString(),
        attempted_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error inserting attempt:', insertError);
      // Don't fail the request if we can't store the attempt
    }

    // Update user's adaptive skill level for writing exercises
    const adaptiveTypes = ['writing_sample', 'interactive_writing'];
    if (adaptiveTypes.includes(validatedData.questionType)) {
      try {
        await updateUserLevel(
          supabaseUserId,
          'writing',
          validatedData.questionType as 'writing_sample' | 'interactive_writing',
          validatedFeedback.overall
        );
        console.log(`Updated user level for ${validatedData.questionType} with score ${validatedFeedback.overall}`);

        // Try to update prompt usage score - the questionId may be from generated_prompts
        try {
          await updatePromptUsageScore(supabaseUserId, validatedData.questionId, validatedFeedback.overall);
        } catch {
          // Ignore - question might be from questions table, not generated_prompts
        }
      } catch (levelError) {
        console.error('Error updating user level:', levelError);
        // Continue - don't fail the feedback response
      }
    }

    return NextResponse.json(validatedFeedback);

  } catch (error) {
    console.error('Error in writing-feedback API:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate feedback' },
      { status: 500 }
    );
  }
}
