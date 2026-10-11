require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');
const Product = require('./product');

async function start() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Thiếu MONGODB_URI trong .env');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });

  await Product.init();

  console.log('Đã kết nối MongoDB');

  const port = Number(process.env.PORT || 3000);

  app.listen(port, '0.0.0.0', () => {
    console.log(`Product API listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});