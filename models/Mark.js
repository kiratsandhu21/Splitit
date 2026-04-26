/**
 * Mongoose Model: Mark
 * 
 * Represents a single marks entry for a student in a particular
 * subject and semester. Stored in the "marks" collection inside
 * the "school" database.
 */

const mongoose = require('mongoose');

// ─── Schema Definition ──────────────────────────────────────────
const markSchema = new mongoose.Schema(
  {
    student_id: { type: String, required: true },   // e.g. "S001"
    name:       { type: String, required: true },   // e.g. "Kirat Singh"
    subject:    { type: String, required: true },   // e.g. "Math"
    semester:   { type: Number, required: true },   // 1–4
    marks:      { type: Number, required: true },   // 50–100
  },
  {
    collection: 'marks',   // Force collection name (avoid Mongoose pluralization)
    versionKey: false,     // Disable __v field for cleanliness
  }
);

// ─── Compound Index ─────────────────────────────────────────────
// WHY this index?
//   • Our primary query pattern is: "Get marks for student X in semester Y"
//   • A compound index on { student_id, semester } lets MongoDB jump
//     directly to the right documents using an IXSCAN instead of
//     scanning all 4,000 docs (COLLSCAN).
//   • This dramatically reduces query time from O(n) to O(log n).
markSchema.index({ student_id: 1, semester: 1 });

module.exports = mongoose.model('Mark', markSchema);
