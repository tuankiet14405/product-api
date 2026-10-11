const express = require('express');
const mongoose = require('mongoose');
const Product = require('./product');

const app = express();
app.use(express.json());

function readProduct(body, partial = false) {
  const fields = ['pid', 'pname', 'price', 'quantity'];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('Body không hợp lệ'), { status: 400 });
  }

  const keys = Object.keys(body);

  if (
    keys.length === 0 ||
    keys.some((key) => !fields.includes(key)) ||
    (!partial && fields.some((key) => !(key in body)))
  ) {
    throw Object.assign(new Error('Các trường không hợp lệ'), {
      status: 400
    });
  }

  for (const field of ['pid', 'pname']) {
    if (
      field in body &&
      (typeof body[field] !== 'string' || !body[field].trim())
    ) {
      throw Object.assign(new Error(`${field} không hợp lệ`), {
        status: 400
      });
    }
  }

  for (const field of ['price', 'quantity']) {
    if (
      field in body &&
      (typeof body[field] !== 'number' ||
        !Number.isFinite(body[field]) ||
        body[field] < 0)
    ) {
      throw Object.assign(new Error(`${field} không hợp lệ`), {
        status: 400
      });
    }
  }

  if ('quantity' in body && !Number.isInteger(body.quantity)) {
    throw Object.assign(new Error('quantity phải là số nguyên'), {
      status: 400
    });
  }

  return Object.fromEntries(
    keys.map((key) => [
      key,
      typeof body[key] === 'string' ? body[key].trim() : body[key]
    ])
  );
}

// Kiểm tra API và kết nối MongoDB.
app.get('/health', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB chưa kết nối');
    }

    await mongoose.connection.db.admin().command(
      { ping: 1 },
      { timeoutMS: 2000 }
    );

    res.json({ status: 'ok', database: 'up' });
  } catch {
    res.status(503).json({ status: 'error', database: 'down' });
  }
});

// Tạo sản phẩm.
app.post('/products', async (req, res) => {
  const product = await Product.create(readProduct(req.body));
  res.status(201).json(product);
});

// Đọc danh sách sản phẩm.
app.get('/products', async (req, res) => {
  const products = await Product.find().sort({ pid: 1 });
  res.json(products);
});

// Đọc một sản phẩm theo pid.
app.get('/products/:pid', async (req, res) => {
  const product = await Product.findOne({ pid: req.params.pid });

  if (!product) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
  }

  res.json(product);
});

// Cập nhật một hoặc nhiều trường.
app.patch('/products/:pid', async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { pid: req.params.pid },
    { $set: readProduct(req.body, true) },
    { new: true, runValidators: true }
  );

  if (!product) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
  }

  res.json(product);
});

// Xóa sản phẩm.
app.delete('/products/:pid', async (req, res) => {
  const product = await Product.findOneAndDelete({
    pid: req.params.pid
  });

  if (!product) {
    return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
  }

  res.status(204).end();
});

// Xử lý lỗi.
app.use((err, req, res, next) => {
  if (err.code === 11000) {
    return res.status(409).json({ message: 'pid đã tồn tại' });
  }

  if (
    err.status === 400 ||
    err.name === 'ValidationError' ||
    err.name === 'CastError' ||
    err.type === 'entity.parse.failed'
  ) {
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
  }

  console.error(err);
  res.status(500).json({ message: 'Lỗi máy chủ' });
});

module.exports = app;