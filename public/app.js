/**
 * app.js — Frontend Logic
 *
 * Handles:
 *  - Sidebar navigation
 *  - Dashboard stat cards + charts
 *  - Advanced search with filters (raw + aggregate modes)
 *  - Topper list
 *  - Subject averages
 *  - Comparison view (semester-wise trend vs. total subject comparison)
 */

const API = '/api';

// ═══════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════

const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');

navItems.forEach((item) => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const target = item.dataset.section;

    // Update active nav
    navItems.forEach((n) => n.classList.remove('active'));
    item.classList.add('active');

    // Show target section
    sections.forEach((s) => s.classList.remove('active'));
    document.getElementById(`section-${target}`).classList.add('active');

    // Close mobile sidebar
    sidebar.classList.remove('open');
  });
});

// Mobile menu toggle
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function markClass(val) {
  if (val >= 85) return 'mark-high';
  if (val >= 70) return 'mark-mid';
  return 'mark-low';
}

// Chart.js color palette
const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
const COLORS_LIGHT = COLORS.map((c) => c + '25');

// Destroy chart helper
const charts = {};
function getOrCreateChart(canvasId, config) {
  if (charts[canvasId]) {
    charts[canvasId].destroy();
  }
  const ctx = document.getElementById(canvasId).getContext('2d');
  charts[canvasId] = new Chart(ctx, config);
  return charts[canvasId];
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD — Stats
// ═══════════════════════════════════════════════════════════════

async function loadStats() {
  try {
    const data = await fetchJSON(`${API}/stats`);
    document.getElementById('stat-students').textContent = data.totalStudents;
    document.getElementById('stat-subjects').textContent = data.totalSubjects;
    document.getElementById('stat-avg').textContent = data.avgMarks + '%';
    document.getElementById('stat-records').textContent = data.totalRecords.toLocaleString();
  } catch {
    console.error('Failed to load stats');
  }
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD — Subject Average Chart (Doughnut)
// ═══════════════════════════════════════════════════════════════

async function loadSubjectAvgChart() {
  try {
    const data = await fetchJSON(`${API}/subject-avg`);
    const labels = data.map((d) => d.subject);
    const values = data.map((d) => d.avgMarks);

    getOrCreateChart('chart-subject-avg', {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: COLORS.slice(0, labels.length),
            borderWidth: 2,
            borderColor: '#fff',
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { font: { family: 'Inter', size: 12 }, padding: 14 } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`,
            },
          },
        },
      },
    });

    // Also populate the Subjects table
    const tbody = document.querySelector('#table-subject-avg tbody');
    tbody.innerHTML = data
      .map(
        (d) => `
      <tr>
        <td>${d.subject}</td>
        <td class="${markClass(d.avgMarks)}">${d.avgMarks}%</td>
      </tr>`
      )
      .join('');
  } catch {
    console.error('Failed to load subject avg chart');
  }
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD — Top 5 Chart (Horizontal Bar)
// ═══════════════════════════════════════════════════════════════

async function loadTop5Chart() {
  try {
    const data = await fetchJSON(`${API}/topper`);
    const labels = data.map((d) => d.name);
    const values = data.map((d) => d.avgMarks);

    getOrCreateChart('chart-top5', {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Avg Marks',
            data: values,
            backgroundColor: COLORS.slice(0, labels.length).map((c) => c + '90'),
            borderColor: COLORS.slice(0, labels.length),
            borderWidth: 2,
            borderRadius: 6,
            barPercentage: 0.6,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { min: 50, max: 100, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter' } } },
          y: { grid: { display: false }, ticks: { font: { family: 'Inter', weight: 600 } } },
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.x}%` } },
        },
      },
    });

    // Also populate the Toppers table
    const tbody = document.querySelector('#table-toppers tbody');
    tbody.innerHTML = data
      .map(
        (d, i) => `
      <tr>
        <td><strong>${i + 1}</strong></td>
        <td>${d.student_id}</td>
        <td>${d.name}</td>
        <td class="${markClass(d.avgMarks)}">${d.avgMarks}%</td>
      </tr>`
      )
      .join('');
  } catch {
    console.error('Failed to load top 5');
  }
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD — Subject Toppers Table
// ═══════════════════════════════════════════════════════════════

async function loadSubjectToppers() {
  try {
    const data = await fetchJSON(`${API}/subject-toppers`);
    const tbody = document.querySelector('#table-subject-toppers tbody');
    tbody.innerHTML = data
      .map(
        (d) => `
      <tr>
        <td><strong>${d.subject}</strong></td>
        <td>${d.topperName}</td>
        <td>${d.topperStudentId}</td>
        <td class="mark-high">${d.highestMarks}</td>
        <td>Semester ${d.semester}</td>
      </tr>`
      )
      .join('');
  } catch {
    console.error('Failed to load subject toppers');
  }
}

// ═══════════════════════════════════════════════════════════════
//  SEARCH & FILTER
// ═══════════════════════════════════════════════════════════════

document.getElementById('btn-search').addEventListener('click', performSearch);
document.getElementById('btn-clear').addEventListener('click', clearSearch);

// Allow Enter key on student ID input
document.getElementById('f-student-id').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') performSearch();
});

async function performSearch() {
  const studentId = document.getElementById('f-student-id').value.trim();
  const semester = document.getElementById('f-semester').value;
  const subject = document.getElementById('f-subject').value;
  const minMarks = document.getElementById('f-min-marks').value;
  const maxMarks = document.getElementById('f-max-marks').value;
  const mode = document.getElementById('f-mode').value;

  // Build query string
  const params = new URLSearchParams();
  if (studentId) params.set('student_id', studentId);
  if (semester !== 'all') params.set('semester', semester);
  if (subject !== 'all') params.set('subject', subject);
  if (minMarks) params.set('min_marks', minMarks);
  if (maxMarks) params.set('max_marks', maxMarks);
  params.set('mode', mode);

  const btn = document.getElementById('btn-search');
  btn.innerHTML = '<span class="spinner"></span> <i class="ph-bold ph-magnifying-glass"></i> Searching...';
  btn.disabled = true;

  try {
    const data = await fetchJSON(`${API}/search?${params}`);
    displaySearchResults(data, mode);
  } catch (err) {
    alert('Search failed: ' + err.message);
  } finally {
    btn.innerHTML = '<i class="ph-bold ph-magnifying-glass"></i> Search';
    btn.disabled = false;
  }
}

function displaySearchResults(data, mode) {
  const card = document.getElementById('search-results-card');
  const title = document.getElementById('search-results-title');
  const count = document.getElementById('search-result-count');
  const thead = document.getElementById('search-results-head');
  const tbody = document.getElementById('search-results-body');

  card.style.display = 'block';

  if (data.length === 0) {
    title.textContent = 'No Results Found';
    count.textContent = '';
    thead.innerHTML = '';
    tbody.innerHTML = `
      <tr><td colspan="10" class="empty-state">
        <div class="empty-icon"><i class="ph-duotone ph-magnifying-glass"></i></div>
        No matching records found. Try adjusting your filters.
      </td></tr>`;
    return;
  }

  if (mode === 'aggregate') {
    title.textContent = 'Aggregated Results';
    count.textContent = `${data.length} group(s) found`;
    thead.innerHTML = `<tr>
      <th>Subject</th><th>Semester</th><th>Avg Marks</th><th>Max</th><th>Min</th><th>Count</th>
    </tr>`;
    tbody.innerHTML = data
      .map(
        (d) => `
      <tr>
        <td><strong>${d._id.subject}</strong></td>
        <td>${d._id.semester ? 'Sem ' + d._id.semester : 'All'}</td>
        <td class="${markClass(d.avgMarks)}">${d.avgMarks.toFixed(2)}%</td>
        <td>${d.maxMarks}</td>
        <td>${d.minMarks}</td>
        <td>${d.count}</td>
      </tr>`
      )
      .join('');
  } else {
    title.textContent = 'Search Results (Raw Marks)';
    count.textContent = `${data.length} record(s) found`;
    thead.innerHTML = `<tr>
      <th>Student ID</th><th>Name</th><th>Subject</th><th>Semester</th><th>Marks</th>
    </tr>`;
    tbody.innerHTML = data
      .map(
        (d) => `
      <tr>
        <td>${d.student_id}</td>
        <td>${d.name}</td>
        <td>${d.subject}</td>
        <td>Semester ${d.semester}</td>
        <td class="${markClass(d.marks)}">${d.marks}</td>
      </tr>`
      )
      .join('');
  }
}

function clearSearch() {
  document.getElementById('f-student-id').value = '';
  document.getElementById('f-semester').value = 'all';
  document.getElementById('f-subject').value = 'all';
  document.getElementById('f-min-marks').value = '';
  document.getElementById('f-max-marks').value = '';
  document.getElementById('f-mode').value = 'raw';
  document.getElementById('search-results-card').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════════
//  COMPARISON VIEW
// ═══════════════════════════════════════════════════════════════

document.getElementById('btn-compare').addEventListener('click', performComparison);

// Allow Enter key
document.getElementById('c-student-id').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') performComparison();
});

async function performComparison() {
  const studentId = document.getElementById('c-student-id').value.trim();
  const viewMode = document.getElementById('c-view-mode').value;

  if (!studentId) {
    alert('Please enter a Student ID');
    return;
  }

  const btn = document.getElementById('btn-compare');
  btn.innerHTML = '<span class="spinner"></span> <i class="ph-bold ph-chart-line-up"></i> Analyzing...';
  btn.disabled = true;

  try {
    if (viewMode === 'semester') {
      await showSemesterTrend(studentId);
    } else if (viewMode === 'total') {
      await showTotalComparison(studentId);
    } else if (viewMode === 'subject-sem') {
      await showSubjectSemAnalysis(studentId);
    } else if (viewMode === 'sem-subject') {
      await showSemSubjectAnalysis(studentId);
    } else if (viewMode === 'student-vs-class') {
      await showStudentVsClass(studentId);
    }
  } catch (err) {
    alert('Analysis failed: ' + err.message);
  } finally {
    btn.innerHTML = '<i class="ph-bold ph-chart-line-up"></i> Analyze';
    btn.disabled = false;
  }
}

// ─── Semester-wise Trend ────────────────────────────────────
async function showSemesterTrend(studentId) {
  const trendData = await fetchJSON(`${API}/trend/${studentId}`);
  const allData = await fetchJSON(`${API}/student/${studentId}`);

  if (trendData.length === 0) {
    alert('No data found for ' + studentId.toUpperCase());
    return;
  }

  // Chart
  const chartCard = document.getElementById('comparison-chart-card');
  const chartTitle = document.getElementById('comparison-chart-title');
  chartCard.style.display = 'block';
  chartTitle.textContent = `Semester-wise Trend — ${studentId.toUpperCase()}`;

  const labels = trendData.map((d) => `Sem ${d.semester}`);
  const values = trendData.map((d) => d.avgMarks);

  getOrCreateChart('chart-comparison', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Avg Marks',
          data: values,
          backgroundColor: COLORS.slice(0, labels.length).map((c) => c + '80'),
          borderColor: COLORS.slice(0, labels.length),
          borderWidth: 2,
          borderRadius: 8,
          barPercentage: 0.5,
        },
        {
          label: 'Trend Line',
          data: values,
          type: 'line',
          borderColor: '#3b82f6',
          backgroundColor: 'transparent',
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: '#3b82f6',
          borderWidth: 2.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 40, max: 100, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter' } } },
        x: { grid: { display: false }, ticks: { font: { family: 'Inter', weight: 600 } } },
      },
      plugins: {
        legend: { display: true, labels: { font: { family: 'Inter' } } },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` } },
      },
    },
  });

  // Table — subject-wise per semester
  const tableCard = document.getElementById('comparison-table-card');
  const tableTitle = document.getElementById('comparison-table-title');
  const thead = document.getElementById('comparison-head');
  const tbody = document.getElementById('comparison-body');

  tableCard.style.display = 'block';
  tableTitle.textContent = `All Records — ${studentId.toUpperCase()}`;

  thead.innerHTML = `<tr>
    <th>Semester</th><th>Subject</th><th>Marks</th>
  </tr>`;

  tbody.innerHTML = allData
    .map(
      (d) => `
    <tr>
      <td>Semester ${d.semester}</td>
      <td>${d.subject}</td>
      <td class="${markClass(d.marks)}">${d.marks}</td>
    </tr>`
    )
    .join('');
}

// ─── Total Subject Comparison ───────────────────────────────
async function showTotalComparison(studentId) {
  const subjectData = await fetchJSON(`${API}/average-subjects/${studentId}`);
  const avgData = await fetchJSON(`${API}/average/${studentId}`);

  if (subjectData.length === 0) {
    alert('No data found for ' + studentId.toUpperCase());
    return;
  }

  // Chart — Radar
  const chartCard = document.getElementById('comparison-chart-card');
  const chartTitle = document.getElementById('comparison-chart-title');
  chartCard.style.display = 'block';
  chartTitle.textContent = `Total Subject Comparison — ${studentId.toUpperCase()} (Overall Avg: ${avgData.avgMarks}%)`;

  const labels = subjectData.map((d) => d.subject);
  const avgValues = subjectData.map((d) => d.avgMarks);
  const maxValues = subjectData.map((d) => d.maxMarks);
  const minValues = subjectData.map((d) => d.minMarks);

  getOrCreateChart('chart-comparison', {
    type: 'radar',
    data: {
      labels,
      datasets: [
        {
          label: 'Average',
          data: avgValues,
          backgroundColor: 'rgba(59,130,246,0.15)',
          borderColor: '#3b82f6',
          borderWidth: 2.5,
          pointBackgroundColor: '#3b82f6',
          pointRadius: 5,
        },
        {
          label: 'Max',
          data: maxValues,
          backgroundColor: 'rgba(16,185,129,0.1)',
          borderColor: '#10b981',
          borderWidth: 2,
          pointBackgroundColor: '#10b981',
          pointRadius: 4,
          borderDash: [5, 3],
        },
        {
          label: 'Min',
          data: minValues,
          backgroundColor: 'rgba(239,68,68,0.08)',
          borderColor: '#ef4444',
          borderWidth: 2,
          pointBackgroundColor: '#ef4444',
          pointRadius: 4,
          borderDash: [5, 3],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 40,
          max: 100,
          ticks: { stepSize: 10, font: { family: 'Inter' } },
          pointLabels: { font: { family: 'Inter', weight: 600, size: 13 } },
          grid: { color: '#e2e8f0' },
        },
      },
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Inter' }, padding: 16 } },
      },
    },
  });

  // Table
  const tableCard = document.getElementById('comparison-table-card');
  const tableTitle = document.getElementById('comparison-table-title');
  const thead = document.getElementById('comparison-head');
  const tbody = document.getElementById('comparison-body');

  tableCard.style.display = 'block';
  tableTitle.textContent = `Subject Averages — ${studentId.toUpperCase()}`;

  thead.innerHTML = `<tr>
    <th>Subject</th><th>Average</th><th>Best</th><th>Lowest</th>
  </tr>`;

  tbody.innerHTML = subjectData
    .map(
      (d) => `
    <tr>
      <td><strong>${d.subject}</strong></td>
      <td class="${markClass(d.avgMarks)}">${d.avgMarks}%</td>
      <td class="mark-high">${d.maxMarks}</td>
      <td class="mark-low">${d.minMarks}</td>
    </tr>`
    )
    .join('');
}

// ─── Subject Performance Across Semesters ──────────────────────
async function showSubjectSemAnalysis(studentId) {
  const allData = await fetchJSON(`${API}/student/${studentId}`);
  if (allData.length === 0) {
    alert('No data found for ' + studentId.toUpperCase());
    return;
  }

  // Get unique semesters and subjects
  const semesters = [...new Set(allData.map(d => d.semester))].sort();
  const subjects = [...new Set(allData.map(d => d.subject))];

  // Prepare datasets for Chart.js
  const datasets = subjects.map((subject, index) => {
    const data = semesters.map(sem => {
      const record = allData.find(d => d.semester === sem && d.subject === subject);
      return record ? record.marks : 0; // 0 if no record for that semester
    });

    return {
      label: subject,
      data: data,
      backgroundColor: COLORS[index % COLORS.length] + 'CC',
      borderColor: COLORS[index % COLORS.length],
      borderWidth: 1,
      borderRadius: 4
    };
  });

  // Chart
  const chartCard = document.getElementById('comparison-chart-card');
  const chartTitle = document.getElementById('comparison-chart-title');
  chartCard.style.display = 'block';
  chartTitle.textContent = `Subject Performance Across Semesters — ${studentId.toUpperCase()}`;

  const labels = semesters.map(s => `Sem ${s}`);

  getOrCreateChart('chart-comparison', {
    type: 'bar',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 100, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter' } } },
        x: { grid: { display: false }, ticks: { font: { family: 'Inter', weight: 600 } } }
      },
      plugins: {
        legend: { position: 'top', labels: { font: { family: 'Inter' } } },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} Marks` } }
      }
    }
  });

  // Table
  const tableCard = document.getElementById('comparison-table-card');
  const tableTitle = document.getElementById('comparison-table-title');
  const thead = document.getElementById('comparison-head');
  const tbody = document.getElementById('comparison-body');

  tableCard.style.display = 'block';
  tableTitle.textContent = `Raw Marks Matrix — ${studentId.toUpperCase()}`;

  thead.innerHTML = `<tr>
    <th>Subject</th>${semesters.map(s => `<th>Sem ${s}</th>`).join('')}
  </tr>`;

  tbody.innerHTML = subjects.map(subject => {
    const rowMarks = semesters.map(sem => {
      const record = allData.find(d => d.semester === sem && d.subject === subject);
      const val = record ? record.marks : '-';
      const cssClass = record ? markClass(val) : '';
      return `<td class="${cssClass}">${val}</td>`;
    }).join('');
    return `<tr><td><strong>${subject}</strong></td>${rowMarks}</tr>`;
  }).join('');
}

// ─── Semester Performance Per Subject ─────────────────────────────
async function showSemSubjectAnalysis(studentId) {
  const allData = await fetchJSON(`${API}/student/${studentId}`);
  if (allData.length === 0) {
    alert('No data found for ' + studentId.toUpperCase());
    return;
  }

  // Get unique semesters and subjects
  const semesters = [...new Set(allData.map(d => d.semester))].sort();
  const subjects = [...new Set(allData.map(d => d.subject))];

  // Prepare datasets for Chart.js
  const datasets = semesters.map((sem, index) => {
    const data = subjects.map(subject => {
      const record = allData.find(d => d.semester === sem && d.subject === subject);
      return record ? record.marks : 0;
    });

    return {
      label: `Semester ${sem}`,
      data: data,
      backgroundColor: COLORS[index % COLORS.length] + 'CC',
      borderColor: COLORS[index % COLORS.length],
      borderWidth: 1,
      borderRadius: 4
    };
  });

  // Chart
  const chartCard = document.getElementById('comparison-chart-card');
  const chartTitle = document.getElementById('comparison-chart-title');
  chartCard.style.display = 'block';
  chartTitle.textContent = `Semester Performance Per Subject — ${studentId.toUpperCase()}`;

  const labels = subjects;

  getOrCreateChart('chart-comparison', {
    type: 'bar',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 100, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter' } } },
        x: { grid: { display: false }, ticks: { font: { family: 'Inter', weight: 600 } } }
      },
      plugins: {
        legend: { position: 'top', labels: { font: { family: 'Inter' } } },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} Marks` } }
      }
    }
  });

  // Table
  const tableCard = document.getElementById('comparison-table-card');
  const tableTitle = document.getElementById('comparison-table-title');
  const thead = document.getElementById('comparison-head');
  const tbody = document.getElementById('comparison-body');

  tableCard.style.display = 'block';
  tableTitle.textContent = `Raw Marks Matrix — ${studentId.toUpperCase()}`;

  thead.innerHTML = `<tr>
    <th>Semester</th>${subjects.map(s => `<th>${s}</th>`).join('')}
  </tr>`;

  tbody.innerHTML = semesters.map(sem => {
    const rowMarks = subjects.map(subject => {
      const record = allData.find(d => d.semester === sem && d.subject === subject);
      const val = record ? record.marks : '-';
      const cssClass = record ? markClass(val) : '';
      return `<td class="${cssClass}">${val}</td>`;
    }).join('');
    return `<tr><td><strong>Semester ${sem}</strong></td>${rowMarks}</tr>`;
  }).join('');
}

// ─── Student vs. Class Average ──────────────────────────────────
async function showStudentVsClass(studentId) {
  const studentData = await fetchJSON(`${API}/average-subjects/${studentId}`);
  const classData = await fetchJSON(`${API}/subject-avg`);

  if (studentData.length === 0) {
    alert('No data found for ' + studentId.toUpperCase());
    return;
  }

  // Use the subjects the student has taken
  const subjects = studentData.map(d => d.subject);
  
  const studentAverages = studentData.map(d => d.avgMarks);
  const classAverages = subjects.map(subject => {
    const globalRecord = classData.find(c => c.subject === subject);
    return globalRecord ? globalRecord.avgMarks : 0;
  });

  // Chart
  const chartCard = document.getElementById('comparison-chart-card');
  const chartTitle = document.getElementById('comparison-chart-title');
  chartCard.style.display = 'block';
  chartTitle.textContent = `Student vs. Class Average — ${studentId.toUpperCase()}`;

  getOrCreateChart('chart-comparison', {
    type: 'radar',
    data: {
      labels: subjects,
      datasets: [
        {
          label: `${studentId.toUpperCase()} Average`,
          data: studentAverages,
          backgroundColor: 'rgba(59,130,246,0.3)',
          borderColor: '#3b82f6',
          borderWidth: 2.5,
          pointBackgroundColor: '#3b82f6',
          pointRadius: 5
        },
        {
          label: 'Class Average',
          data: classAverages,
          backgroundColor: 'rgba(16,185,129,0.15)',
          borderColor: '#10b981',
          borderWidth: 2,
          pointBackgroundColor: '#10b981',
          pointRadius: 4,
          borderDash: [5, 5]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 40,
          max: 100,
          ticks: { stepSize: 10, font: { family: 'Inter' } },
          pointLabels: { font: { family: 'Inter', weight: 600, size: 13 } },
          grid: { color: '#e2e8f0' }
        }
      },
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Inter', padding: 16 } } }
      }
    }
  });

  // Table
  const tableCard = document.getElementById('comparison-table-card');
  const tableTitle = document.getElementById('comparison-table-title');
  const thead = document.getElementById('comparison-head');
  const tbody = document.getElementById('comparison-body');

  tableCard.style.display = 'block';
  tableTitle.textContent = `Comparison Data — ${studentId.toUpperCase()}`;

  thead.innerHTML = `<tr>
    <th>Subject</th><th>Student Avg</th><th>Class Avg</th><th>Difference</th>
  </tr>`;

  tbody.innerHTML = subjects.map((subject, index) => {
    const sAvg = studentAverages[index];
    const cAvg = classAverages[index];
    const diff = (sAvg - cAvg).toFixed(2);
    const diffText = diff > 0 ? `+${diff}` : diff;
    const diffClass = diff > 0 ? 'mark-high' : (diff < 0 ? 'mark-low' : '');

    return `<tr>
      <td><strong>${subject}</strong></td>
      <td class="${markClass(sAvg)}">${sAvg.toFixed(2)}%</td>
      <td>${cAvg.toFixed(2)}%</td>
      <td class="${diffClass}">${diffText}%</td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ═══════════════════════════════════════════════════════════════
//  CRUD — CREATE
// ═══════════════════════════════════════════════════════════════

document.getElementById('btn-create').addEventListener('click', createRecord);
document.getElementById('btn-create-clear').addEventListener('click', clearCreateForm);

async function createRecord() {
  const student_id = document.getElementById('crud-student-id').value.trim();
  const name = document.getElementById('crud-name').value.trim();
  const subject = document.getElementById('crud-subject').value;
  const semester = Number(document.getElementById('crud-semester').value);
  const marks = Number(document.getElementById('crud-marks').value);

  if (!student_id || !name || !marks && marks !== 0) {
    showToast('Please fill in all fields', 'error');
    return;
  }

  const btn = document.getElementById('btn-create');
  btn.innerHTML = '<span class="spinner"></span> <i class="ph-bold ph-plus-circle"></i> Adding...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/marks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, name, subject, semester, marks }),
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Failed to create record', 'error');
      return;
    }

    showToast(`<i class="ph-bold ph-check-circle"></i> Record created for ${student_id.toUpperCase()} — ${subject}, Sem ${semester}`);
    clearCreateForm();
    loadRecords();       // Refresh the table
    refreshDashboard();  // Update dashboard stats & charts
  } catch (err) {
    showToast('Network error: ' + err.message, 'error');
  } finally {
    btn.innerHTML = '<i class="ph-bold ph-plus-circle"></i> Add Record';
    btn.disabled = false;
  }
}

function clearCreateForm() {
  document.getElementById('crud-student-id').value = '';
  document.getElementById('crud-name').value = '';
  document.getElementById('crud-subject').value = 'Math';
  document.getElementById('crud-semester').value = '1';
  document.getElementById('crud-marks').value = '';
}

// ═══════════════════════════════════════════════════════════════
//  CRUD — READ (Paginated Table)
// ═══════════════════════════════════════════════════════════════

let currentPage = 1;
const PAGE_LIMIT = 10;

document.getElementById('btn-load-records').addEventListener('click', () => {
  currentPage = 1;
  loadRecords();
});

document.getElementById('btn-prev').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    loadRecords();
  }
});

document.getElementById('btn-next').addEventListener('click', () => {
  currentPage++;
  loadRecords();
});

// Also load when filter inputs change
document.getElementById('m-filter-sid').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { currentPage = 1; loadRecords(); }
});

async function loadRecords() {
  const studentId = document.getElementById('m-filter-sid').value.trim();
  const semester = document.getElementById('m-filter-sem').value;
  const subject = document.getElementById('m-filter-sub').value;

  const params = new URLSearchParams();
  params.set('page', currentPage);
  params.set('limit', PAGE_LIMIT);
  if (studentId) params.set('student_id', studentId);
  if (semester !== 'all') params.set('semester', semester);
  if (subject !== 'all') params.set('subject', subject);

  try {
    const data = await fetchJSON(`${API}/marks?${params}`);
    const { records, pagination } = data;

    const tbody = document.getElementById('manage-body');

    if (records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">
        <div class="empty-icon"><i class="ph-duotone ph-folder-open"></i></div>
        No records found. Try adjusting filters or add a new record.
      </td></tr>`;
    } else {
      tbody.innerHTML = records
        .map(
          (r) => `
        <tr>
          <td><strong>${r.student_id}</strong></td>
          <td>${r.name}</td>
          <td>${r.subject}</td>
          <td>Semester ${r.semester}</td>
          <td class="${markClass(r.marks)}">${r.marks}</td>
          <td>
            <div class="action-btns">
              <button class="btn-icon btn-icon-edit" onclick="openEditModal('${r._id}', '${r.student_id}', '${r.name.replace(/'/g, "\\'")}', '${r.subject}', ${r.semester}, ${r.marks})" title="Edit"><i class="ph-bold ph-pencil-simple"></i></button>
              <button class="btn-icon btn-icon-delete" onclick="confirmDelete('${r._id}', '${r.student_id}', '${r.subject}', ${r.semester})" title="Delete"><i class="ph-bold ph-trash"></i></button>
            </div>
          </td>
        </tr>`
        )
        .join('');
    }

    // Update pagination controls
    currentPage = pagination.page;
    document.getElementById('page-info').textContent = `Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} records)`;
    document.getElementById('btn-prev').disabled = !pagination.hasPrev;
    document.getElementById('btn-next').disabled = !pagination.hasNext;
  } catch (err) {
    console.error('Failed to load records:', err);
    showToast('Failed to load records', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════
//  CRUD — UPDATE (Edit Modal)
// ═══════════════════════════════════════════════════════════════

const editModal = document.getElementById('edit-modal');

// Close modal handlers
document.getElementById('modal-close').addEventListener('click', closeEditModal);
document.getElementById('btn-cancel-edit').addEventListener('click', closeEditModal);

// Close on overlay click
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && editModal.classList.contains('open')) closeEditModal();
});

function openEditModal(id, studentId, name, subject, semester, marks) {
  document.getElementById('edit-id').value = id;
  document.getElementById('edit-student-id').value = studentId;
  document.getElementById('edit-name').value = name;
  document.getElementById('edit-subject').value = subject;
  document.getElementById('edit-semester').value = semester;
  document.getElementById('edit-marks').value = marks;
  editModal.classList.add('open');
}

function closeEditModal() {
  editModal.classList.remove('open');
}

// Save edit
document.getElementById('btn-save-edit').addEventListener('click', saveEdit);

async function saveEdit() {
  const id = document.getElementById('edit-id').value;
  const name = document.getElementById('edit-name').value.trim();
  const subject = document.getElementById('edit-subject').value;
  const semester = Number(document.getElementById('edit-semester').value);
  const marks = Number(document.getElementById('edit-marks').value);

  if (!name) {
    showToast('Name is required', 'error');
    return;
  }

  const btn = document.getElementById('btn-save-edit');
  btn.innerHTML = '<span class="spinner"></span> <i class="ph-bold ph-floppy-disk"></i> Saving...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/marks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subject, semester, marks }),
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Update failed', 'error');
      return;
    }

    showToast('<i class="ph-bold ph-check-circle"></i> Record updated successfully');
    closeEditModal();
    loadRecords();       // Refresh table
    refreshDashboard();  // Update dashboard
  } catch (err) {
    showToast('Network error: ' + err.message, 'error');
  } finally {
    btn.innerHTML = '<i class="ph-bold ph-floppy-disk"></i> Save Changes';
    btn.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════════
//  CRUD — DELETE
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
//  CRUD — DELETE
// ═══════════════════════════════════════════════════════════════

const deleteModal = document.getElementById('delete-modal');

// Close handlers
document.getElementById('delete-modal-close').addEventListener('click', closeDeleteModal);
document.getElementById('btn-cancel-delete').addEventListener('click', closeDeleteModal);

// Close on overlay click
deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) closeDeleteModal();
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && deleteModal.classList.contains('open')) closeDeleteModal();
});

function confirmDelete(id, studentId, subject, semester) {
  document.getElementById('del-id').value = id;
  document.getElementById('del-student-id').textContent = studentId;
  document.getElementById('del-subject').textContent = subject;
  document.getElementById('del-semester').textContent = semester;
  deleteModal.classList.add('open');
}

function closeDeleteModal() {
  deleteModal.classList.remove('open');
}

// Execute delete
document.getElementById('btn-confirm-delete').addEventListener('click', executeDelete);

async function executeDelete() {
  const id = document.getElementById('del-id').value;
  const btn = document.getElementById('btn-confirm-delete');
  
  btn.innerHTML = '<span class="spinner"></span> <i class="ph-bold ph-trash"></i> Deleting...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/marks/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Delete failed', 'error');
      return;
    }

    showToast('<i class="ph-bold ph-trash"></i> Record deleted successfully');
    closeDeleteModal();
    loadRecords();       // Refresh table
    refreshDashboard();  // Update dashboard
  } catch (err) {
    showToast('Network error: ' + err.message, 'error');
  } finally {
    btn.innerHTML = '<i class="ph-bold ph-trash"></i> Yes, Delete';
    btn.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD REFRESH (after CRUD operations)
// ═══════════════════════════════════════════════════════════════

function refreshDashboard() {
  loadStats();
  loadSubjectAvgChart();
  loadTop5Chart();
  loadSubjectToppers();
}

// ═══════════════════════════════════════════════════════════════
//  INIT — Load everything on page load
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Dashboard data
  refreshDashboard();

  // Auto-load records when navigating to Manage section
  document.getElementById('nav-manage').addEventListener('click', () => {
    setTimeout(() => loadRecords(), 100);
  });
});

