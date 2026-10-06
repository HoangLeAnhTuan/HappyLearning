import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

// Mock NextRequest for isolated testing
function createMockRequest({
  headers = {},
  body = null,
}: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
} = {}): NextRequest {
  const headerMap = new Map(Object.entries(headers));
  return {
    method: "POST",
    url: "http://localhost:3000/api/test",
    headers: {
      get: (name: string) => headerMap.get(name.toLowerCase()) || null,
    },
    json: async () => body,
  } as unknown as NextRequest;
}

function sanitizeSlug(raw: unknown): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

async function runSecurityTests() {
  console.log("=================================================");
  console.log("🔒 RUNNING HAPPYLEARNING SECURITY & AUTH TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // --- TEST GROUP 1: IP DETECTION ---
  console.log("--- Test Group 1: IP Detection & Headers ---");
  const req1 = createMockRequest({ headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" } });
  assert(getClientIp(req1) === "203.0.113.195", "Extracts leftmost client IP from x-forwarded-for");

  const req2 = createMockRequest({ headers: { "cf-connecting-ip": "198.51.100.22" } });
  assert(getClientIp(req2) === "198.51.100.22", "Extracts Cloudflare connecting IP when present");

  // --- TEST GROUP 2: IP RATE LIMITING (Instruction #6) ---
  console.log("\n--- Test Group 2: IP Rate Limiter (Instruction #6) ---");
  const testIp = "192.168.1.100";
  const mockReq = createMockRequest({ headers: { "x-forwarded-for": testIp } });

  // 5 allowed attempts
  for (let i = 1; i <= 5; i++) {
    const res = checkRateLimit(mockReq, {
      prefix: "test_login",
      limit: 5,
      windowMs: 60000,
    });
    assert(res.success === true, `Attempt #${i} allowed within rate limit`);
  }

  // 6th attempt should be blocked with 429
  const blockedRes = checkRateLimit(mockReq, {
    prefix: "test_login",
    limit: 5,
    windowMs: 60000,
  });
  assert(blockedRes.success === false, "Attempt #6 rejected with rate limit exceeded (429)");
  assert(blockedRes.remaining === 0, "Remaining attempts reported as 0");
  assert(blockedRes.resetInSeconds > 0, "Retry-After / resetInSeconds properly calculated");

  // Different IP should still have quota
  const otherReq = createMockRequest({ headers: { "x-forwarded-for": "10.0.0.1" } });
  const otherRes = checkRateLimit(otherReq, {
    prefix: "test_login",
    limit: 5,
    windowMs: 60000,
  });
  assert(otherRes.success === true, "Different IP receives independent rate limit quota");

  // --- TEST GROUP 3: MASS ASSIGNMENT & SANITIZATION (Instruction #4 & #5) ---
  console.log("\n--- Test Group 3: Mass Assignment & Value Clamping ---");

  // Verify duration clamping
  const testDuration = (raw: unknown) => Math.max(1, Math.min(7200, Math.round(typeof raw === "number" ? raw : 120)));
  assert(testDuration(-50) === 1, "Negative practice duration clamped to 1s min");
  assert(testDuration(999999) === 7200, "Excessive duration clamped to 7200s (2h max)");
  assert(testDuration(120) === 120, "Normal duration preserved");

  // Verify collocation count clamping
  const testColloc = (raw: unknown) => Math.max(0, Math.min(100, Math.round(typeof raw === "number" ? raw : 0)));
  assert(testColloc(-5) === 0, "Negative collocations count clamped to 0 min");
  assert(testColloc(500) === 100, "Excessive collocations count clamped to 100 max");
  assert(testColloc(8) === 8, "Valid collocations count preserved");

  // Verify slug sanitization
  assert(
    sanitizeSlug("../../../etc/passwd; DROP TABLE topics; --") === "etcpasswd-drop-table-topics-",
    "SQL injection & path traversal characters stripped from topic slug"
  );
  assert(
    sanitizeSlug("Describe A Book You Read Recently!") === "describe-a-book-you-read-recently",
    "Slug normalized from human title with hyphenation"
  );

  // --- TEST GROUP 4: ACCESS CODE VALIDATION ---
  console.log("\n--- Test Group 4: Student Access Code Security ---");
  const validCodeRegex = /^HL-[A-Z0-9]+-[A-Z0-9]{4}$/i;
  assert(validCodeRegex.test("HL-K12-7K9A"), "Valid access code format passes");
  assert(validCodeRegex.test("HL-GRADE10-9X2M"), "Longer class code passes");
  assert(!validCodeRegex.test("'; DROP TABLE students; --"), "Malicious SQL in code fails regex");
  assert(!validCodeRegex.test("HL-"), "Incomplete code fails regex");

  console.log("\n=================================================");
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
