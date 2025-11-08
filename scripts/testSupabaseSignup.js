const fetch = globalThis.fetch;

async function run() {
  const res = await fetch('https://hnuswrmzgwobwlpifqok.supabase.co/auth/v1/signup', {
    method: 'POST',
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: `test-local-${Date.now()}@example.com`,
      password: 'Password123!'
    })
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
