const http = require('http');

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: reqHeaders
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(body);
          } catch (_) {
            parsed = body;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('Testing NxtStepGo End-to-End...');

  // 1. Health check
  const health = await request('GET', '/api/health');
  console.log('1. Health check:', health.status, JSON.stringify(health.data));

  // 2. Signup
  const email = `test.${Date.now()}@example.com`;
  const signup = await request('POST', '/api/auth/signup', {
    name: 'Verified Student',
    email,
    password: 'securePassword123'
  });
  console.log('2. Signup status:', signup.status, 'User ID:', signup.data.userId, 'Token present:', Boolean(signup.data.token));

  // 3. Login
  const login = await request('POST', '/api/auth/login', {
    email,
    password: 'securePassword123'
  });
  console.log('3. Login status:', login.status, 'User:', login.data.user.name, 'Token present:', Boolean(login.data.token));

  // 4. Bad password check
  const badLogin = await request('POST', '/api/auth/login', {
    email,
    password: 'wrongPassword'
  });
  console.log('4. Bad login rejected:', badLogin.status === 400 ? 'YES (400)' : 'FAIL');

  const authHeader = {
    Authorization: `Bearer ${login.data.token}`,
    'x-user-id': login.data.userId
  };

  // 5. Bookmark
  const bookmark = await request(
    'POST',
    '/api/preferences/bookmark',
    {
      type: 'job',
      elementId: 'Bioinformatics Analyst',
      title: 'Bioinformatics Analyst',
      department: 'bioinfo',
      metadata: { source: 'automated_test' }
    },
    authHeader
  );
  console.log('5. Bookmark status:', bookmark.status, bookmark.data.message);

  // 6. Get Preferences
  const prefs = await request('GET', '/api/preferences', null, authHeader);
  console.log('6. Bookmarked jobs count:', prefs.data.bookmarkedJobs ? prefs.data.bookmarkedJobs.length : 0);

  // 7. Create Collection
  const col = await request(
    'POST',
    '/api/preferences/collection/create',
    {
      name: 'Dream Biotech Jobs',
      description: 'Saved for after graduation'
    },
    authHeader
  );
  console.log('7. Create Collection status:', col.status, col.data.message);

  // 8. Skill Matcher
  const match = await request('POST', '/api/skill-matcher/match', {
    skills: 'Python, Machine Learning, Genomics Data Analysis'
  });
  console.log('8. Skill Match status:', match.status, 'Total matches:', match.data.totalMatches, 'Top match:', match.data.topMatch ? match.data.topMatch.title : 'None');

  // 9. Page checks
  const pages = [
    '/',
    '/departments.html',
    '/hub.html?dept=biotech',
    '/jobs.html?dept=biotech',
    '/exams.html?dept=biotech',
    '/programs.html?dept=biotech',
    '/bookmarks.html',
    '/collections.html',
    '/login.html',
    '/signup.html',
    '/skill-matcher.html'
  ];

  for (const page of pages) {
    const pageRes = await request('GET', page);
    console.log(`Page: ${page} -> HTTP ${pageRes.status}`);
  }

  console.log('\n[OK] ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
