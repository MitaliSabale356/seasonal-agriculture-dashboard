const SEASON_COLORS = {
  Kharif: "#6fcf6a",
  Rabi: "#6eb5ff",
  Zaid: "#f0b429",
};

const SEASONS = ["Kharif", "Rabi", "Zaid"];
const per = (value, divisor) => (value == null ? null : value / divisor);

const NUMERIC = [
  "Farm_Area_Hectares",
  "Rainfall_mm",
  "Avg_Temperature_C",
  "Humidity_pct",
  "Sunlight_Hours_Day",
  "Soil_pH",
  "Soil_Moisture_pct",
  "Nitrogen_kg_ha",
  "Phosphorus_kg_ha",
  "Potassium_kg_ha",
  "Fertilizer_kg_ha",
  "Pesticide_Litre_ha",
  "Seed_Quality_Score",
  "Yield_Tonnes_Ha",
  "Production_Tonnes",
  "Market_Price_INR_Tonne",
  "Total_Cost_INR",
  "Revenue_INR",
  "Profit_INR",
  "Water_Used_m3",
  "Water_Efficiency_t_per_1000m3",
  "Disease_Pest_Risk_pct",
];

const charts = {};
let allRows = [];
let page = 1;
const PAGE_SIZE = 12;

const $ = (id) => document.getElementById(id);

function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((header, i) => {
      const value = (cells[i] ?? "").trim();
      row[header] = NUMERIC.includes(header)
        ? value === "" || value.toLowerCase() === "nan"
          ? null
          : Number(value)
        : value;
    });
    return row;
  });
}

function unique(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort();
}

function fillSelect(select, values, multipleEmpty = false) {
  if (multipleEmpty) {
    select.innerHTML = values.map((value) => `<option value="${value}" selected>${value}</option>`).join("");
    return;
  }
  const keep = select.querySelector("option")?.outerHTML || "";
  select.innerHTML = keep + values.map((value) => `<option value="${value}">${value}</option>`).join("");
}

function selectedSeasons() {
  return [...$("season").selectedOptions].map((option) => option.value);
}

function currentRows() {
  const seasons = selectedSeasons();
  const state = $("state").value;
  const crop = $("crop").value;
  const irrigation = $("irrigation").value;
  return allRows.filter((row) => {
    if (seasons.length && !seasons.includes(row.Season)) return false;
    if (state && row.State !== state) return false;
    if (crop && row.Crop !== crop) return false;
    if (irrigation && row.Irrigation_Method !== irrigation) return false;
    return true;
  });
}

function mean(rows, key) {
  const values = rows.map((row) => row[key]).filter((value) => value !== null && !Number.isNaN(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(rows, key) {
  const values = rows
    .map((row) => row[key])
    .filter((value) => value !== null && !Number.isNaN(value))
    .sort((a, b) => a - b);
  if (!values.length) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return "–";
  return value.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

function formatINR(value) {
  if (!Number.isFinite(value)) return "–";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return `${sign}₹${formatNumber(abs, 0)}`;
}

function groupMean(rows, by, metric) {
  const groups = {};
  rows.forEach((row) => {
    const key = row[by];
    if (!key) return;
    (groups[key] ||= []).push(row);
  });
  return Object.fromEntries(Object.entries(groups).map(([key, list]) => [key, mean(list, metric)]));
}

function upsertChart(id, config) {
  if (charts[id]) charts[id].destroy();
  const ctx = $(id).getContext("2d");
  charts[id] = new Chart(ctx, config);
}

function chartDefaults() {
  Chart.defaults.color = "#b5c4ab";
  Chart.defaults.borderColor = "rgba(214, 232, 196, 0.12)";
  Chart.defaults.font.family = "DM Sans";
}

function renderKpis(rows) {
  const withoutCane = rows.filter((row) => row.Crop !== "Sugarcane");
  const profitable = rows.filter((row) => (row.Profit_INR ?? 0) > 0).length;
  const items = [
    ["Farms in view", formatNumber(rows.length, 0), `${Math.round((rows.length / allRows.length) * 100)}% of dataset`],
    ["Avg yield", `${formatNumber(mean(rows, "Yield_Tonnes_Ha"), 2)} t/ha`, "Includes sugarcane"],
    ["Yield excl. cane", `${formatNumber(mean(withoutCane, "Yield_Tonnes_Ha"), 2)} t/ha`, "Field crops only"],
    ["Mean profit", formatINR(mean(rows, "Profit_INR")), `Median ${formatINR(median(rows, "Profit_INR"))}`],
    ["Avg rainfall", `${formatNumber(mean(rows, "Rainfall_mm"), 0)} mm`, `${formatNumber(mean(rows, "Avg_Temperature_C"), 1)} °C`],
    ["Profitable farms", `${formatNumber((profitable / Math.max(rows.length, 1)) * 100, 1)}%`, `Pest risk ${formatNumber(mean(rows, "Disease_Pest_Risk_pct"), 1)}%`],
  ];
  $("kpis").innerHTML = items
    .map(
      ([label, value, note]) =>
        `<article class="kpi"><span>${label}</span><strong>${value}</strong><em>${note}</em></article>`
    )
    .join("");
}

function renderSeasonChart(rows) {
  const seasons = ["Kharif", "Rabi", "Zaid"].filter((season) => rows.some((row) => row.Season === season));
  upsertChart("seasonChart", {
    type: "bar",
    data: {
      labels: seasons,
      datasets: [
        {
          label: "Yield (t/ha)",
          data: seasons.map((season) => mean(rows.filter((row) => row.Season === season), "Yield_Tonnes_Ha")),
          backgroundColor: seasons.map((season) => SEASON_COLORS[season]),
          yAxisID: "y",
        },
        {
          label: "Profit (₹ lakh)",
          data: seasons.map((season) => per(mean(rows.filter((row) => row.Season === season), "Profit_INR"), 1e5)),
          type: "line",
          borderColor: "#c8e38a",
          backgroundColor: "rgba(200, 227, 138, 0.15)",
          tension: 0.3,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#eef6e4" } } },
      scales: {
        y: { title: { display: true, text: "t/ha" } },
        y1: { position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "₹ lakh" } },
      },
    },
  });
}

function renderMixChart(rows) {
  const seasons = ["Kharif", "Rabi", "Zaid"];
  const counts = seasons.map((season) => rows.filter((row) => row.Season === season).length);
  upsertChart("mixChart", {
    type: "doughnut",
    data: {
      labels: seasons,
      datasets: [{ data: counts, backgroundColor: seasons.map((season) => SEASON_COLORS[season]) }],
    },
    options: { plugins: { legend: { position: "bottom" } } },
  });
}

function renderClimateChart(rows) {
  const seasons = SEASONS.filter((season) => rows.some((row) => row.Season === season));
  const metrics = [
    ["Rainfall", "Rainfall_mm", " mm", 0],
    ["Temperature", "Avg_Temperature_C", " °C", 1],
    ["Humidity", "Humidity_pct", "%", 1],
    ["Sunlight", "Sunlight_Hours_Day", " h/day", 1],
    ["Soil moisture", "Soil_Moisture_pct", "%", 1],
  ];
  const raw = Object.fromEntries(
    seasons.map((season) => [season, metrics.map((m) => mean(rows.filter((row) => row.Season === season), m[1]))])
  );
  // Each axis is scaled so the highest season = 100; tooltips show the real values.
  const max = metrics.map((_, i) => Math.max(...seasons.map((season) => raw[season][i] ?? 0)) || 1);
  upsertChart("climateChart", {
    type: "radar",
    data: {
      labels: metrics.map((m) => m[0]),
      datasets: seasons.map((season) => ({
        label: season,
        data: raw[season].map((v, i) => (v == null ? null : (v / max[i]) * 100)),
        borderColor: SEASON_COLORS[season],
        backgroundColor: SEASON_COLORS[season] + "33",
      })),
    },
    options: {
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const m = metrics[ctx.dataIndex];
              return `${ctx.dataset.label}: ${formatNumber(raw[ctx.dataset.label][ctx.dataIndex], m[3])}${m[2]}`;
            },
          },
        },
      },
      scales: { r: { min: 0, max: 100, ticks: { display: false } } },
    },
  });
}

function renderCropChart(rows) {
  const crops = unique(rows, "Crop");
  const seasons = ["Kharif", "Rabi", "Zaid"];
  upsertChart("cropChart", {
    type: "bar",
    data: {
      labels: crops,
      datasets: seasons.map((season) => ({
        label: season,
        data: crops.map((crop) => mean(rows.filter((row) => row.Crop === crop && row.Season === season), "Yield_Tonnes_Ha")),
        backgroundColor: SEASON_COLORS[season],
      })),
    },
    options: {
      responsive: true,
      scales: { x: { stacked: false }, y: { title: { display: true, text: "t/ha" } } },
    },
  });
}

function renderIrrigationChart(rows) {
  rows = rows.filter((row) => row.Crop !== "Sugarcane");
  const methods = unique(rows, "Irrigation_Method");
  const seasons = ["Kharif", "Rabi", "Zaid"];
  upsertChart("irrigationChart", {
    type: "bar",
    data: {
      labels: methods,
      datasets: seasons.map((season) => ({
        label: season,
        data: methods.map((method) =>
          mean(rows.filter((row) => row.Irrigation_Method === method && row.Season === season), "Yield_Tonnes_Ha")
        ),
        backgroundColor: SEASON_COLORS[season],
      })),
    },
    options: { indexAxis: "y", scales: { x: { title: { display: true, text: "t/ha" } } } },
  });
}

function renderStateChart(rows) {
  const byState = groupMean(rows, "State", "Profit_INR");
  const labels = Object.keys(byState).sort((a, b) => byState[b] - byState[a]);
  upsertChart("stateChart", {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Mean profit (INR)",
          data: labels.map((label) => byState[label]),
          backgroundColor: labels.map((label) => (byState[label] >= 0 ? "#6fcf6a" : "#ff8a7a")),
        },
      ],
    },
    options: { indexAxis: "y" },
  });
}

function renderCropProfitChart(rows) {
  const byCrop = groupMean(rows, "Crop", "Profit_INR");
  const labels = Object.keys(byCrop).sort((a, b) => byCrop[b] - byCrop[a]);
  upsertChart("cropProfitChart", {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Mean profit (₹ lakh)",
          data: labels.map((label) => byCrop[label] / 1e5),
          backgroundColor: labels.map((label) => (byCrop[label] >= 0 ? "#6fcf6a" : "#ff8a7a")),
        },
      ],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { title: { display: true, text: "₹ lakh" } } } },
  });
}

function renderScatter(rows) {
  const eligible = rows.filter((row) => row.Rainfall_mm !== null && row.Yield_Tonnes_Ha !== null);
  const step = Math.max(1, Math.ceil(eligible.length / 500));
  const sample = eligible.filter((_, i) => i % step === 0);
  upsertChart("scatterChart", {
    type: "scatter",
    data: {
      datasets: ["Kharif", "Rabi", "Zaid"].map((season) => ({
        label: season,
        data: sample
          .filter((row) => row.Season === season)
          .map((row) => ({ x: row.Rainfall_mm, y: row.Yield_Tonnes_Ha })),
        backgroundColor: SEASON_COLORS[season],
      })),
    },
    options: {
      scales: {
        x: { title: { display: true, text: "Rainfall (mm)" } },
        y: { title: { display: true, text: "Yield (t/ha)" } },
      },
    },
  });
}

function renderResourceChart(rows) {
  const seasons = ["Kharif", "Rabi", "Zaid"];
  upsertChart("resourceChart", {
    type: "bar",
    data: {
      labels: seasons,
      datasets: [
        {
          label: "Fertilizer (kg/ha)",
          data: seasons.map((season) => mean(rows.filter((row) => row.Season === season), "Fertilizer_kg_ha")),
          backgroundColor: "#8fd18b",
        },
        {
          label: "Water (m³ / 100)",
          data: seasons.map((season) => per(mean(rows.filter((row) => row.Season === season), "Water_Used_m3"), 100)),
          backgroundColor: "#6eb5ff",
        },
        {
          label: "Pest/disease risk (%)",
          data: seasons.map((season) => mean(rows.filter((row) => row.Season === season), "Disease_Pest_Risk_pct")),
          backgroundColor: "#f0b429",
        },
      ],
    },
  });
}

function renderInsights(rows) {
  if (!rows.length) {
    $("insights").innerHTML = "<li>No farms match the current filters.</li>";
    return;
  }
  const seasons = SEASONS.filter((season) => rows.some((row) => row.Season === season));
  const stats = seasons.map((season) => {
    const list = rows.filter((row) => row.Season === season);
    return {
      season,
      n: list.length,
      meanProfit: mean(list, "Profit_INR"),
      medProfit: median(list, "Profit_INR"),
      share: (list.filter((row) => (row.Profit_INR ?? 0) > 0).length / list.length) * 100,
      pest: mean(list, "Disease_Pest_Risk_pct"),
      rain: mean(list, "Rainfall_mm"),
    };
  });
  const share = (rows.filter((row) => (row.Profit_INR ?? 0) > 0).length / rows.length) * 100;
  const notes = [
    `${rows.length.toLocaleString("en-IN")} farm records in view; ${formatNumber(share, 1)}% are profitable (mean profit ${formatINR(mean(rows, "Profit_INR"))}, median ${formatINR(median(rows, "Profit_INR"))}).`,
  ];

  if (stats.length > 1) {
    const ranked = [...stats].sort((a, b) => b.meanProfit - a.meanProfit);
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    notes.push(
      `${best.season} has the highest mean profit (${formatINR(best.meanProfit)}, ${formatNumber(best.share, 1)}% of farms profitable). ${worst.season} has the lowest (${formatINR(worst.meanProfit)}, ${formatNumber(worst.share, 1)}% profitable).`
    );
    stats
      .filter((s) => s.meanProfit > 0 && s.medProfit < 0)
      .forEach((s) =>
        notes.push(
          `${s.season} looks profitable on average (${formatINR(s.meanProfit)}) but its median is ${formatINR(s.medProfit)}, so most farms lose money and a few high earners lift the mean.`
        )
      );
    const pest = [...stats].sort((a, b) => b.pest - a.pest)[0];
    notes.push(`${pest.season} has the highest pest/disease risk (${formatNumber(pest.pest, 1)}%) and averages ${formatNumber(pest.rain, 0)} mm of rainfall.`);
    const small = [...stats].sort((a, b) => a.n - b.n)[0];
    if (small.n < rows.length * 0.25) {
      notes.push(`${small.season} has only ${small.n.toLocaleString("en-IN")} records (${formatNumber((small.n / rows.length) * 100, 0)}% of this view), so read its averages with care.`);
    }
  }

  const field = rows.filter((row) => row.Crop !== "Sugarcane");
  const bestMethod = (list) =>
    unique(list, "Irrigation_Method")
      .map((method) => [method, mean(list.filter((row) => row.Irrigation_Method === method), "Yield_Tonnes_Ha")])
      .filter((entry) => entry[1] !== null)
      .sort((a, b) => b[1] - a[1])[0];
  const overall = bestMethod(field);
  if (overall) {
    const bySeason = seasons
      .map((season) => {
        const b = bestMethod(field.filter((row) => row.Season === season));
        return b ? `${season}: ${b[0]} (${formatNumber(b[1], 2)} t/ha)` : null;
      })
      .filter(Boolean);
    notes.push(
      `Excluding sugarcane, ${overall[0]} gives the highest average yield (${formatNumber(overall[1], 2)} t/ha). Best method by season: ${bySeason.join(", ")}.`
    );
  }

  const byCrop = groupMean(rows, "Crop", "Profit_INR");
  const crops = Object.keys(byCrop).sort((a, b) => byCrop[b] - byCrop[a]);
  if (crops.length >= 4) {
    const top = crops.slice(0, 2).map((c) => `${c} (${formatINR(byCrop[c])})`).join(" and ");
    const low = crops.slice(-2).map((c) => `${c} (${formatINR(byCrop[c])})`).join(" and ");
    notes.push(`Most profitable crops by mean profit: ${top}. Weakest: ${low}.`);
  }

  if (rows.some((row) => row.Crop === "Sugarcane") && field.length) {
    notes.push(
      `Sugarcane averages ${formatNumber(mean(rows.filter((row) => row.Crop === "Sugarcane"), "Yield_Tonnes_Ha"), 1)} t/ha against ${formatNumber(mean(field, "Yield_Tonnes_Ha"), 2)} t/ha for other crops, so compare crops separately before ranking seasons by yield.`
    );
  }
  $("insights").innerHTML = notes.map((note) => `<li>${note}</li>`).join("");
}

function renderTable(rows) {
  const query = $("search").value.trim().toLowerCase();
  const filtered = rows.filter((row) =>
    `${row.Farm_ID} ${row.State} ${row.Crop} ${row.Season} ${row.Irrigation_Method}`
      .toLowerCase()
      .includes(query)
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (page > pages) page = pages;
  const start = (page - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);
  $("tableBody").innerHTML = slice
    .map(
      (row) => `<tr>
        <td>${row.Farm_ID}</td>
        <td>${row.State}</td>
        <td>${row.Crop}</td>
        <td>${row.Season}</td>
        <td>${formatNumber(row.Farm_Area_Hectares, 2)}</td>
        <td>${row.Yield_Tonnes_Ha == null ? "–" : formatNumber(row.Yield_Tonnes_Ha, 2)}</td>
        <td>${row.Profit_INR == null ? "–" : formatINR(row.Profit_INR)}</td>
        <td>${row.Rainfall_mm == null ? "–" : formatNumber(row.Rainfall_mm, 0)}</td>
        <td>${row.Irrigation_Method}</td>
      </tr>`
    )
    .join("");
  $("tableMeta").textContent = `${filtered.length.toLocaleString("en-IN")} matching rows`;
  $("pageInfo").textContent = `Page ${page} of ${pages}`;
}

function refresh() {
  const rows = currentRows();
  $("subtitle").textContent = `${rows.length.toLocaleString("en-IN")} farms after filters · source CSV loaded in the browser`;
  renderKpis(rows);
  renderSeasonChart(rows);
  renderMixChart(rows);
  renderClimateChart(rows);
  renderCropChart(rows);
  renderIrrigationChart(rows);
  renderStateChart(rows);
  renderCropProfitChart(rows);
  renderScatter(rows);
  renderResourceChart(rows);
  renderInsights(rows);
  renderTable(rows);
}

async function init() {
  chartDefaults();
  $("status").textContent = "Loading CSV";
  const response = await fetch("data/seasonal_agriculture_performance_dataset.csv");
  if (!response.ok) throw new Error("Could not load dataset. Serve this folder over HTTP, not as a raw file.");
  allRows = parseCSV(await response.text());
  fillSelect($("season"), unique(allRows, "Season"), true);
  fillSelect($("state"), unique(allRows, "State"));
  fillSelect($("crop"), unique(allRows, "Crop"));
  fillSelect($("irrigation"), unique(allRows, "Irrigation_Method"));
  ["season", "state", "crop", "irrigation"].forEach((id) => $(id).addEventListener("change", () => { page = 1; refresh(); }));
  $("search").addEventListener("input", () => { page = 1; renderTable(currentRows()); });
  $("reset").addEventListener("click", () => {
    fillSelect($("season"), unique(allRows, "Season"), true);
    $("state").value = "";
    $("crop").value = "";
    $("irrigation").value = "";
    $("search").value = "";
    page = 1;
    refresh();
  });
  $("prevPage").addEventListener("click", () => { page = Math.max(1, page - 1); renderTable(currentRows()); });
  $("nextPage").addEventListener("click", () => { page += 1; renderTable(currentRows()); });
  $("status").textContent = `${allRows.length.toLocaleString("en-IN")} records`;
  refresh();
}

init().catch((error) => {
  $("status").textContent = "Load failed";
  $("subtitle").textContent = error.message;
});
