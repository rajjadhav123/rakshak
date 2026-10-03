const mongoose = require('mongoose');

const policeStationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    state: { type: String, required: true },
    district: { type: String, required: true },
    address: { type: String },
    contactPhone: { type: String },
    // Enables "nearest station to this sighting" routing — e.g. a case
    // opened in Pune gets a sighting near Mumbai; the Mumbai station
    // should be alerted even though it didn't create the case.
    geo: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] }, // [lng, lat]
    },
  },
  { timestamps: true }
);

policeStationSchema.index({ geo: '2dsphere' });

module.exports = mongoose.model('PoliceStation', policeStationSchema);
