import { Page, expect } from '@playwright/test';

/**
 * Mock authentication for testing
 * In a real scenario, you'd use Clerk's test tokens or a test account
 */
export async function mockSignIn(page: Page) {
  // Mock Clerk authentication by setting cookies/localStorage
  // This is a simplified version - in production you'd use Clerk's test mode
  
  await page.addInitScript(() => {
    // Mock Clerk's __clerk_db_jwt cookie
    document.cookie = '__clerk_db_jwt=mock_jwt_token; path=/';
    
    // Mock localStorage items that Clerk uses
    localStorage.setItem('__clerk_client_jwt', 'mock_client_jwt');
    localStorage.setItem('__clerk_session', JSON.stringify({
      id: 'mock_session_id',
      userId: 'mock_user_id',
      status: 'active',
    }));
  });

  // Mock the Clerk API responses
  await page.route('**/v1/client**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        response: {
          sessions: [{
            id: 'mock_session_id',
            user: {
              id: 'mock_user_id',
              email_addresses: [{ email_address: 'test@example.com' }],
              first_name: 'Test',
              last_name: 'User',
            },
            status: 'active',
          }],
        },
      }),
    });
  });
}

/**
 * Sign in through the actual Clerk UI (for E2E tests)
 */
export async function signInWithClerk(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  
  // Wait for Clerk sign-in form to load
  await page.waitForSelector('[data-clerk-sign-in]', { timeout: 10000 });
  
  // Fill in email
  await page.fill('input[name="identifier"]', email);
  await page.click('button:has-text("Continue")');
  
  // Fill in password
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("Continue")');
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/app', { timeout: 10000 });
}

/**
 * Mock successful API responses for testing
 */
export async function mockAPIResponses(page: Page) {
  // Mock Supabase responses
  await page.route('**/rest/v1/rpc/get_or_create_user_by_clerk_id', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify('mock_supabase_user_id'),
    });
  });

  // Mock practice session creation
  await page.route('**/rest/v1/practice_sessions**', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock_session_id',
          user_id: 'mock_supabase_user_id',
          started_at: new Date().toISOString(),
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock questions fetch
  await page.route('**/rest/v1/questions**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: 'mock_question_id',
        type: 'read_then_speak',
        prompt: 'Test prompt for reading aloud',
        target_language: 'English',
        source_language: 'English',
        difficulty: 1,
        prep_seconds: 5, // Short for testing
        min_seconds: 3,  // Short for testing
        max_seconds: 10, // Short for testing
      }]),
    });
  });

  // Mock audio upload
  await page.route('**/api/upload-audio', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        audioUrl: 'storage:mock_audio_path',
        fileName: 'mock_audio.webm',
      }),
    });
  });

  // Mock grading API
  await page.route('**/api/grade', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        feedback: {
          overall: 85,
          fluency: 4.2,
          pronunciation: 4.0,
          grammar: 4.5,
          vocabulary: 4.3,
          coherence: 4.1,
          strengths: [
            'Clear pronunciation',
            'Good grammar usage',
            'Coherent response',
          ],
          improvements: [
            'Vary vocabulary more',
            'Work on fluency',
            'Add more detail',
          ],
          actionable_tips: [
            'Practice speaking slowly',
            'Read more English texts',
            'Record yourself daily',
          ],
        },
      }),
    });
  });

  // Mock TTS API
  await page.route('**/api/tts', async route => {
    // Return a small mock audio file
    const mockAudioBuffer = Buffer.from([
      0xFF, 0xF3, 0x48, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x69, 0x6E, 0x66, 0x6F, 0x00, 0x00, 0x00,
    ]);
    
    await route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      body: mockAudioBuffer,
      headers: {
        'X-Cache': 'MISS',
      },
    });
  });
}