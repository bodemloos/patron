const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema(
  {
    street: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    city: { type: String, default: '' },
    country: { type: String, default: 'BE' }, // ISO 3166-1 alpha-2
  },
  { _id: false }
);

const StaffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['manager', 'waiter', 'kitchen', 'bar', 'other'],
      default: 'waiter',
    },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    hourlyRate: { type: Number, default: 0 }, // EUR / hour
    active: { type: Boolean, default: true },

    // Belgian payroll / RSZ identification.
    // INSZ = Identificatienummer Sociale Zekerheid (rijksregisternummer).
    // 11 digits, formatted "XX.XX.XX-XXX.XX" on documents.
    nissNumber: { type: String, default: '', trim: true },
    dateOfBirth: { type: Date, default: null },
    nationality: { type: String, default: 'BE' },
    address: { type: AddressSchema, default: () => ({}) },
    iban: { type: String, default: '', trim: true, uppercase: true },
  },
  { timestamps: true }
);

// Format the INSZ for display: 90.05.27-345.67
StaffSchema.methods.formattedNiss = function () {
  const d = (this.nissNumber || '').replace(/\D/g, '');
  if (d.length !== 11) return this.nissNumber || '';
  return `${d.slice(0,2)}.${d.slice(2,4)}.${d.slice(4,6)}-${d.slice(6,9)}.${d.slice(9,11)}`;
};

module.exports = mongoose.model('Staff', StaffSchema);
