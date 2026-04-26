/**
 * routes/api.js — All API Endpoints
 *
 * Each route uses MongoDB aggregation pipelines or indexed queries.
 * Comments explain the purpose of every stage.
 */

const express = require('express');
const router = express.Router();
const Mark = require('../models/Mark');

// ─────────────────────────────────────────────────────────────────
// 1. GET /api/stats
//    Dashboard summary cards (total students, subjects, avg, count)
// ─────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [stats] = await Mark.aggregate([
      {
        // Group ALL documents into one bucket to compute global stats
        $group: {
          _id: null,
          totalRecords:  { $sum: 1 },
          avgMarks:      { $avg: '$marks' },
          students:      { $addToSet: '$student_id' },   // unique student IDs
          subjects:      { $addToSet: '$subject' },      // unique subjects
        },
      },
      {
        // Reshape: convert arrays to their length
        $project: {
          _id: 0,
          totalRecords: 1,
          avgMarks: { $round: ['$avgMarks', 2] },
          totalStudents: { $size: '$students' },
          totalSubjects: { $size: '$subjects' },
        },
      },
    ]);

    res.json(stats || { totalRecords: 0, avgMarks: 0, totalStudents: 0, totalSubjects: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// 2. GET /api/student/:id/:semester
//    Subject-wise marks for a specific student in a semester.
//    Uses the compound index { student_id: 1, semester: 1 }.
// ─────────────────────────────────────────────────────────────────
router.get('/student/:id/:semester', async (req, res) => {
  try {
    const { id, semester } = req.params;

    // This query benefits directly from our compound index!
    const results = await Mark.find(
      { student_id: id.toUpperCase(), semester: Number(semester) },
      { _id: 0, subject: 1, marks: 1, name: 1 }
    ).sort({ subject: 1 });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// 3. GET /api/student/:id
//    ALL marks for a student across all semesters and subjects.
//    Useful for the "total comparison" view.
// ─────────────────────────────────────────────────────────────────
router.get('/student/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const results = await Mark.find(
      { student_id: id.toUpperCase() },
      { _id: 0, subject: 1, semester: 1, marks: 1, name: 1 }
    ).sort({ subject: 1, semester: 1 });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// 4. GET /api/average/:id
//    Overall average marks for a student (across all semesters).
//    AGGREGATION: $match → $group → $project
// ─────────────────────────────────────────────────────────────────
router.get('/average/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await Mark.aggregate([
      // Stage 1: Filter — only this student
      { $match: { student_id: id.toUpperCase() } },

      // Stage 2: Group — compute average across ALL marks
      {
        $group: {
          _id: '$student_id',
          name: { $first: '$name' },
          avgMarks: { $avg: '$marks' },
          totalEntries: { $sum: 1 },
        },
      },

      // Stage 3: Clean up the output
      {
        $project: {
          _id: 0,
          student_id: '$_id',
          name: 1,
          avgMarks: { $round: ['$avgMarks', 2] },
          totalEntries: 1,
        },
      },
    ]);

    res.json(result || { error: 'Student not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// 5. GET /api/average-subjects/:id
//    Average marks PER SUBJECT for a student (all semesters combined).
//    AGGREGATION: $match → $group (by subject) → $sort
// ─────────────────────────────────────────────────────────────────
router.get('/average-subjects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const results = await Mark.aggregate([
      { $match: { student_id: id.toUpperCase() } },

      {
        $group: {
          _id: '$subject',
          avgMarks: { $avg: '$marks' },
          maxMarks: { $max: '$marks' },
          minMarks: { $min: '$marks' },
        },
      },

      { $sort: { _id: 1 } },

      {
        $project: {
          _id: 0,
          subject: '$_id',
          avgMarks: { $round: ['$avgMarks', 2] },
          maxMarks: 1,
          minMarks: 1,
        },
      },
    ]);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// 6. GET /api/topper
//    Top 5 students by overall average marks.
//    AGGREGATION: $group → $sort → $limit
// ─────────────────────────────────────────────────────────────────
router.get('/topper', async (req, res) => {
  try {
    const results = await Mark.aggregate([
      // Stage 1: Group by student, compute average
      {
        $group: {
          _id: '$student_id',
          name: { $first: '$name' },
          avgMarks: { $avg: '$marks' },
        },
      },

      // Stage 2: Sort descending by average
      { $sort: { avgMarks: -1 } },

      // Stage 3: Take only the top 5
      { $limit: 5 },

      // Stage 4: Reshape output
      {
        $project: {
          _id: 0,
          student_id: '$_id',
          name: 1,
          avgMarks: { $round: ['$avgMarks', 2] },
        },
      },
    ]);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// 7. GET /api/trend/:id
//    Semester-wise average marks trend for a student.
//    AGGREGATION: $match → $group (by semester) → $sort
// ─────────────────────────────────────────────────────────────────
router.get('/trend/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const results = await Mark.aggregate([
      { $match: { student_id: id.toUpperCase() } },

      {
        $group: {
          _id: '$semester',
          avgMarks: { $avg: '$marks' },
        },
      },

      { $sort: { _id: 1 } },

      {
        $project: {
          _id: 0,
          semester: '$_id',
          avgMarks: { $round: ['$avgMarks', 2] },
        },
      },
    ]);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// 8. GET /api/subject-toppers
//    Highest scorer in EACH subject (across all semesters).
//    AGGREGATION: $sort → $group (by subject, $first)
// ─────────────────────────────────────────────────────────────────
router.get('/subject-toppers', async (req, res) => {
  try {
    const results = await Mark.aggregate([
      // Stage 1: Sort by marks descending so $first picks the highest
      { $sort: { marks: -1 } },

      // Stage 2: Group by subject, take the first (highest) entry
      {
        $group: {
          _id: '$subject',
          topperName: { $first: '$name' },
          topperStudentId: { $first: '$student_id' },
          highestMarks: { $first: '$marks' },
          semester: { $first: '$semester' },
        },
      },

      { $sort: { _id: 1 } },

      {
        $project: {
          _id: 0,
          subject: '$_id',
          topperName: 1,
          topperStudentId: 1,
          highestMarks: 1,
          semester: 1,
        },
      },
    ]);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// 9. GET /api/search
//    Advanced search with multiple optional filters.
//    Query params: student_id, semester, subject, min_marks, max_marks
//    Supports both semester-wise AND total comparison modes.
// ─────────────────────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { student_id, semester, subject, min_marks, max_marks, mode } = req.query;

    // ── MODE: "aggregate" — returns aggregated averages per subject
    if (mode === 'aggregate') {
      const matchStage = {};
      if (student_id) matchStage.student_id = student_id.toUpperCase();
      if (semester && semester !== 'all') matchStage.semester = Number(semester);
      if (subject && subject !== 'all') matchStage.subject = subject;

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: { subject: '$subject', ...(semester === 'all' ? {} : { semester: '$semester' }) },
            avgMarks: { $avg: '$marks' },
            maxMarks: { $max: '$marks' },
            minMarks: { $min: '$marks' },
            count: { $sum: 1 },
            name: { $first: '$name' },
          },
        },
        { $sort: { '_id.subject': 1, '_id.semester': 1 } },
      ];

      const results = await Mark.aggregate(pipeline);
      return res.json(results);
    }

    // ── MODE: "raw" (default) — returns raw documents
    const filter = {};
    if (student_id) filter.student_id = student_id.toUpperCase();
    if (semester && semester !== 'all') filter.semester = Number(semester);
    if (subject && subject !== 'all') filter.subject = subject;
    if (min_marks || max_marks) {
      filter.marks = {};
      if (min_marks) filter.marks.$gte = Number(min_marks);
      if (max_marks) filter.marks.$lte = Number(max_marks);
    }

    const results = await Mark.find(filter, { _id: 0 })
      .sort({ student_id: 1, semester: 1, subject: 1 })
      .limit(100);   // Safety limit

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// 10. GET /api/subject-avg
//     Average marks per subject (global — for dashboard chart).
//     AGGREGATION: $group (by subject) → $sort
// ─────────────────────────────────────────────────────────────────
router.get('/subject-avg', async (req, res) => {
  try {
    const results = await Mark.aggregate([
      {
        $group: {
          _id: '$subject',
          avgMarks: { $avg: '$marks' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          subject: '$_id',
          avgMarks: { $round: ['$avgMarks', 2] },
        },
      },
    ]);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════
//  CRUD OPERATIONS
// ═════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// 11. POST /api/marks — CREATE a new marks record
// ─────────────────────────────────────────────────────────────────
router.post('/marks', async (req, res) => {
  try {
    const { student_id, name, subject, semester, marks } = req.body;

    // Validation
    if (!student_id || !name || !subject || !semester || marks === undefined) {
      return res.status(400).json({ error: 'All fields are required: student_id, name, subject, semester, marks' });
    }
    if (marks < 0 || marks > 100) {
      return res.status(400).json({ error: 'Marks must be between 0 and 100' });
    }
    if (semester < 1 || semester > 4) {
      return res.status(400).json({ error: 'Semester must be between 1 and 4' });
    }

    // Check for duplicate entry
    const existing = await Mark.findOne({
      student_id: student_id.toUpperCase(),
      subject,
      semester: Number(semester),
    });
    if (existing) {
      return res.status(409).json({
        error: `Record already exists for ${student_id.toUpperCase()} — ${subject}, Semester ${semester}. Use edit instead.`,
      });
    }

    // Create the document
    const record = await Mark.create({
      student_id: student_id.toUpperCase(),
      name: name.trim(),
      subject,
      semester: Number(semester),
      marks: Number(marks),
    });

    res.status(201).json({ message: 'Record created successfully', record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// 12. GET /api/marks — READ all records with pagination & filters
//     Query params: page, limit, student_id, semester, subject
// ─────────────────────────────────────────────────────────────────
router.get('/marks', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.student_id) filter.student_id = req.query.student_id.toUpperCase();
    if (req.query.semester && req.query.semester !== 'all') filter.semester = Number(req.query.semester);
    if (req.query.subject && req.query.subject !== 'all') filter.subject = req.query.subject;

    // Count total matching docs (for pagination)
    const total = await Mark.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Fetch the page
    const records = await Mark.find(filter)
      .sort({ student_id: 1, semester: 1, subject: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// 13. PUT /api/marks/:id — UPDATE a marks record by MongoDB _id
// ─────────────────────────────────────────────────────────────────
router.put('/marks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, semester, marks } = req.body;

    // Validation
    if (marks !== undefined && (marks < 0 || marks > 100)) {
      return res.status(400).json({ error: 'Marks must be between 0 and 100' });
    }
    if (semester !== undefined && (semester < 1 || semester > 4)) {
      return res.status(400).json({ error: 'Semester must be between 1 and 4' });
    }

    // Build update object (only include fields that were sent)
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (subject !== undefined) update.subject = subject;
    if (semester !== undefined) update.semester = Number(semester);
    if (marks !== undefined) update.marks = Number(marks);

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const record = await Mark.findByIdAndUpdate(id, { $set: update }, { new: true });

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ message: 'Record updated successfully', record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// 14. DELETE /api/marks/:id — DELETE a marks record by MongoDB _id
// ─────────────────────────────────────────────────────────────────
router.delete('/marks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const record = await Mark.findByIdAndDelete(id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ message: 'Record deleted successfully', deleted: record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
