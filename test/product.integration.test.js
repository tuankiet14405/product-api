const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const base = process.env.API_BASE_URL || 'http://localhost:3000';

async function request(path, method = 'GET', body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000)
  });

  const text = await response.text();

  return {
    status: response.status,
    data: text ? JSON.parse(text) : null
  };
}

test('API và MongoDB sẵn sàng', async () => {
  const result = await request('/health');

  assert.equal(result.status, 200);
  assert.equal(result.data.database, 'up');
});

test('CRUD Product và kiểm tra dữ liệu lỗi', async () => {
  const pid = `CI-${randomUUID()}`;
  const path = `/products/${pid}`;

  const product = {
    pid,
    pname: 'CI Product',
    price: 100,
    quantity: 5
  };

  try {
    // Create
    const created = await request('/products', 'POST', product);
    assert.equal(created.status, 201);
    assert.equal(created.data.pid, pid);

    // Không cho phép trùng pid
    const duplicate = await request('/products', 'POST', product);
    assert.equal(duplicate.status, 409);

    // Read
    const read = await request(path);
    assert.equal(read.status, 200);
    assert.equal(read.data.pname, product.pname);
    assert.equal(read.data.price, 100);
    assert.equal(read.data.quantity, 5);

    const list = await request('/products');
    assert.equal(list.status, 200);
    assert.ok(list.data.some((item) => item.pid === pid));

    // Update
    const updated = await request(path, 'PATCH', {
      price: 200,
      quantity: 8
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.price, 200);
    assert.equal(updated.data.quantity, 8);

    // Đọc lại để xác nhận đã lưu
    const persisted = await request(path);
    assert.equal(persisted.status, 200);
    assert.equal(persisted.data.price, 200);
    assert.equal(persisted.data.quantity, 8);

    // Từ chối giá âm
    const invalidUpdate = await request(path, 'PATCH', {
      price: -1
    });
    assert.equal(invalidUpdate.status, 400);

    // Từ chối quantity không nguyên
    const invalidCreate = await request('/products', 'POST', {
      ...product,
      pid: `INVALID-${pid}`,
      quantity: 1.5
    });
    assert.equal(invalidCreate.status, 400);

    // Delete
    const deleted = await request(path, 'DELETE');
    assert.equal(deleted.status, 204);

    // Đã xóa thì không tìm thấy
    const missing = await request(path);
    assert.equal(missing.status, 404);
  } finally {
    // Dọn sản phẩm nếu test bị lỗi giữa chừng
    await request(path, 'DELETE');
    await request(`/products/INVALID-${pid}`, 'DELETE');
  }
});