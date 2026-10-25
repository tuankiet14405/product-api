const test = require('node:test');
const assert = require('node:assert/strict');
const { randomInt } = require('node:crypto');

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
  assert.equal(result.data.status, 'ok');
  assert.equal(result.data.database, 'up');
});

test('CRUD Product và kiểm tra dữ liệu lỗi', async () => {
  const pid = randomInt(1, 1_000_000_000);
  const invalidPid = pid + 1_000_000_000;
  const path = `/products/${pid}`;

  const product = {
    pid,
    pname: 'CI Product',
    price: 100,
    quantity: 5
  };

  let createdByTest = false;
  let invalidCreatedByTest = false;

  try {
    // Create: tạo sản phẩm với pid là số.
    const created = await request('/products', 'POST', product);
    createdByTest = created.status === 201;

    assert.equal(
      created.status,
      201,
      `Tạo sản phẩm thất bại: ${JSON.stringify(created.data)}`
    );
    assert.equal(created.data.pid, pid);
    assert.equal(typeof created.data.pid, 'number');
    assert.equal(created.data.pname, product.pname);
    assert.equal(created.data.price, 100);
    assert.equal(created.data.quantity, 5);

    // Không cho phép trùng pid.
    const duplicate = await request('/products', 'POST', product);
    assert.equal(duplicate.status, 409);

    // Read: đọc một sản phẩm.
    const read = await request(path);
    assert.equal(read.status, 200);
    assert.equal(read.data.pid, pid);
    assert.equal(read.data.pname, product.pname);
    assert.equal(read.data.price, 100);
    assert.equal(read.data.quantity, 5);

    // Đọc danh sách sản phẩm.
    const list = await request('/products');
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.data));
    assert.ok(list.data.some((item) => item.pid === pid));

    // Update: cập nhật sản phẩm.
    const updated = await request(path, 'PATCH', {
      price: 200,
      quantity: 8
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.data.price, 200);
    assert.equal(updated.data.quantity, 8);

    // Đọc lại để xác nhận đã lưu.
    const persisted = await request(path);
    assert.equal(persisted.status, 200);
    assert.equal(persisted.data.price, 200);
    assert.equal(persisted.data.quantity, 8);

    // Từ chối giá âm.
    const invalidUpdate = await request(path, 'PATCH', {
      price: -1
    });
    assert.equal(invalidUpdate.status, 400);

    // Dữ liệu cũ phải giữ nguyên sau cập nhật lỗi.
    const afterInvalidUpdate = await request(path);
    assert.equal(afterInvalidUpdate.status, 200);
    assert.equal(afterInvalidUpdate.data.price, 200);
    assert.equal(afterInvalidUpdate.data.quantity, 8);

    // Từ chối quantity không nguyên, với pid hợp lệ.
    const invalidCreate = await request('/products', 'POST', {
      ...product,
      pid: invalidPid,
      quantity: 1.5
    });
    invalidCreatedByTest = invalidCreate.status === 201;

    assert.equal(invalidCreate.status, 400);

    // Từ chối pid dạng chuỗi dù nội dung là số.
    const stringPid = await request('/products', 'POST', {
      ...product,
      pid: String(pid)
    });
    assert.equal(stringPid.status, 400);

    // Từ chối pid âm trên URL.
    const invalidPath = await request('/products/-1');
    assert.equal(invalidPath.status, 400);

    // Delete: xóa sản phẩm.
    const deleted = await request(path, 'DELETE');
    assert.equal(deleted.status, 204);
    createdByTest = false;

    // Đã xóa thì không tìm thấy.
    const missing = await request(path);
    assert.equal(missing.status, 404);

    // Xóa lại sản phẩm không tồn tại.
    const deletedAgain = await request(path, 'DELETE');
    assert.equal(deletedAgain.status, 404);
  } finally {
    // Chỉ dọn các sản phẩm do lần test này tạo thành công.
    if (createdByTest) {
      await request(path, 'DELETE');
    }

    if (invalidCreatedByTest) {
      await request(`/products/${invalidPid}`, 'DELETE');
    }
  }
});