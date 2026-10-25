/**
 * End-to-end reseller approval verification.
 *
 * Requires a running API and a database with an admin account:
 *   API_BASE_URL=http://localhost:3000 \
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=******** \
 *   npx ts-node scripts/verify-reseller-approval.ts
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ORGANIZATION_ID =
  process.env.ORGANIZATION_ID || '550e8400-e29b-41d4-a716-446655440000';

type Result = { name: string; ok: boolean; detail?: string };

const results: Result[] = [];

function record(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  const icon = ok ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function request(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: any }> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { status: response.status, body };
}

function authHeader(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function uniqueSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function baseRegistration(email: string, phone: string, role: 'RESELLER' | 'USER') {
  return {
    name: 'Verification Account',
    email,
    phone,
    password: 'Password123!',
    role,
    organizationId: ORGANIZATION_ID,
    presentDistrict: 'Dhaka',
    presentThana: 'Gulshan',
    permanentDistrict: 'Dhaka',
    permanentThana: 'Gulshan',
  };
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      'Set ADMIN_EMAIL and ADMIN_PASSWORD (an existing SUPER_ADMIN or ADMIN) before running.',
    );
    process.exitCode = 1;
    return;
  }

  const suffix = uniqueSuffix();
  const resellerEmail = `reseller.verify.${suffix}@example.com`;
  const resellerPhone = `0179${suffix.slice(-7)}`;
  const customerEmail = `customer.verify.${suffix}@example.com`;
  const customerPhone = `0188${suffix.slice(-7)}`;

  // 1. Register a reseller — must not receive tokens.
  const registerReseller = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(baseRegistration(resellerEmail, resellerPhone, 'RESELLER')),
  });

  record(
    'Reseller registration returns requiresApproval and no tokens',
    registerReseller.status === 201 &&
      registerReseller.body?.requiresApproval === true &&
      !registerReseller.body?.accessToken,
    `status ${registerReseller.status}`,
  );

  const resellerId = registerReseller.body?.user?.id as string | undefined;

  // 2. Pending reseller cannot log in.
  const pendingLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: resellerEmail, password: 'Password123!' }),
  });

  record(
    'Pending reseller login is denied (403)',
    pendingLogin.status === 403,
    pendingLogin.body?.message,
  );

  // Admin session.
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  const adminToken = adminLogin.body?.accessToken as string | undefined;

  if (!adminToken) {
    record('Admin login', false, `status ${adminLogin.status}`);
    finish();
    return;
  }
  record('Admin login', true);

  if (!resellerId) {
    record('Reseller id available for approval', false);
    finish();
    return;
  }

  // 3. Admin approves the reseller.
  const approve = await request(`/users/${resellerId}/status`, {
    method: 'PATCH',
    headers: authHeader(adminToken),
    body: JSON.stringify({ status: 'ACTIVE' }),
  });

  record('Admin approves reseller', approve.status === 200, `status ${approve.status}`);

  // 4. Approved reseller can log in.
  const approvedLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: resellerEmail, password: 'Password123!' }),
  });

  const resellerToken = approvedLogin.body?.accessToken as string | undefined;
  const resellerRefresh = approvedLogin.body?.refreshToken as string | undefined;

  record(
    'Approved reseller login succeeds',
    approvedLogin.status === 201 || approvedLogin.status === 200,
    `status ${approvedLogin.status}`,
  );

  if (resellerToken) {
    const protectedCall = await request('/withdrawals/wallet-summary', {
      headers: authHeader(resellerToken),
    });
    record(
      'Approved reseller can call a protected endpoint',
      protectedCall.status === 200,
      `status ${protectedCall.status}`,
    );
  }

  // 5. Suspend the reseller.
  const suspend = await request(`/users/${resellerId}/status`, {
    method: 'PATCH',
    headers: authHeader(adminToken),
    body: JSON.stringify({ status: 'DEACTIVATED' }),
  });

  record('Admin suspends reseller', suspend.status === 200, `status ${suspend.status}`);

  if (resellerToken) {
    const afterSuspend = await request('/withdrawals/wallet-summary', {
      headers: authHeader(resellerToken),
    });
    record(
      'Existing access token is rejected after suspension (403)',
      afterSuspend.status === 403,
      `status ${afterSuspend.status}`,
    );
  }

  if (resellerRefresh) {
    const refreshAttempt = await request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: resellerRefresh }),
    });
    record(
      'Refresh token is rejected after suspension',
      refreshAttempt.status === 403 || refreshAttempt.status === 401,
      `status ${refreshAttempt.status}`,
    );
  }

  const suspendedLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: resellerEmail, password: 'Password123!' }),
  });
  record(
    'Suspended reseller login is denied (403)',
    suspendedLogin.status === 403,
    suspendedLogin.body?.message,
  );

  // 6. Self-service status change must be rejected.
  if (resellerToken) {
    const selfApprove = await request(`/users/${resellerId}/status`, {
      method: 'PATCH',
      headers: authHeader(resellerToken),
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    record(
      'Reseller cannot modify their own approval status',
      selfApprove.status === 403,
      `status ${selfApprove.status}`,
    );
  }

  // 7. Regular customer behaviour is unchanged.
  const registerCustomer = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(baseRegistration(customerEmail, customerPhone, 'USER')),
  });

  record(
    'Customer registration still returns tokens',
    Boolean(registerCustomer.body?.accessToken),
    `status ${registerCustomer.status}`,
  );

  const customerLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: customerEmail, password: 'Password123!' }),
  });

  record(
    'Customer login still succeeds',
    customerLogin.status === 201 || customerLogin.status === 200,
    `status ${customerLogin.status}`,
  );

  finish();
}

function finish() {
  const failed = results.filter((result) => !result.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed.`,
  );
  if (failed.length) {
    console.log('Failed checks:');
    failed.forEach((result) => console.log(` - ${result.name}`));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Verification crashed:', error);
  process.exitCode = 1;
});
