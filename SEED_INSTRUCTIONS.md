# Seeding Questions Database

## Prerequisites

1. Ensure you have your Supabase project set up
2. Get your Service Role Key from the Supabase dashboard (Settings > API)

## Setup

1. Create a `.env.local` file if you don't have one:
```bash
cp .env.example .env.local
```

2. Add these environment variables to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

⚠️ **IMPORTANT**: Never commit the Service Role Key to version control!

## Running the Seed Script

To populate your database with sample questions:

```bash
pnpm seed
```

This will:
- Upsert 5 question types: `listen_then_speak`, `read_aloud`, `describe_image`, `answer_question`, `speak_on_topic`
- Insert 10 sample questions spread across these types
- Each question includes appropriate metadata for its type

## What Gets Seeded

### Question Types
- **listen_then_speak**: Practice listening and repeating phrases
- **read_aloud**: Read text aloud for pronunciation practice
- **describe_image**: Describe what you see in an image
- **answer_question**: Answer open-ended questions
- **speak_on_topic**: Speak about a given topic for a duration

### Sample Questions
- 2 questions per type
- Various difficulty levels (1-3)
- Multiple target languages (English, Spanish, French, German)
- Appropriate metadata for each type (audio_url, image_url, durations, etc.)

## Security Notes

- The script includes a guard to prevent running in browser environments
- Service Role Key is only used server-side in Node.js
- Always keep your Service Role Key secret and never expose it in client code

## Troubleshooting

If you encounter errors:
1. Check that your environment variables are set correctly
2. Ensure your Supabase tables exist (`questions`, `question_types`)
3. Verify your Service Role Key has the necessary permissions
4. Check the console output for specific error messages