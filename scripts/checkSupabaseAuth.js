const fetch = globalThis.fetch;

const SUPABASE_URL = 'https://hnuswrmzgwobwlpifqok.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhudXN3cm16Z3dvYndscGlmcW9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODE5NjIsImV4cCI6MjA3MjM1Nzk2Mn0.6z3F94iH5Ihno45LLbYXbyX7wyEnd7l6uO2wF2sAPqg';

async function main() {
  const email = `test-${Date.now()}@example.com`;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password: 'Password123!' })
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
