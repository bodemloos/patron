const mongoose = require('mongoose');

/**
 * Belgian employment contract.
 *
 * `statute` covers the most common Belgian arrangements. The downstream
 * RSZ flow varies by statute — flexi-jobs and student work need a Dimona
 * declaration per period; permanent contracts get a single Dimona-in /
 * Dimona-out lifecycle. The contract document generator branches on
 * statute to render the correct legal clauses.
 */
const STATUTES = [
  'permanent',    // Vast contract / Onbepaalde duur (CDI)
  'fixed_term',   // Bepaalde duur (CDD)
  'flexi_job',    // Flexi-job (horeca)
  'student',      // Studentenarbeid (475u-quotum)
  'extra',        // Extra / Gelegenheidsmedewerker (horeca dag/avond)
  'interim',      // Uitzendkracht / Intérim
  'internship',   // Stage / Stagiair
];

const STATUS = ['draft', 'signed', 'active', 'terminated'];

const ContractSchema = new mongoose.Schema(
  {
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },

    statute: { type: String, enum: STATUTES, required: true, default: 'permanent' },
    status: { type: String, enum: STATUS, default: 'draft', index: true },

    // Job description
    jobTitle: { type: String, default: '' },
    workplace: { type: String, default: '' },

    // Time period
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null }, // null = ongoing (permanent)

    // Compensation
    hoursPerWeek: { type: Number, default: 38 }, // standard BE workweek
    hourlyRate: { type: Number, default: 0 },    // EUR gross
    monthlySalary: { type: Number, default: 0 }, // EUR gross — alternative to hourly

    // Free-text clauses appended to the standard contract template.
    extraTerms: { type: String, default: '' },

    // Signature tracking
    signedAt: { type: Date, default: null },
    signedByStaffName: { type: String, default: '' },
    signedByEmployerName: { type: String, default: '' },

    // Termination tracking
    terminatedAt: { type: Date, default: null },
    terminationReason: { type: String, default: '' },
  },
  { timestamps: true }
);

ContractSchema.statics.STATUTES = STATUTES;
ContractSchema.statics.STATUS = STATUS;

// Helpers ------------------------------------------------------------
ContractSchema.virtual('isFlexi').get(function () { return this.statute === 'flexi_job'; });
ContractSchema.virtual('isOpenEnded').get(function () { return this.statute === 'permanent' && !this.endDate; });

ContractSchema.set('toJSON', { virtuals: true });
ContractSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Contract', ContractSchema);
