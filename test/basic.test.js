const test = require('node:test');
const assert = require('node:assert/strict');

test('Ứng dụng Express có thể được nạp', () => {
  const app = require('../src/app');
  assert.equal(typeof app, 'function');
});

test('Product có đủ bốn trường', () => {
  const Product = require('../src/product');

  for (const field of ['pid', 'pname', 'price', 'quantity']) {
    assert.ok(Product.schema.path(field));
  }
});