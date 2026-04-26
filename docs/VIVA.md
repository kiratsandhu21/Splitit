# Student Performance Analyzer — Viva / Explanation Guide

## 1. What problem does this project solve?

In a school or college, tracking student performance across multiple subjects and semesters is complex. This project provides:

- **Quick lookup** of any student's marks by semester and subject
- **Analytics** like overall averages, top performers, and trends
- **Visual charts** to spot patterns (improving/declining performance)
- **Efficient querying** even with thousands of records using MongoDB indexing

**In short:** It turns raw marks data into actionable insights for teachers and administrators.

---

## 2. Where is Indexing used?

### Compound Index: `{ student_id: 1, semester: 1 }`

**Where?** Defined in `models/Mark.js` using `schema.index()`.

**Used by these queries:**
- `GET /api/student/:id/:semester` — Finds marks for a specific student in a specific semester
- Any `find()` that filters on `student_id` and/or `semester`

**How it works:**
```
WITHOUT INDEX (COLLSCAN):
  MongoDB scans ALL 4,000 documents → checks each one → slow

WITH INDEX (IXSCAN):
  MongoDB jumps directly to matching documents using B-tree → fast
```

**Analogy:** Think of it like a textbook index. Instead of reading every page to find "Photosynthesis", you check the index at the back and jump to page 142 directly.

### Testing Index Performance

Run: `node indexTest.js`

This script:
1. Drops all indexes
2. Runs a query → prints how many docs were examined (COLLSCAN: ~4000)
3. Creates the compound index
4. Runs the SAME query → prints docs examined (IXSCAN: ~5)
5. Shows the performance improvement

---

## 3. Where is Aggregation used?

Aggregation pipelines are used in `routes/api.js` for all analytics:

| API Endpoint | Pipeline | What it does |
|-------------|----------|-------------|
| `/api/stats` | `$group → $project` | Counts total students, subjects, calculates overall average |
| `/api/average/:id` | `$match → $group → $project` | Computes a student's overall average marks |
| `/api/average-subjects/:id` | `$match → $group → $sort` | Average, max, min marks per subject for a student |
| `/api/topper` | `$group → $sort → $limit` | Top 5 students by overall average |
| `/api/trend/:id` | `$match → $group → $sort` | Semester-wise average trend for a student |
| `/api/subject-toppers` | `$sort → $group ($first)` | Highest scorer in each subject |
| `/api/subject-avg` | `$group → $sort` | Global average marks per subject |
| `/api/search?mode=aggregate` | Dynamic `$match → $group` | Filtered aggregation based on user criteria |

### Key Aggregation Stages Explained

- **`$match`** → Filters documents (like `WHERE` in SQL)
- **`$group`** → Groups documents and computes aggregates (`$avg`, `$sum`, `$max`, etc.) — like `GROUP BY`
- **`$sort`** → Orders results
- **`$limit`** → Takes only the first N results
- **`$project`** → Reshapes the output (like `SELECT` specific fields)
- **`$first`** → Takes the first document in each group (useful after sorting)

---

## 4. Why MongoDB?

| Feature | Benefit for this project |
|---------|------------------------|
| **Flexible Schema** | Each student record can vary without rigid table structure |
| **Aggregation Framework** | Powerful built-in analytics (no need for external tools) |
| **JSON-native** | Data flows naturally between MongoDB → Node.js → Browser |
| **Indexing** | Compound indexes make filtered queries blazing fast |
| **Node.js Driver** | Mongoose provides easy schema validation + index management |
| **Scalability** | Could scale to millions of records with the same code |

---

## 5. Project Architecture

```
┌──────────────────┐     HTTP      ┌──────────────────┐    Mongoose   ┌──────────┐
│   Browser (UI)   │ ←──────────→  │  Express Server   │ ←──────────→ │  MongoDB │
│  HTML/CSS/JS     │   REST API    │  routes/api.js    │   Queries    │  school  │
│  Chart.js        │               │  server.js        │  Aggregation │  marks   │
└──────────────────┘               └──────────────────┘              └──────────┘
```

---

## 6. How to run this project

```bash
# 1. Install dependencies
npm install

# 2. Make sure MongoDB is running locally
# (or update .env with your Atlas connection string)

# 3. Seed the database with 4,000 records
npm run seed

# 4. (Optional) Test index performance
npm run test-index

# 5. Start the server
npm start

# 6. Open browser → http://localhost:3000
```

---

## 7. Key MongoDB Concepts Demonstrated

### insertMany()
Used in `seed.js` to insert 4,000 documents in a single operation — much faster than inserting one by one.

### Compound Index
Two fields indexed together. Order matters: `{ student_id, semester }` supports queries that filter on `student_id` alone OR both `student_id + semester`, but NOT `semester` alone.

### explain()
The `explain("executionStats")` method shows how MongoDB executes a query — revealing whether it uses an index (IXSCAN) or scans every document (COLLSCAN).

### Aggregation Pipeline
A series of stages that process documents step by step. Each stage transforms the data and passes it to the next stage. Think of it like an assembly line.
