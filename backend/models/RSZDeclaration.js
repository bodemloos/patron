const mongoose = require('mongoose');

/**
 * RSZ / ONSS declaration record.
 *
 * Real DIMONA + DmfA submissions go through certified XML/SOAP web
 * services with employer credentials. This model captures every
 * would-be submission so the manager has an audit trail of what's been
 * sent, queued, or failed. The `payload` field stores the JSON body the
 * route generated; in production the same model gets the submission
 * confirmation back from the RSZ.
 *
 * Types:
 *   dimona_in   — declaring a new period of employment for a worker
 *   dimona_out  — declaring the end of a period
 *   hours_batch — periodic working-hours submission (basis for DmfA)
 */
const TYPES = ['dimona_in', 'dimona_out', 'hours_batch'];
const STATUS = ['pending', 'submitted', 'accepted', 'error'];

const RSZDeclarationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: TYPES, required: true, index: true },
    status: { type: String, enum: STATUS, default: 'pending', index: true },

    // Targets — at least one of these will be populated.
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', default: null },

    // Period the declaration covers (used for hours batches and as
    // metadata on dimona_in/out).
    periodFrom: { type: Date, default: null },
    periodTo: { type: Date, default: null },

    // The full payload that would be sent to the RSZ. Stored as a
    // generic object so downstream code can keep evolving without a
    // schema migration.
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Returned by the RSZ once accepted — for now we generate a fake
    // confirmation number so the audit trail is complete.
    confirmationNumber: { type: String, default: '' },
    submittedAt: { type: Date, default: null },
    errorMessage: { type: String, default: '' },
  },
  { timestamps: true }
);

RSZDeclarationSchema.statics.TYPES = TYPES;
RSZDeclarationSchema.statics.STATUS = STATUS;

module.exports = mongoose.model('RSZDeclaration', RSZDeclarationSchema);
