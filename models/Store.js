const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeName: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  storeImage: {
    type: String,
    default: ''
  },
  timings: {
    type: String,
    default: '9:00 AM - 6:00 PM'
  },
  isOpenToday: {
    type: Boolean,
    default: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: undefined
    }
  }
}, {
  timestamps: true
});

// Required for $near geospatial queries in /api/stores/nearby
storeSchema.index({ location: '2dsphere' });

module.exports = mongoose.models.Store || mongoose.model('Store', storeSchema);
