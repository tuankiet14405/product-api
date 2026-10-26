const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    pid: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: 'pid phải là số nguyên dương an toàn'
      }
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
        validator: Number.isSafeInteger,
        message: 'quantity phải là số nguyên không âm an toàn'
      }
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model('Product', productSchema);