import { test, expect, Page } from '@playwright/test';
import { mockSignIn, mockAPIResponses } from './helpers/auth';

test.describe('Practice Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up mocked authentication and API responses
    await mockSignIn(page);
    await mockAPIResponses(page);
  });

  test('Sign-in flow redirects to dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Should see landing page
    await expect(page.locator('h1')).toContainText(/Speak Like a Native/i);
    
    // Click Get Started
    await page.click('text=Get Started');
    
    // Should redirect to /app (mocked auth)
    await expect(page).toHaveURL(/\/app/);
    
    // Should see dashboard
    await expect(page.locator('h1')).toContainText(/Your Progress/i);
  });

  test('Read then speak: full flow from prep to feedback', async ({ page }) => {
    // Navigate to practice page
    await page.goto('/app/practice/read_then_speak');
    
    // Wait for prep phase
    await expect(page.locator('h2')).toContainText('Get Ready');
    
    // Check timer is visible
    const timerElement = page.locator('.text-4xl.font-mono');
    await expect(timerElement).toBeVisible();
    
    // Check prompt is visible
    await expect(page.locator('text=Test prompt for reading aloud')).toBeVisible();
    
    // Click Skip to Recording (or press Space)
    await page.keyboard.press(' ');
    
    // Should enter recording phase
    await expect(page.locator('h2')).toContainText('Recording...');
    
    // Mock microphone permission
    await page.context().grantPermissions(['microphone']);
    
    // Wait for minimum recording time (3 seconds in mock)
    await page.waitForTimeout(3500);
    
    // Finish recording button should be enabled
    const finishButton = page.locator('button:has-text("Finish Recording")');
    await expect(finishButton).toBeEnabled();
    
    // Click finish or press Space
    await page.keyboard.press(' ');
    
    // Should show processing
    await expect(page.locator('h2')).toContainText('Processing Your Recording');
    
    // Should show feedback (mocked immediate response)
    await expect(page.locator('h2')).toContainText('Your Performance', { timeout: 10000 });
    
    // Check feedback elements
    await expect(page.locator('text=Overall Score')).toBeVisible();
    await expect(page.locator('text=85')).toBeVisible(); // Overall score from mock
    
    // Check subscores
    await expect(page.locator('text=Fluency')).toBeVisible();
    await expect(page.locator('text=Pronunciation')).toBeVisible();
    await expect(page.locator('text=Grammar')).toBeVisible();
    
    // Check feedback sections
    await expect(page.locator('text=Strengths')).toBeVisible();
    await expect(page.locator('text=Clear pronunciation')).toBeVisible();
    
    // Check action buttons
    await expect(page.locator('button:has-text("Re-try This Prompt")')).toBeVisible();
    await expect(page.locator('button:has-text("Copy Feedback")')).toBeVisible();
  });

  test('Listen then speak: TTS plays when pressing Play', async ({ page }) => {
    // Mock the question type for listen_then_speak
    await page.route('**/rest/v1/questions**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'mock_listen_question',
          type: 'listen_then_speak',
          prompt: 'Hello, how are you today?',
          target_language: 'English',
          source_language: 'English',
          difficulty: 1,
          prep_seconds: 10,
          min_seconds: 5,
          max_seconds: 15,
        }]),
      });
    });

    // Track TTS API calls
    let ttsCallCount = 0;
    await page.route('**/api/tts', async route => {
      ttsCallCount++;
      const mockAudioBuffer = Buffer.from([0xFF, 0xF3, 0x48, 0x00]);
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: mockAudioBuffer,
      });
    });

    await page.goto('/app/practice/listen_then_speak');
    
    // Wait for prep phase
    await expect(page.locator('h2')).toContainText('Get Ready');
    
    // Find and click Play Audio button
    const playButton = page.locator('button:has-text("Play Audio")');
    await expect(playButton).toBeVisible();
    await playButton.click();
    
    // Should show "Playing..." state
    await expect(page.locator('button:has-text("Playing...")')).toBeVisible();
    
    // Verify TTS API was called
    expect(ttsCallCount).toBeGreaterThan(0);
    
    // During recording phase, should have Replay Audio button
    await page.keyboard.press(' '); // Skip to recording
    await expect(page.locator('h2')).toContainText('Recording...');
    await expect(page.locator('button:has-text("Replay Audio")')).toBeVisible();
  });

  test('Custom prompt: duration slider enforces min/max constraints', async ({ page }) => {
    await page.goto('/app/custom');
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Custom Practice');
    
    // Enter a prompt
    const promptTextarea = page.locator('textarea[placeholder*="Example"]');
    await promptTextarea.fill('This is my custom speaking prompt for testing.');
    
    // Set duration to 90 seconds
    const durationSlider = page.locator('input[type="range"]');
    await durationSlider.fill('90');
    
    // Verify duration display
    await expect(page.locator('text=90').first()).toBeVisible();
    await expect(page.locator('text=seconds').first()).toBeVisible();
    
    // Check calculated min/max values
    // For 90s: min = ceil(max(30, 90/3)) = ceil(30) = 30
    // max = 90
    await expect(page.locator('text=/at least 30 seconds/')).toBeVisible();
    await expect(page.locator('text=/up to 90 seconds/')).toBeVisible();
    
    // Test with different duration (180 seconds)
    await durationSlider.fill('180');
    
    // For 180s: min = ceil(max(30, 180/3)) = ceil(60) = 60
    // max = 180
    await expect(page.locator('text=/at least 60 seconds/')).toBeVisible();
    await expect(page.locator('text=/up to 180 seconds/')).toBeVisible();
    
    // Test with minimum duration (30 seconds)
    await durationSlider.fill('30');
    
    // For 30s: min = ceil(max(30, 30/3)) = ceil(30) = 30
    // max = 30
    await expect(page.locator('text=/at least 30 seconds/')).toBeVisible();
    await expect(page.locator('text=/up to 30 seconds/')).toBeVisible();
    
    // Test Save Prompt checkbox
    const saveCheckbox = page.locator('input[type="checkbox"]#save-prompt');
    await saveCheckbox.check();
    
    // Title input should appear
    const titleInput = page.locator('input[placeholder*="title"]');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('My Test Prompt');
    
    // Mock the API for starting practice
    await page.route('**/rest/v1/practice_sessions**', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'custom_session_id',
          user_id: 'mock_user_id',
          started_at: new Date().toISOString(),
        }),
      });
    });

    await page.route('**/rest/v1/questions**', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'custom_question_id',
            type: 'custom_prompt',
            prompt: 'This is my custom speaking prompt for testing.',
            prep_seconds: 20,
            min_seconds: 30,
            max_seconds: 30,
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Click Start Practice
    const startButton = page.locator('button:has-text("Start Practice")');
    await expect(startButton).toBeEnabled();
    await startButton.click();
    
    // Should navigate to practice runner with custom prompt
    await expect(page).toHaveURL(/\/app\/practice\/custom_prompt\?session=.*&question=.*/);
  });

  test('Keyboard shortcuts work correctly', async ({ page }) => {
    await page.goto('/app/practice/read_then_speak');
    
    // Wait for prep phase
    await expect(page.locator('h2')).toContainText('Get Ready');
    
    // Press 'N' to skip prep
    await page.keyboard.press('n');
    
    // Should enter recording phase
    await expect(page.locator('h2')).toContainText('Recording...');
    
    // Grant microphone permission
    await page.context().grantPermissions(['microphone']);
    
    // Wait for minimum time
    await page.waitForTimeout(3500);
    
    // Press Space to finish recording
    await page.keyboard.press(' ');
    
    // Should show processing
    await expect(page.locator('h2')).toContainText('Processing Your Recording');
  });

  test('Speak about photo shows image properly', async ({ page }) => {
    // Mock speak_about_photo question
    await page.route('**/rest/v1/questions**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'mock_photo_question',
          type: 'speak_about_photo',
          prompt: 'Describe what you see in this image',
          image_url: 'https://example.com/test-image.jpg',
          target_language: 'English',
          source_language: 'English',
          difficulty: 2,
          prep_seconds: 15,
          min_seconds: 20,
          max_seconds: 45,
        }]),
      });
    });

    await page.goto('/app/practice/speak_about_photo');
    
    // Check image is displayed in prep phase
    await expect(page.locator('img[alt="Describe this image"]')).toBeVisible();
    
    // Should have "Next" button instead of "Skip to Recording"
    const nextButton = page.locator('button:has-text("Next")');
    await expect(nextButton).toBeVisible();
    
    // Click Next
    await nextButton.click();
    
    // Should enter recording phase
    await expect(page.locator('h2')).toContainText('Recording...');
    
    // Image should still be visible during recording
    await expect(page.locator('img[alt="Describe this image"]')).toBeVisible();
  });
});