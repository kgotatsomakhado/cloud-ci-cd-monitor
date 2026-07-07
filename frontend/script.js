const API_URL = "https://github-monitor-func-geaza8b2dfcagfbh.westeurope-01.azurewebsites.net/api/getWorkflowStatus";

// ---------------- STATE ----------------
let allRuns = [];
let currentPage = 1;
const pageSize = 9;
let firstLoad = true;

// ---------------- HELPERS ----------------
function formatDuration(start, end, status) {
  if (!start) return "-";

  const startTime = new Date(start);
  const endTime = end ? new Date(end) : new Date();

  const diff = Math.floor((endTime - startTime) / 1000);

  const min = Math.floor(diff / 60);
  const sec = diff % 60;

  if (status === "in_progress") return `${sec}s`;
  return `${min}m ${sec}s`;
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ---------------- RENDER PAGINATION ----------------
function renderPage() {
  const container = document.getElementById("runs");
  container.innerHTML = "";

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  const pageData = allRuns.slice(start, end);

  pageData.forEach(run => {

    const card = document.createElement("div");
    card.className = "card";

    const status = run.conclusion || "running";

    let statusClass = "running";
    if (status === "success") statusClass = "success";
    if (status === "failure") statusClass = "failure";

    const isRunning = status === "running";

    const started = formatTime(run.created_at);

    const duration = formatDuration(
      run.created_at,
      run.updated_at,
      run.status
    );

    card.onclick = () => {
      if (run.html_url) window.open(run.html_url, "_blank");
    };

    card.innerHTML = `
      <div class="title">${run.name}</div>

      <p><span class="badge ${statusClass}">
        ${status.toUpperCase()}
      </span></p>

      <p><b>Branch:</b> ${run.branch}</p>

      <p><b>Status:</b> ${isRunning ? "In Progress" : "Completed"}</p>

      <p><b>Started:</b> ${started}</p>

      <p><b>Duration:</b> ${duration}</p>
    `;

    container.appendChild(card);
  });

  updatePaginationUI();
}

// ---------------- PAGINATION UI ----------------
function updatePaginationUI() {
  let pg = document.getElementById("pagination");

  if (!pg) {
    pg = document.createElement("div");
    pg.id = "pagination";
    pg.style.display = "flex";
    pg.style.justifyContent = "center";
    pg.style.gap = "10px";
    pg.style.margin = "16px 0";

    pg.innerHTML = `
      <button id="prevBtn" class="page-btn">Previous</button>
      <span id="pageInfo" class="page-info"></span>
      <button id="nextBtn" class="page-btn">Next</button>
    `;

    document.querySelector(".container").appendChild(pg);

    document.getElementById("prevBtn").onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage();
      }
    };

    document.getElementById("nextBtn").onclick = () => {
      if (currentPage < Math.ceil(allRuns.length / pageSize)) {
        currentPage++;
        renderPage();
      }
    };
  }

  document.getElementById("pageInfo").innerText =
    `Page ${currentPage} / ${Math.ceil(allRuns.length / pageSize)}`;

  document.getElementById("prevBtn").disabled = currentPage === 1;
  document.getElementById("nextBtn").disabled =
    currentPage === Math.ceil(allRuns.length / pageSize);
}

// ---------------- MAIN ----------------
async function loadWorkflows() {
  try {

    const res = await fetch(API_URL);
    const data = await res.json();

    const banner = document.getElementById("banner");
    const loading = document.getElementById("loading");

    loading.style.display = "none";

    const newRuns = data.runs || [];

    allRuns = newRuns;

    const maxPage = Math.ceil(allRuns.length / pageSize);

    if (firstLoad) {
      currentPage = 1;
      firstLoad = false;
    }

    if (currentPage > maxPage) {
      currentPage = maxPage;
    }

    // ---------------- STATS ----------------
    document.getElementById("totalRuns").innerText = data.total || 0;
    document.getElementById("successRuns").innerText = data.success || 0;
    document.getElementById("failedRuns").innerText = data.failed || 0;
    document.getElementById("runningRuns").innerText = data.running || 0;

    // ---------------- SUCCESS RATE (SEGMENTED GREEN BARS) ----------------
    const rate = data.total ? Math.round((data.success / data.total) * 100) : 0;

    const blocks = 20;
    const filled = Math.round((rate / 100) * blocks);

    let bar = "";
    for (let i = 0; i < blocks; i++) {
      bar += i < filled
        ? `<span class="bar-segment filled"></span>`
        : `<span class="bar-segment empty"></span>`;
    }

    let rateDiv = document.getElementById("successRate");

    if (!rateDiv) {
      rateDiv = document.createElement("div");
      rateDiv.id = "successRate";
      rateDiv.style.margin = "10px 0 20px";
      rateDiv.style.color = "#cbd5e1";
      rateDiv.style.fontSize = "0.9rem";

      document.querySelector(".container").insertBefore(
        rateDiv,
        document.getElementById("runs")
      );
    }

    rateDiv.innerHTML = `
      <div style="margin-bottom:6px;">Deployment Success Rate</div>
      <div class="bar-container">
        ${bar}
        <span class="bar-percent">${rate}%</span>
      </div>
    `;

    // ---------------- BANNER ----------------
    const latest = allRuns[0];

    if (latest) {
      if (latest.conclusion === "success") {
        banner.className = "banner success-banner";
        banner.innerText = `Last Deployment: SUCCESS (${latest.branch})`;
      } else if (latest.conclusion === "failure") {
        banner.className = "banner fail-banner";
        banner.innerText = `Last Deployment: FAILED (${latest.branch})`;
      } else {
        banner.className = "banner running-banner";
        banner.innerText = `Last Deployment: RUNNING (${latest.branch})`;
      }
    }

    renderPage();

  } catch (err) {
    console.error(err);
    document.getElementById("loading").innerText =
      "Error loading workflows";
  }
}

loadWorkflows();
setInterval(loadWorkflows, 10000);