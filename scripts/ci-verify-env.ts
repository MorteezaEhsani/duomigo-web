#!/usr/bin/env tsx

/**
 * CI Environment Verification Script
 * Run this before builds to identify missing environment variables
 * Usage: pnpm tsx scripts/ci-verify-env.ts
 */

const requiredPublicVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
];

const requiredServerVars = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLERK_SECRET_KEY",
];

const optionalVars = [
  "OPENAI_API_KEY",
  "VERCEL_ENV",
  "VERCEL_URL",
  "NODE_ENV",
];

function checkEnvironment() {
  console.log("🔍 Checking environment variables...\n");

  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
  console.log(`Environment: ${environment}`);
  console.log(`Node version: ${process.version}\n`);

  // Check required public vars
  console.log("📌 Required Public Variables:");
  const missingPublic: string[] = [];
  requiredPublicVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      console.log(`  ✅ ${varName}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`  ❌ ${varName}: MISSING`);
      missingPublic.push(varName);
    }
  });

  // Check required server vars
  console.log("\n🔐 Required Server Variables:");
  const missingServer: string[] = [];
  requiredServerVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      console.log(`  ✅ ${varName}: [REDACTED]`);
    } else {
      console.log(`  ❌ ${varName}: MISSING`);
      missingServer.push(varName);
    }
  });

  // Check optional vars
  console.log("\n📋 Optional Variables:");
  optionalVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      const display = varName.includes("KEY") ? "[REDACTED]" : value;
      console.log(`  ℹ️  ${varName}: ${display}`);
    } else {
      console.log(`  ⚠️  ${varName}: Not set`);
    }
  });

  // Summary
  console.log("\n" + "=".repeat(50));
  const totalMissing = missingPublic.length + missingServer.length;

  if (totalMissing === 0) {
    console.log("✅ All required environment variables are set!");
    return 0;
  } else {
    console.log(`❌ Missing ${totalMissing} required environment variable(s):\n`);
    if (missingPublic.length > 0) {
      console.log("Public vars:", missingPublic.join(", "));
    }
    if (missingServer.length > 0) {
      console.log("Server vars:", missingServer.join(", "));
    }

    if (environment === "production" || process.env.VERCEL_ENV === "production") {
      console.log("\n🚨 FAILING: Production builds require all environment variables");
      return 1;
    } else {
      console.log("\n⚠️  WARNING: Some env vars are missing (non-production build)");
      return 0;
    }
  }
}

// Run the check
const exitCode = checkEnvironment();
process.exit(exitCode);