/**
 * indexTest.js — Index Performance Comparison
 *
 * Demonstrates the difference between querying WITH and WITHOUT
 * the compound index on { student_id, semester }.
 *
 * Run with:  node indexTest.js  (or:  npm run test-index)
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function testIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('marks');

    const testQuery = { student_id: 'S001', semester: 2 };

    // ───────────────────────────────────────────────────────────
    // TEST 1:  Drop the index and query WITHOUT it
    // ───────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════');
    console.log('  TEST 1: Query WITHOUT Index (COLLSCAN)');
    console.log('═══════════════════════════════════════════════');

    // Drop all non-_id indexes
    await collection.dropIndexes();
    console.log('  → Dropped all indexes\n');

    const withoutIndex = await collection
      .find(testQuery)
      .explain('executionStats');

    const statsWithout = withoutIndex.executionStats;
    console.log(`  Winning Plan:        ${withoutIndex.queryPlanner.winningPlan.stage}`);
    console.log(`  Docs Examined:       ${statsWithout.totalDocsExamined}`);
    console.log(`  Docs Returned:       ${statsWithout.nReturned}`);
    console.log(`  Execution Time (ms): ${statsWithout.executionTimeMillis}`);
    console.log();

    // ───────────────────────────────────────────────────────────
    // TEST 2:  Create the compound index and query WITH it
    // ───────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════');
    console.log('  TEST 2: Query WITH Index (IXSCAN)');
    console.log('═══════════════════════════════════════════════');

    await collection.createIndex({ student_id: 1, semester: 1 });
    console.log('  → Created compound index { student_id: 1, semester: 1 }\n');

    const withIndex = await collection
      .find(testQuery)
      .explain('executionStats');

    const statsWith = withIndex.executionStats;
    // The winning plan is nested under inputStage when FETCH + IXSCAN
    const plan = withIndex.queryPlanner.winningPlan;
    const scanStage = plan.inputStage ? plan.inputStage.stage : plan.stage;

    console.log(`  Winning Plan:        ${plan.stage} → ${scanStage}`);
    console.log(`  Docs Examined:       ${statsWith.totalDocsExamined}`);
    console.log(`  Keys Examined:       ${statsWith.totalKeysExamined}`);
    console.log(`  Docs Returned:       ${statsWith.nReturned}`);
    console.log(`  Execution Time (ms): ${statsWith.executionTimeMillis}`);
    console.log();

    // ───────────────────────────────────────────────────────────
    // Summary
    // ───────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════');
    console.log(`  Without index: examined ${statsWithout.totalDocsExamined} docs → ${statsWithout.executionTimeMillis}ms`);
    console.log(`  With index:    examined ${statsWith.totalDocsExamined} docs → ${statsWith.executionTimeMillis}ms`);
    console.log(`  Docs examined reduced by ${((1 - statsWith.totalDocsExamined / statsWithout.totalDocsExamined) * 100).toFixed(1)}%`);
    console.log();

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
  }
}

testIndex();
