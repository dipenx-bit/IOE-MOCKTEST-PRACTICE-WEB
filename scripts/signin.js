(async () => {
  const base = 'http://localhost:3002';
  const csrfRes = await fetch(base + '/api/auth/csrf');
  const csrf = await csrfRes.json();
  const rawCookies = typeof csrfRes.headers.raw === 'function' ? csrfRes.headers.raw()['set-cookie'] : (csrfRes.headers.get('set-cookie') ? [csrfRes.headers.get('set-cookie')] : []);
  const csrfCookieHeader = rawCookies ? rawCookies.map(c => c.split(';')[0]).join('; ') : '';

  const params = new URLSearchParams();
  params.append('csrfToken', csrf.csrfToken);
  params.append('email', 'dipenbudhathoki70@gmail.com');
  params.append('password', 'lucifer69');
  params.append('callbackUrl', '/admin/dashboard');
  params.append('json', 'true');

  const loginRes = await fetch(base + '/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': csrfCookieHeader },
    body: params.toString(),
    redirect: 'manual'
  });

  console.log('Login status:', loginRes.status, 'headers:', JSON.stringify(Object.fromEntries(loginRes.headers.entries())));
  let cookies = [];
  if (loginRes.headers && typeof loginRes.headers.get === 'function') {
    const sc = loginRes.headers.get('set-cookie');
    if (sc) {
      cookies = sc.includes(', ') ? sc.split(', ').filter(Boolean) : [sc];
    }
  }
  console.log('Set-Cookie from login:', cookies);

  // Use cookies to fetch session
  const loginCookieHeader = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
  const cookieHeader = [csrfCookieHeader, loginCookieHeader].filter(Boolean).join('; ');
  const sessionRes = await fetch(base + '/api/auth/session', { headers: { Cookie: cookieHeader } });
  const session = await sessionRes.text();
  console.log('Session response:', session);
})();
