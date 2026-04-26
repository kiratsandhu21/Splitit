/**
 * seed.js — Bulk Data Insertion Script
 *
 * Generates 4,000 student marks records and inserts them into
 * the "marks" collection using insertMany().
 *
 * Run with:  node seed.js  (or:  npm run seed)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Mark = require('./models/Mark');

// ─── Configuration ──────────────────────────────────────────────

const STUDENT_COUNT = 200;          // S001 – S200
const SUBJECTS = ['Math', 'Physics', 'Chemistry', 'English', 'Computer Science'];
const SEMESTERS = [1, 2, 3, 4];
const MIN_MARKS = 50;
const MAX_MARKS = 100;

// ─── Indian First + Last Names (random combination) ─────────────
const FIRST_NAMES = [
  'Aarav','Aditi','Akash','Ananya','Arjun','Bhavya','Chirag','Deepa',
  'Divya','Gaurav','Harsh','Isha','Jay','Kavya','Kirat','Lakshmi',
  'Manish','Neha','Om','Priya','Rahul','Riya','Rohan','Sakshi',
  'Sahil','Simran','Sneha','Tanvi','Varun','Yash','Aditya','Pooja',
  'Vikram','Meera','Nikhil','Shruti','Kunal','Tanya','Amit','Swati',
];

const LAST_NAMES = [
  'Sharma','Verma','Singh','Patel','Gupta','Kumar','Joshi','Reddy',
  'Nair','Mehta','Chauhan','Desai','Rao','Bhat','Iyer','Chopra',
  'Malhotra','Agarwal','Saxena','Kaur','Thakur','Pandey','Mishra',
  'Banerjee','Das','Mukherjee','Bose','Yadav','Tiwari','Jain',
];

// ─── Helpers ────────────────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function generateStudentName() {
  return `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`;
}

function padId(num) {
  return `S${String(num).padStart(3, '0')}`;   // S001, S002, …, S200
}

// ─── Main ───────────────────────────────────────────────────────

async function seed() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Drop existing data so re-runs are clean
    await Mark.deleteMany({});
    console.log('🗑️  Cleared old records');

    // Generate student names (each student gets a fixed name)
    const studentNames = {};
    for (let i = 1; i <= STUDENT_COUNT; i++) {
      studentNames[padId(i)] = generateStudentName();
    }

    // Build the bulk array
    const records = [];
    for (let i = 1; i <= STUDENT_COUNT; i++) {
      const sid = padId(i);
      for (const subject of SUBJECTS) {
        for (const semester of SEMESTERS) {
          records.push({
            student_id: sid,
            name: studentNames[sid],
            subject,
            semester,
            marks: randomInt(MIN_MARKS, MAX_MARKS),
          });
        }
      }
    }

    // Insert all at once
    await Mark.insertMany(records);

    console.log(`🎉 Inserted ${records.length} records successfully!`);
    console.log(`   → ${STUDENT_COUNT} students × ${SUBJECTS.length} subjects × ${SEMESTERS.length} semesters`);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seed();
