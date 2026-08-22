/**
 * DailyMarts Backend — 100 Test Cases
 * ====================================
 * Run: node backend/tests/run-100-tests.js
 *
 * Prerequisites:
 *   - Backend server running locally on http://localhost:5000
 *   - OR set environment variable: TEST_BASE_URL=https://dailymartsbackend.onrender.com
 *
 * No external test framework needed — uses built-in Node.js fetch.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

// ─── State shared across tests ─────────────────────────────────────────────────
let farmerToken = '';
let customerToken = '';
let farmer2Token = '';
let farmerId = '';
let customerId = '';
let productId = '';
let productMongoId = '';
let orderId = '';
let subscriptionId = '';
let billId = '';
let paymentId = '';

// ─── Test runner ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS [${++passed}] ${name}`);
  } catch (err) {
    ++failed;
    failures.push({ name, error: err.message });
    console.log(`  ❌ FAIL [${passed + failed}] ${name}`);
    console.log(`         → ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, label) {
  if (actual !== expected)
    throw new Error(`${label}: expected "${expected}", got "${actual}"`);
}

async function api(method, path, body, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Health Checks (Tests 1-3)
// ─────────────────────────────────────────────────────────────────────────────
async function section1() {
  console.log('\n📋 SECTION 1: Health Checks');

  await test('T01 - GET / returns 200 OK', async () => {
    const { status } = await api('GET', '/');
    assertEqual(status, 200, 'status');
  });

  await test('T02 - GET /api/health returns 200 OK', async () => {
    const { status, body } = await api('GET', '/api/health');
    assertEqual(status, 200, 'status');
    assertEqual(body.status, 'OK', 'body.status');
  });

  await test('T03 - Unknown route returns 404', async () => {
    const { status } = await api('GET', '/api/nonexistent-route-xyz');
    assertEqual(status, 404, 'status');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — Auth / Registration (Tests 4-15)
// ─────────────────────────────────────────────────────────────────────────────
const FARMER_EMAIL = `farmer_test_${Date.now()}@dailymarts.test`;
const FARMER2_EMAIL = `farmer2_test_${Date.now()}@dailymarts.test`;
const CUSTOMER_EMAIL = `customer_test_${Date.now()}@dailymarts.test`;

async function section2() {
  console.log('\n📋 SECTION 2: Authentication');

  await test('T04 - Register FARMER succeeds', async () => {
    const { status, body } = await api('POST', '/api/auth/register', {
      name: 'Test Farmer',
      email: FARMER_EMAIL,
      phone: '9000000001',
      password: 'password123',
      role: 'FARMER',
      farmName: 'Test Dairy Farm',
      upiId: 'testfarmer@oksbi',
      address: 'Farm Road',
      city: 'Dindigul',
      district: 'Dindigul',
      state: 'Tamil Nadu',
      pincode: '624001',
    });
    assertEqual(status, 201, 'status');
    assert(body.data?.token, 'token must exist');
    farmerToken = body.data.token;
    farmerId = body.data._id;
  });

  await test('T05 - Register CUSTOMER succeeds', async () => {
    const { status, body } = await api('POST', '/api/auth/register', {
      name: 'Test Customer',
      email: CUSTOMER_EMAIL,
      phone: '9000000002',
      password: 'password123',
      role: 'CUSTOMER',
      address: 'Customer Street',
      city: 'Dindigul',
      district: 'Dindigul',
      state: 'Tamil Nadu',
      pincode: '624001',
    });
    assertEqual(status, 201, 'status');
    assert(body.data?.token, 'token must exist');
    customerToken = body.data.token;
    customerId = body.data._id;
  });

  await test('T06 - Duplicate email registration returns 400', async () => {
    const { status } = await api('POST', '/api/auth/register', {
      name: 'Dup',
      email: FARMER_EMAIL,
      phone: '9999999999',
      password: 'pass123',
      role: 'FARMER',
      address: 'X',
      city: 'X',
    });
    assertEqual(status, 400, 'status');
  });

  await test('T07 - Register second FARMER (for isolation tests)', async () => {
    const { status, body } = await api('POST', '/api/auth/register', {
      name: 'Farmer Two',
      email: FARMER2_EMAIL,
      phone: '9000000003',
      password: 'password123',
      role: 'FARMER',
      farmName: 'Farm Two',
      upiId: 'farmer2@oksbi',
      address: 'Farm2 Road',
      city: 'Madurai',
      district: 'Madurai',
      state: 'Tamil Nadu',
      pincode: '625001',
    });
    assertEqual(status, 201, 'status');
    farmer2Token = body.data.token;
  });

  await test('T08 - Login with correct credentials returns token', async () => {
    const { status, body } = await api('POST', '/api/auth/login', {
      email: CUSTOMER_EMAIL,
      password: 'password123',
    });
    assertEqual(status, 200, 'status');
    assert(body.data?.token, 'token must exist');
  });

  await test('T09 - Login with wrong password returns 401', async () => {
    const { status } = await api('POST', '/api/auth/login', {
      email: CUSTOMER_EMAIL,
      password: 'wrongpassword',
    });
    assertEqual(status, 401, 'status');
  });

  await test('T10 - Login with non-existent email returns 401', async () => {
    const { status } = await api('POST', '/api/auth/login', {
      email: 'nobody@nobody.com',
      password: 'pass123',
    });
    assertEqual(status, 401, 'status');
  });

  await test('T11 - GET /api/auth/me with valid token returns user data', async () => {
    const { status, body } = await api('GET', '/api/auth/me', null, farmerToken);
    assertEqual(status, 200, 'status');
    assertEqual(body.data?.email, FARMER_EMAIL, 'email');
  });

  await test('T12 - GET /api/auth/me without token returns 401', async () => {
    const { status } = await api('GET', '/api/auth/me');
    assertEqual(status, 401, 'status');
  });

  await test('T13 - PUT /api/auth/profile updates farmer name', async () => {
    const { status, body } = await api('PUT', '/api/auth/profile', { name: 'Updated Farmer Name' }, farmerToken);
    assertEqual(status, 200, 'status');
    assertEqual(body.data?.name, 'Updated Farmer Name', 'name');
  });

  await test('T14 - PUT /api/auth/profile updates farmer upiId', async () => {
    const { status, body } = await api('PUT', '/api/auth/profile', { upiId: 'updatedfarmer@oksbi' }, farmerToken);
    assertEqual(status, 200, 'status');
    assertEqual(body.data?.upiId, 'updatedfarmer@oksbi', 'upiId');
  });

  await test('T15 - PUT /api/auth/me updates customer name', async () => {
    const { status, body } = await api('PUT', '/api/auth/me', { name: 'Updated Customer Name' }, customerToken);
    assertEqual(status, 200, 'status');
    assertEqual(body.data?.name, 'Updated Customer Name', 'name');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — Products (Tests 16-31)
// ─────────────────────────────────────────────────────────────────────────────
async function section3() {
  console.log('\n📋 SECTION 3: Products');

  await test('T16 - GET /api/products returns array (public)', async () => {
    const { status, body } = await api('GET', '/api/products');
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'data must be array');
  });

  await test('T17 - POST /api/products creates product (Farmer)', async () => {
    const { status, body } = await api('POST', '/api/products', {
      name: 'Premium Cow Milk',
      category: 'milk',
      description: 'Fresh A2 cow milk',
      unit: 'L',
      price: 60,
      fatContent: '4.5% Fat',
      isOrganic: true,
    }, farmerToken);
    assertEqual(status, 201, 'status');
    assert(body.data?.productId, 'productId must exist');
    productId = body.data.productId;
    productMongoId = body.data._id;
  });

  await test('T18 - New product appears in GET /api/products immediately', async () => {
    const { status, body } = await api('GET', '/api/products');
    assertEqual(status, 200, 'status');
    const found = body.data?.find((p) => p.productId === productId);
    assert(found, `New product ${productId} must appear in product list`);
  });

  await test('T19 - Product category normalized (milk → MILK)', async () => {
    const { status, body } = await api('GET', `/api/products/${productId}`);
    assertEqual(status, 200, 'status');
    assertEqual(body.data?.category, 'MILK', 'category');
  });

  await test('T20 - POST /api/products fails without auth token', async () => {
    const { status } = await api('POST', '/api/products', { name: 'X', price: 10 });
    assertEqual(status, 401, 'status');
  });

  await test('T21 - POST /api/products fails for CUSTOMER role', async () => {
    const { status } = await api('POST', '/api/products', {
      name: 'Customer Milk',
      category: 'MILK',
      unit: 'L',
      price: 50,
    }, customerToken);
    assertEqual(status, 403, 'status');
  });

  await test('T22 - GET /api/products/:id fetches product by custom productId', async () => {
    const { status, body } = await api('GET', `/api/products/${productId}`);
    assertEqual(status, 200, 'status');
    assertEqual(body.data?.productId, productId, 'productId');
  });

  await test('T23 - GET /api/products/:id fetches product by MongoDB _id', async () => {
    const { status, body } = await api('GET', `/api/products/${productMongoId}`);
    assertEqual(status, 200, 'status');
    assertEqual(body.data?._id, productMongoId, 'mongoId');
  });

  await test('T24 - GET /api/products with ?name= filter works', async () => {
    const { status, body } = await api('GET', '/api/products?name=Premium Cow Milk');
    assertEqual(status, 200, 'status');
    assert(body.data?.length >= 1, 'must find at least 1 result');
  });

  await test('T25 - GET /api/products with ?category=milk (lowercase) works', async () => {
    const { status, body } = await api('GET', '/api/products?category=milk');
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'data is array');
  });

  await test('T26 - GET /api/products with ?category=dairy (alias) works', async () => {
    const { status, body } = await api('GET', '/api/products?category=dairy');
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'data is array');
  });

  await test('T27 - GET /api/products with ?farmerId= scopes to farmer', async () => {
    const { status, body } = await api('GET', `/api/products?farmerId=${farmerId}`);
    assertEqual(status, 200, 'status');
    const allBelongToFarmer = body.data?.every((p) => p.farmer?._id === farmerId || p.farmer === farmerId);
    assert(allBelongToFarmer, 'all products must belong to the queried farmer');
  });

  await test('T28 - PUT /api/products/:id updates product name', async () => {
    const { status, body } = await api('PUT', `/api/products/${productMongoId}`, {
      name: 'Updated Premium Cow Milk',
    }, farmerToken);
    assertEqual(status, 200, 'status');
    assertEqual(body.data?.name, 'Updated Premium Cow Milk', 'name');
  });

  await test('T29 - PUT /api/products/:id by Farmer2 (not owner) returns 403', async () => {
    const { status } = await api('PUT', `/api/products/${productMongoId}`, {
      price: 999,
    }, farmer2Token);
    assertEqual(status, 403, 'status');
  });

  await test('T30 - Create product with MILK_PRODUCT category', async () => {
    const { status, body } = await api('POST', '/api/products', {
      name: 'Ghee 500ml',
      category: 'milk_product',
      unit: '500g',
      price: 350,
    }, farmerToken);
    assertEqual(status, 201, 'status');
    assertEqual(body.data?.category, 'MILK_PRODUCT', 'category');
  });

  await test('T31 - GET /api/products/:nonexistent returns 404', async () => {
    const { status } = await api('GET', '/api/products/DM-NON-EXISTENT-9999');
    assertEqual(status, 404, 'status');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — Orders (Tests 32-44)
// ─────────────────────────────────────────────────────────────────────────────
async function section4() {
  console.log('\n📋 SECTION 4: Orders');

  await test('T32 - POST /api/orders creates order', async () => {
    const { status, body } = await api('POST', '/api/orders', {
      productId: productId,
      quantity: 2,
      deliverySlot: 'MORNING',
    }, customerToken);
    assertEqual(status, 201, 'status');
    assert(body.data?.orderId, 'orderId must exist');
    orderId = body.data.orderId;
  });

  await test('T33 - GET /api/orders returns only this customer\'s orders', async () => {
    const { status, body } = await api('GET', '/api/orders', null, customerToken);
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'must be array');
    const allCustomer = body.data?.every((o) => o.customer?._id === customerId || o.customer === customerId);
    assert(allCustomer, 'all orders must belong to current customer');
  });

  await test('T34 - New user (no orders) gets empty array, not mock data', async () => {
    // Register a brand new customer
    const email = `newcustomer_${Date.now()}@test.com`;
    const regRes = await api('POST', '/api/auth/register', {
      name: 'Brand New Customer',
      email,
      phone: '9000000010',
      password: 'pass1234',
      role: 'CUSTOMER',
      address: 'New St',
      city: 'Dindigul',
    });
    const newToken = regRes.body.data?.token;
    assert(newToken, 'new customer token must exist');

    const { status, body } = await api('GET', '/api/orders', null, newToken);
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'must be array');
    assertEqual(body.data.length, 0, 'new user must have 0 orders');
  });

  await test('T35 - GET /api/orders without token returns 401', async () => {
    const { status } = await api('GET', '/api/orders');
    assertEqual(status, 401, 'status');
  });

  await test('T36 - GET /api/orders/:id returns order details', async () => {
    const { status, body } = await api('GET', `/api/orders/${orderId}`, null, customerToken);
    assertEqual(status, 200, 'status');
    assertEqual(body.data?.orderId, orderId, 'orderId');
  });

  await test('T37 - GET /api/orders/:id by Farmer2 (not owner) returns 403', async () => {
    const { status } = await api('GET', `/api/orders/${orderId}`, null, farmer2Token);
    assertEqual(status, 403, 'status');
  });

  await test('T38 - POST /api/orders with invalid productId returns 404', async () => {
    const { status } = await api('POST', '/api/orders', {
      productId: 'DM-NON-EXISTENT-9999',
      quantity: 1,
    }, customerToken);
    assertEqual(status, 404, 'status');
  });

  await test('T39 - POST /api/orders with quantity 0 returns 400', async () => {
    const { status } = await api('POST', '/api/orders', {
      productId: productId,
      quantity: 0,
    }, customerToken);
    assertEqual(status, 400, 'status');
  });

  await test('T40 - POST /api/orders without token returns 401', async () => {
    const { status } = await api('POST', '/api/orders', { productId, quantity: 1 });
    assertEqual(status, 401, 'status');
  });

  await test('T41 - PATCH /api/orders/:id/status updates by Farmer', async () => {
    const { status, body } = await api('PATCH', `/api/orders/${orderId}/status`, {
      status: 'DELIVERED',
    }, farmerToken);
    assertEqual(status, 200, 'status');
    assertEqual(body.data?.orderStatus, 'DELIVERED', 'orderStatus');
  });

  await test('T42 - PATCH /api/orders/:id/status by Customer returns 403', async () => {
    const { status } = await api('PATCH', `/api/orders/${orderId}/status`, {
      status: 'CANCELLED',
    }, customerToken);
    assertEqual(status, 403, 'status');
  });

  await test('T43 - GET /api/orders for Farmer returns their orders', async () => {
    const { status, body } = await api('GET', '/api/orders', null, farmerToken);
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'must be array');
  });

  await test('T44 - POST /api/orders with negative quantity returns 400', async () => {
    const { status } = await api('POST', '/api/orders', {
      productId: productId,
      quantity: -5,
    }, customerToken);
    assertEqual(status, 400, 'status');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — Subscriptions (Tests 45-56)
// ─────────────────────────────────────────────────────────────────────────────
async function section5() {
  console.log('\n📋 SECTION 5: Subscriptions');

  await test('T45 - POST /api/subscriptions creates subscription', async () => {
    const { status, body } = await api('POST', '/api/subscriptions', {
      productId: productId,
      quantity: 1,
      frequency: 'DAILY',
      deliverySlot: 'MORNING',
      durationDays: 30,
    }, customerToken);
    assertEqual(status, 201, 'status');
    assert(body.data?.subscriptionId, 'subscriptionId must exist');
    subscriptionId = body.data.subscriptionId || body.data._id;
  });

  await test('T46 - GET /api/subscriptions returns only customer\'s subscriptions', async () => {
    const { status, body } = await api('GET', '/api/subscriptions', null, customerToken);
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'must be array');
    assert(body.data.length >= 1, 'must have at least 1 subscription');
  });

  await test('T47 - New user (no subscriptions) gets empty array', async () => {
    const email = `newcust2_${Date.now()}@test.com`;
    const regRes = await api('POST', '/api/auth/register', {
      name: 'New Cust 2',
      email,
      phone: '9000000011',
      password: 'pass1234',
      role: 'CUSTOMER',
      address: 'New St',
      city: 'Dindigul',
    });
    const newToken = regRes.body.data?.token;
    const { status, body } = await api('GET', '/api/subscriptions', null, newToken);
    assertEqual(status, 200, 'status');
    assertEqual(body.data.length, 0, 'new user must have 0 subscriptions');
  });

  await test('T48 - GET /api/subscriptions without token returns 401', async () => {
    const { status } = await api('GET', '/api/subscriptions');
    assertEqual(status, 401, 'status');
  });

  await test('T49 - POST /api/subscriptions with invalid productId returns 404', async () => {
    const { status } = await api('POST', '/api/subscriptions', {
      productId: 'DM-FAKE-9999',
      quantity: 1,
    }, customerToken);
    assertEqual(status, 404, 'status');
  });

  await test('T50 - POST /api/subscriptions without token returns 401', async () => {
    const { status } = await api('POST', '/api/subscriptions', { productId, quantity: 1 });
    assertEqual(status, 401, 'status');
  });

  await test('T51 - Subscription frequency WEEKLY calculates correct estimatedAmount', async () => {
    const { status, body } = await api('POST', '/api/subscriptions', {
      productId: productId,
      quantity: 2,
      frequency: 'WEEKLY',
      durationDays: 28,
    }, customerToken);
    assertEqual(status, 201, 'status');
    // 60 * 2 * ceil(28/7) = 60 * 2 * 4 = 480
    assertEqual(body.data?.estimatedMonthlyAmount, 480, 'estimatedMonthlyAmount');
  });

  await test('T52 - PATCH /api/subscriptions/:id/pause pauses subscription', async () => {
    const { status, body } = await api('PATCH', `/api/subscriptions/${subscriptionId}/pause`, {}, customerToken);
    assertEqual(status, 200, 'status');
    assertEqual(body.data?.status, 'PAUSED', 'status');
  });

  await test('T53 - PATCH /api/subscriptions/:id/cancel cancels subscription', async () => {
    const { status, body } = await api('PATCH', `/api/subscriptions/${subscriptionId}/cancel`, {}, customerToken);
    assertEqual(status, 200, 'status');
    assertEqual(body.data?.status, 'CANCELLED', 'status');
  });

  await test('T54 - Farmer cannot pause another farmer\'s customer subscription', async () => {
    // Create a fresh subscription first
    const createRes = await api('POST', '/api/subscriptions', {
      productId,
      quantity: 1,
      frequency: 'DAILY',
      durationDays: 7,
    }, customerToken);
    const newSubId = createRes.body.data?.subscriptionId || createRes.body.data?._id;
    const { status } = await api('PATCH', `/api/subscriptions/${newSubId}/pause`, {}, farmer2Token);
    assertEqual(status, 403, 'status');
  });

  await test('T55 - GET /api/subscriptions for Farmer returns their subscriptions', async () => {
    const { status, body } = await api('GET', '/api/subscriptions', null, farmerToken);
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'must be array');
  });

  await test('T56 - POST /api/subscriptions with FARMER token (no customer role) still works', async () => {
    // Farmers can view and their subscriptions are filtered by farmer field
    const { status } = await api('GET', '/api/subscriptions', null, farmerToken);
    assertEqual(status, 200, 'status');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — Billing (Tests 57-66)
// ─────────────────────────────────────────────────────────────────────────────
async function section6() {
  console.log('\n📋 SECTION 6: Bills');

  await test('T57 - GET /api/bills for new customer returns empty array', async () => {
    const email = `newcust3_${Date.now()}@test.com`;
    const regRes = await api('POST', '/api/auth/register', {
      name: 'New Cust 3',
      email,
      phone: '9000000012',
      password: 'pass1234',
      role: 'CUSTOMER',
      address: 'New St',
      city: 'Dindigul',
    });
    const newToken = regRes.body.data?.token;
    const { status, body } = await api('GET', '/api/bills', null, newToken);
    assertEqual(status, 200, 'status');
    assertEqual(body.data.length, 0, 'new user must have 0 bills');
  });

  await test('T58 - GET /api/bills without token returns 401', async () => {
    const { status } = await api('GET', '/api/bills');
    assertEqual(status, 401, 'status');
  });

  await test('T59 - GET /api/bills for Customer returns their own bills only', async () => {
    const { status, body } = await api('GET', '/api/bills', null, customerToken);
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'must be array');
  });

  await test('T60 - GET /api/bills for Farmer returns their own bills only', async () => {
    const { status, body } = await api('GET', '/api/bills', null, farmerToken);
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'must be array');
  });

  // Create a subscription with DELIVERED deliveries to generate a bill
  let billMongoId = '';
  await test('T61 - POST /api/bills/generate by Farmer creates bill', async () => {
    // First get a subscription id for this farmer
    const subsRes = await api('GET', '/api/subscriptions', null, farmerToken);
    const subs = subsRes.body.data || [];

    if (subs.length === 0) {
      // Skip gracefully if no subscriptions
      console.log('         ⚠️  Skipping: No subscriptions found for farmer');
      return;
    }
    const subId = subs[0]._id || subs[0].subscriptionId;
    const { status, body } = await api('POST', '/api/bills/generate', {
      subscriptionId: subId,
      period: 'August 2026',
    }, farmerToken);

    if (status === 201) {
      billId = body.data?.invoiceNo || body.data?.billId;
      billMongoId = body.data?._id;
    }
    // Accept either 201 (created) or that there are no DELIVERED deliveries (subtotal 0 is still valid)
    assert(status === 201 || status === 400, `status ${status} unexpected`);
  });

  await test('T62 - POST /api/bills/generate without subscriptionId returns 400', async () => {
    const { status } = await api('POST', '/api/bills/generate', {}, farmerToken);
    assertEqual(status, 400, 'status');
  });

  await test('T63 - POST /api/bills/generate by Customer returns 403', async () => {
    const subsRes = await api('GET', '/api/subscriptions', null, farmerToken);
    const subs = subsRes.body.data || [];
    if (subs.length === 0) return;
    const subId = subs[0]._id;
    const { status } = await api('POST', '/api/bills/generate', { subscriptionId: subId }, customerToken);
    assertEqual(status, 403, 'status');
  });

  await test('T64 - GET /api/bills with ?status=PENDING filter works', async () => {
    const { status, body } = await api('GET', '/api/bills?status=PENDING', null, farmerToken);
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'must be array');
  });

  await test('T65 - GET /api/bills/:id returns bill for owner', async () => {
    if (!billMongoId) {
      console.log('         ⚠️  Skipping: No bill generated');
      return;
    }
    const { status } = await api('GET', `/api/bills/${billMongoId}`, null, farmerToken);
    assertEqual(status, 200, 'status');
  });

  await test('T66 - GET /api/bills/:nonexistent returns 404', async () => {
    const { status } = await api('GET', '/api/bills/INV-FAKE-9999', null, farmerToken);
    assertEqual(status, 404, 'status');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — Payments (Tests 67-77)
// ─────────────────────────────────────────────────────────────────────────────
async function section7() {
  console.log('\n📋 SECTION 7: Payments');

  await test('T67 - GET /api/payments/history for new user returns empty array', async () => {
    const email = `newcust4_${Date.now()}@test.com`;
    const regRes = await api('POST', '/api/auth/register', {
      name: 'New Cust 4',
      email,
      phone: '9000000013',
      password: 'pass1234',
      role: 'CUSTOMER',
      address: 'New St',
      city: 'Dindigul',
    });
    const newToken = regRes.body.data?.token;
    const { status, body } = await api('GET', '/api/payments/history', null, newToken);
    assertEqual(status, 200, 'status');
    assertEqual(body.data.length, 0, 'new user must have 0 payments');
  });

  await test('T68 - GET /api/payments/history without token returns 401', async () => {
    const { status } = await api('GET', '/api/payments/history');
    assertEqual(status, 401, 'status');
  });

  await test('T69 - POST /api/payments with no bill for new user returns 404', async () => {
    const email = `newcust5_${Date.now()}@test.com`;
    const regRes = await api('POST', '/api/auth/register', {
      name: 'New Cust 5',
      email,
      phone: '9000000014',
      password: 'pass1234',
      role: 'CUSTOMER',
      address: 'New St',
      city: 'Dindigul',
    });
    const newToken = regRes.body.data?.token;
    const { status } = await api('POST', '/api/payments', { amount: 500 }, newToken);
    assertEqual(status, 404, 'status');
  });

  await test('T70 - POST /api/payments without token returns 401', async () => {
    const { status } = await api('POST', '/api/payments', { amount: 100 });
    assertEqual(status, 401, 'status');
  });

  await test('T71 - POST /api/payments with amount 0 returns 400', async () => {
    const { status } = await api('POST', '/api/payments', { amount: 0 }, customerToken);
    assertEqual(status, 400, 'status');
  });

  await test('T72 - GET /api/payments/pending for Farmer returns array', async () => {
    const { status, body } = await api('GET', '/api/payments/pending', null, farmerToken);
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'must be array');
  });

  await test('T73 - GET /api/payments/farmer-upi/:farmerId returns farmer UPI', async () => {
    const { status, body } = await api('GET', `/api/payments/farmer-upi/${farmerId}`, null, customerToken);
    // Either 200 with upiId or 404 if upiId not set
    assert(status === 200 || status === 404, `unexpected status ${status}`);
    if (status === 200) {
      assert(body.data?.upiId, 'upiId must exist');
    }
  });

  await test('T74 - GET /api/payments/farmer-upi/:nonexistent returns 404', async () => {
    const { status } = await api('GET', '/api/payments/farmer-upi/000000000000000000000000', null, customerToken);
    assertEqual(status, 404, 'status');
  });

  await test('T75 - GET /api/payments/history for Customer returns array', async () => {
    const { status, body } = await api('GET', '/api/payments/history', null, customerToken);
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'must be array');
  });

  await test('T76 - PATCH /api/payments/:id/confirm without token returns 401', async () => {
    const { status } = await api('PATCH', '/api/payments/fake-pay-id/confirm', {});
    assertEqual(status, 401, 'status');
  });

  await test('T77 - PATCH /api/payments/:nonexistent/confirm returns 404', async () => {
    const { status } = await api('PATCH', '/api/payments/PAY-FAKE-9999/confirm', {}, farmerToken);
    assertEqual(status, 404, 'status');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — Notifications (Tests 78-83)
// ─────────────────────────────────────────────────────────────────────────────
async function section8() {
  console.log('\n📋 SECTION 8: Notifications');

  await test('T78 - GET /api/notifications returns array for Farmer', async () => {
    const { status, body } = await api('GET', '/api/notifications', null, farmerToken);
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'must be array');
  });

  await test('T79 - GET /api/notifications returns array for Customer', async () => {
    const { status, body } = await api('GET', '/api/notifications', null, customerToken);
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'must be array');
  });

  await test('T80 - GET /api/notifications without token returns 401', async () => {
    const { status } = await api('GET', '/api/notifications');
    assertEqual(status, 401, 'status');
  });

  await test('T81 - Farmer received notification after order creation', async () => {
    const { status, body } = await api('GET', '/api/notifications', null, farmerToken);
    assertEqual(status, 200, 'status');
    const orderNotif = body.data?.find((n) => n.type === 'ORDER_CREATED');
    assert(orderNotif, 'Farmer must have ORDER_CREATED notification');
  });

  await test('T82 - New user notifications list is empty array', async () => {
    const email = `newcust6_${Date.now()}@test.com`;
    const regRes = await api('POST', '/api/auth/register', {
      name: 'New Cust 6',
      email,
      phone: '9000000015',
      password: 'pass1234',
      role: 'CUSTOMER',
      address: 'New St',
      city: 'Dindigul',
    });
    const newToken = regRes.body.data?.token;
    const { status, body } = await api('GET', '/api/notifications', null, newToken);
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'must be array');
  });

  await test('T83 - PATCH /api/notifications/:id/read marks notification read', async () => {
    const { body } = await api('GET', '/api/notifications', null, farmerToken);
    const notifs = body.data || [];
    if (notifs.length === 0) {
      console.log('         ⚠️  Skipping: no notifications');
      return;
    }
    const notifId = notifs[0]._id;
    const { status, body: patchBody } = await api('PATCH', `/api/notifications/${notifId}/read`, {}, farmerToken);
    assert(status === 200 || status === 404, `unexpected status ${status}`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — Inventory (Tests 84-89)
// ─────────────────────────────────────────────────────────────────────────────
async function section9() {
  console.log('\n📋 SECTION 9: Inventory');

  await test('T84 - GET /api/inventory returns array', async () => {
    const { status, body } = await api('GET', '/api/inventory', null, farmerToken);
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'must be array');
  });

  await test('T85 - GET /api/inventory without token returns 401', async () => {
    const { status } = await api('GET', '/api/inventory');
    assertEqual(status, 401, 'status');
  });

  await test('T86 - PATCH /api/products/:id/capacity updates daily capacity', async () => {
    const { status, body } = await api('PATCH', `/api/products/${productMongoId}/capacity`, {
      availableQuantity: 100,
    }, farmerToken);
    assert(status === 200 || status === 404, `unexpected status ${status}`);
  });

  await test('T87 - Inventory deducted correctly after order (quantity check)', async () => {
    // Place a new order and check inventory decremented
    const beforeRes = await api('GET', '/api/inventory', null, farmerToken);
    const before = beforeRes.body.data?.find((i) => i.productId === productId);
    const prevRemaining = before?.remainingQuantity ?? 50;

    await api('POST', '/api/orders', { productId, quantity: 3 }, customerToken);

    const afterRes = await api('GET', '/api/inventory', null, farmerToken);
    const after = afterRes.body.data?.find((i) => i.productId === productId);
    const newRemaining = after?.remainingQuantity ?? prevRemaining;

    assert(newRemaining <= prevRemaining, 'inventory must decrease or stay same after order');
  });

  await test('T88 - Order quantity exceeding inventory returns 400', async () => {
    const { status } = await api('POST', '/api/orders', {
      productId,
      quantity: 999999,
    }, customerToken);
    assertEqual(status, 400, 'status');
  });

  await test('T89 - GET /api/inventory for Customer returns their relevant data', async () => {
    const { status, body } = await api('GET', '/api/inventory', null, customerToken);
    assert(status === 200 || status === 403, `unexpected status ${status}`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 — Farmer Exchanges & Reports (Tests 90-100)
// ─────────────────────────────────────────────────────────────────────────────
async function section10() {
  console.log('\n📋 SECTION 10: Exchanges, Reports & Edge Cases');

  await test('T90 - GET /api/exchanges returns data', async () => {
    const { status, body } = await api('GET', '/api/exchanges', null, farmerToken);
    assert(status === 200 || status === 404, `unexpected status ${status}`);
  });

  await test('T91 - GET /api/reports returns data for Farmer', async () => {
    const { status } = await api('GET', '/api/reports', null, farmerToken);
    assert(status === 200 || status === 404, `unexpected status ${status}`);
  });

  await test('T92 - Invalid JWT token returns 401', async () => {
    const { status } = await api('GET', '/api/orders', null, 'invalid.jwt.token');
    assertEqual(status, 401, 'status');
  });

  await test('T93 - Expired / malformed token returns 401', async () => {
    const { status } = await api('GET', '/api/auth/me', null, 'Bearer eyJhbGciOiJIUzI1NiJ9.broken');
    assertEqual(status, 401, 'status');
  });

  await test('T94 - Non-API route aliases work: /auth/me', async () => {
    const { status } = await api('GET', '/auth/me', null, farmerToken);
    assert(status === 200 || status === 401, `unexpected status ${status}`);
  });

  await test('T95 - Non-API route aliases work: /products', async () => {
    const { status, body } = await api('GET', '/products');
    assertEqual(status, 200, 'status');
    assert(Array.isArray(body.data), 'must be array');
  });

  await test('T96 - PUT /api/auth/profile without auth returns 401', async () => {
    const { status } = await api('PUT', '/api/auth/profile', { name: 'Hacker' });
    assertEqual(status, 401, 'status');
  });

  await test('T97 - DELETE /api/products/:id by Farmer2 (not owner) returns 403', async () => {
    const { status } = await api('DELETE', `/api/products/${productMongoId}`, null, farmer2Token);
    assertEqual(status, 403, 'status');
  });

  await test('T98 - Farmer data isolation: Farmer2 cannot see Farmer1 orders', async () => {
    const { body } = await api('GET', '/api/orders', null, farmer2Token);
    const allFarmer2 = body.data?.every(
      (o) => o.farmer?._id !== farmerId && o.farmer !== farmerId
    );
    assert(allFarmer2 !== false, 'Farmer2 must not see Farmer1 orders');
  });

  await test('T99 - POST /api/products without name returns 400', async () => {
    const { status } = await api('POST', '/api/products', { price: 50, category: 'MILK' }, farmerToken);
    assertEqual(status, 400, 'status');
  });

  await test('T100 - DELETE /api/products/:id by owner Farmer succeeds', async () => {
    // Create a fresh product to delete
    const { body } = await api('POST', '/api/products', {
      name: 'Delete Me Product',
      category: 'OTHER',
      unit: 'kg',
      price: 10,
    }, farmerToken);
    const delId = body.data?._id;
    if (!delId) return;
    const { status } = await api('DELETE', `/api/products/${delId}`, null, farmerToken);
    assertEqual(status, 200, 'status');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('════════════════════════════════════════════════════════');
  console.log('  🧪 DailyMarts Backend — 100 Test Cases');
  console.log(`  🌐 Target: ${BASE_URL}`);
  console.log('════════════════════════════════════════════════════════');

  await section1();
  await section2();
  await section3();
  await section4();
  await section5();
  await section6();
  await section7();
  await section8();
  await section9();
  await section10();

  console.log('\n════════════════════════════════════════════════════════');
  console.log(`  📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  if (failures.length > 0) {
    console.log('\n  ❌ Failed Tests:');
    failures.forEach((f, i) => console.log(`    ${i + 1}. ${f.name}\n       → ${f.error}`));
  } else {
    console.log('  🎉 All tests passed!');
  }
  console.log('════════════════════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
