const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    pid: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    pname: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'quantity phải là số nguyên'
      }
    }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Product', productSchema);