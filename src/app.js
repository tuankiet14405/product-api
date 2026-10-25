const express = require('express');
const mongoose = require('mongoose');
const Product = require('./product');

const app = express();

app.use(express.json({ limit: '100kb' }));

// Kiểm tra dữ liệu tạo mới hoặc cập nhật sản phẩm.
function readProduct(body, partial = false) {
  const fields = ['pid', 'pname', 'price', 'quantity'];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('Body phải là JSON object'), {
      status: 400
    });
  }

  const keys = Object.keys(body);

  if (
    keys.length === 0 ||
    keys.some((key) => !fields.includes(key)) ||
    (!partial && fields.some((key) => !(key in body)))
  ) {
    throw Object.assign(new Error('Các trường dữ liệu không hợp lệ'), {
      status: 400
    });
  }

  if (
    'pid' in body &&
    (!Number.isSafeInteger(body.pid) || body.pid <= 0)
  ) {
    throw Object.assign(new Error('pid phải là số nguyên dương'), {
      status: 400
    });
  }

  if (
    'pname' in body &&
    (typeof body.pname !== 'string' || !body.pname.trim())
  ) {
    throw Object.assign(new Error('pname phải là chuỗi không rỗng'), {
      status: 400
    });
  }

  for (const field of ['price', 'quantity']) {
    if (
      field in body &&
      (typeof body[field] !== 'number' ||
        !Number.isFinite(body[field]) ||
        body[field] < 0)
    ) {
      throw Object.assign(new Error(`${field} phải là số không âm`), {
        status: 400
      });
    }
  }

  if ('quantity' in body && !Number.isSafeInteger(body.quantity)) {
    throw Object.assign(new Error('quantity phải là số nguyên không âm'), {
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

    res.json({
      status: 'ok',
      database: 'up'
    });
  } catch {
    res.status(503).json({
      status: 'error',
      database: 'down'
    });
  }
});

// Kiểm tra và chuyển pid trong URL thành số.
app.param('pid', (req, res, next, value) => {
  const pid = Number(value);

  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(pid)) {
    return res.status(400).json({
      message: 'pid phải là số nguyên dương'
    });
  }

  req.productPid = pid;
  next();
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
  const product = await Product.findOne({
    pid: req.productPid
  });

  if (!product) {
    return res.status(404).json({
      message: 'Không tìm thấy sản phẩm'
    });
  }

  res.json(product);
});

// Cập nhật một hoặc nhiều trường của sản phẩm.
app.patch('/products/:pid', async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { pid: req.productPid },
    { $set: readProduct(req.body, true) },
    { new: true, runValidators: true }
  );

  if (!product) {
    return res.status(404).json({
      message: 'Không tìm thấy sản phẩm'
    });
  }

  res.json(product);
});

// Xóa sản phẩm.
app.delete('/products/:pid', async (req, res) => {
  const product = await Product.findOneAndDelete({
    pid: req.productPid
  });

  if (!product) {
    return res.status(404).json({
      message: 'Không tìm thấy sản phẩm'
    });
  }

  res.status(204).end();
});

// Xử lý endpoint không tồn tại.
app.use((req, res) => {
  res.status(404).json({
    message: 'Endpoint không tồn tại'
  });
});

// Xử lý lỗi.
app.use((err, req, res, next) => {
  if (err.code === 11000) {
    return res.status(409).json({
      message: 'pid đã tồn tại'
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      message: 'JSON không hợp lệ'
    });
  }

  if (err.status === 400) {
    return res.status(400).json({
      message: err.message
    });
  }

  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({
      message: 'Dữ liệu không hợp lệ'
    });
  }

  if (err.status === 413) {
    return res.status(413).json({
      message: 'Body vượt quá dung lượng cho phép'
    });
  }

  console.error(err);

  res.status(500).json({
    message: 'Lỗi máy chủ'
  });
});

module.exports = app;