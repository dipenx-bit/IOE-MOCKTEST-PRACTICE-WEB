(async () => {
  const url = 'http://localhost:3003/api/auth/register';
  const body = {
    fullName: 'Test Student',
    email: `testuser${Date.now()}@example.com`,
    password: 'Student@123',
    confirmPassword: 'Student@123',
    dateOfBirth: '2002-01-01',
    sex: 'MALE',
    collegeName: 'Test College'
  };

  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const text = await res.text();
    console.log('Status', res.status);
    console.log('Body', text);
  } catch (e) {
    console.error('Request failed', e);
  }
})();
