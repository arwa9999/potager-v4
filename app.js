/* =====================================================
   🌱 POTAGER — VERSION STABLE COLLABORATIVE
   ===================================================== */

import { listenSection, syncSection } from "./firebase.js";

/* =====================================================
   === VARIABLES GLOBALES
   ===================================================== */

let state = { plots: [] };
let currentId = null;
let currentLang = "fr";

let companions = {};
let cultures = {};
let families = {};

/* =====================================================
   === FIREBASE TEMPS RÉEL
   ===================================================== */

listenSection("parcelles", data => {
  state = data || { plots: [] };

  if (currentId) {
    renderHistory(currentId);
  }
});

/* =====================================================
   === I18N
   ===================================================== */

window.i18n = {
  header: { fr: "Plan du potager", nl: "Moestuinplan" },
  legend_recent: { fr: "Récent", nl: "Recent" },
  legend_mid: { fr: "Moyen", nl: "Gemiddeld" },
  legend_old: { fr: "Ancien", nl: "Oud" },
  panel_add: { fr: "+ Ajouter une action", nl: "+ Actie toevoegen" },
  save: { fr: "Enregistrer", nl: "Opslaan" },
  export: { fr: "Exporter l’historique (.json)", nl: "Geschiedenis exporteren (.json)" }
};

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (window.i18n[key]) {
      el.textContent = window.i18n[key][currentLang];
    }
  });
}

/* =====================================================
   === UTILITAIRES
   ===================================================== */

const $ = s => document.querySelector(s);

/* =====================================================
   === PANNEAU LATÉRAL / CLIC PARCELLES
   ===================================================== */
document.addEventListener("click", (e) => {
  const panel = $("#info-panel");
  if (!panel || panel.classList.contains("hidden")) return;

  const clickedInsidePanel = panel.contains(e.target);
  const clickedPlot = e.target.closest("#garden rect.plot");

  if (!clickedInsidePanel && !clickedPlot) {
    panel.classList.add("hidden");
    currentId = null;
  }
});

function setupEscapeClose() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      $("#info-panel")?.classList.add("hidden");
      currentId = null;
    }
  });
}

function setupCloseButton() {
  const btn = $("#close");
  const panel = $("#info-panel");

  if (!btn || !panel) {
    console.warn("⚠️ Bouton close ou panneau introuvable");
    return;
  }

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    panel.classList.add("hidden");
    currentId = null;

    if ($("#plot-title")) $("#plot-title").textContent = "";
    if ($("#history")) $("#history").innerHTML = "";

    if ($("#date")) $("#date").value = "";
    if ($("#action")) $("#action").value = "";
    if ($("#culture")) $("#culture").value = "";
    if ($("#family")) $("#family").value = "";
    if ($("#companions")) $("#companions").innerHTML = "";

    console.log("✅ Panneau fermé");
  });
}

function setupPlotClicks() {
  const garden = document.getElementById("garden");

  garden.addEventListener("click", e => {
    const rect = e.target.closest("rect.plot");
    if (!rect) return;

    currentId = rect.dataset.id;

    $("#plot-title").textContent = `Parcelle ${currentId}`;
    $("#info-panel").classList.remove("hidden");

    // Reset formulaire
    $("#date").value = "";
    $("#action").value = "";
    $("#culture").value = "";
    $("#family").value = "";
    $("#companions").innerHTML = "";

    renderHistory(currentId);
showCompanionsForCurrentPlot(currentId);
  });
}

/* =====================================================
   === HISTORIQUE
   ===================================================== */

function renderHistory(id) {
  const plot = state.plots.find(p => p.id == id);
  const div = document.getElementById("history");
  if (!div) return;

  if (!plot || !plot.history?.length) {
    div.innerHTML = "—";
    return;
  }

  div.innerHTML = plot.history.map(h => {

    const cultureObj = companions.find(c => c.key === h.culture);
    const cultureLabel = cultureObj
      ? cultureObj[currentLang]
      : h.culture;

    return `
      <div class="entry">
        <strong>${h.date}</strong><br>
        ${h.action} — ${cultureLabel}
      </div>
    `;

  }).join("");
}
/* =====================================================
   === SELECTS DYNAMIQUES
   ===================================================== */
function getCurrentCulture(plot) {
  if (!plot || !plot.history?.length) return null;

  for (let entry of plot.history) {
    if (entry.action === "Semis" || entry.action === "Plantation") {
      return entry.culture;
    }
    if (entry.action === "Arrachage") {
      return null;
    }
  }

  return null;
}

function populateCultureSelect() {
  const select = document.getElementById("culture");
  if (!select) return;

  select.innerHTML = '<option value="">--</option>';

  companions.forEach(item => {
    const opt = document.createElement("option");

    opt.value = item.key;          // 🔥 LA CLÉ TECHNIQUE
    opt.textContent = item[currentLang]; // 🌍 TEXTE AFFICHÉ

    select.appendChild(opt);
  });
}

function populateFamilySelect() {
  const select = $("#family");
  const rotSelect = $("#rot-family");
  if (!select) return;

  select.innerHTML = '<option value="">--</option>';
  if (rotSelect) rotSelect.innerHTML = '<option value="">--</option>';

  Object.keys(families).forEach(key => {
    const label = families[key][currentLang] || key;

    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = label;
    select.appendChild(opt);

    if (rotSelect) {
      rotSelect.appendChild(opt.cloneNode(true));
    }
  });
}

function populateActionSelect() {
  const select = $("#action");
  const filterSelect = $("#f-action");
  if (!select) return;

  const actions = {
    Semis: { fr: "Semis", nl: "Zaaien" },
    Plantation: { fr: "Plantation", nl: "Aanplanting" },
    Récolte: { fr: "Récolte", nl: "Oogst" },
    Arrachage: { fr: "Arrachage", nl: "Verwijderen" },
    Engrais: { fr: "Engrais", nl: "Bemesting" }
  };

  select.innerHTML = '<option value="">--</option>';
  if (filterSelect) filterSelect.innerHTML = '<option value="">--</option>';

  Object.keys(actions).forEach(key => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = actions[key][currentLang];
    select.appendChild(opt);

    if (filterSelect) {
      filterSelect.appendChild(opt.cloneNode(true));
    }
  });
}

/* =====================================================
   === COMPAGNONNAGE
   ===================================================== */
function showCompanionsForCurrentPlot(id) {

  const plot = state.plots.find(p => p.id == id);
  if (!plot) return;

  const cultureKey = getCurrentCulture(plot);
  const div = document.getElementById("companions");

  if (!cultureKey) {
    div.innerHTML = "<em>Parcelle vide</em>";
    return;
  }

  const cultureObj = companions.find(c => c.key === cultureKey);

  if (!cultureObj) {
    div.innerHTML = "<em>Aucune donnée compagnonnage</em>";
    return;
  }

  const goodList = (cultureObj.good || [])
    .map(k => {
      const item = companions.find(c => c.key === k);
      return item ? (item[currentLang] || k) : k;
    })
    .join(", ");

  const badList = (cultureObj.bad || [])
    .map(k => {
      const item = companions.find(c => c.key === k);
      return item ? (item[currentLang] || k) : k;
    })
    .join(", ");

  div.innerHTML = `
    <div style="margin-top:10px">
      <strong>🌿 Culture en place :</strong> ${cultureObj[currentLang]}<br><br>
      <strong>🌱 Bon compagnonnage :</strong><br>${goodList || "—"}<br><br>
      <strong>⚠️ À éviter :</strong><br>${badList || "—"}
    </div>
  `;
}

function updateCompanions(cultureKey) {
  const div = $("#companions");
  if (!div) return;

  const data = companions.find(c => c.key === cultureKey);

  if (!data) {
    div.innerHTML = "";
    return;
  }

  const goodList = (data.good || [])
    .map(k => {
      const item = companions.find(c => c.key === k);
      return item ? (item[currentLang] || item.fr || k) : k;
    })
    .join(", ");

  const badList = (data.bad || [])
    .map(k => {
      const item = companions.find(c => c.key === k);
      return item ? (item[currentLang] || item.fr || k) : k;
    })
    .join(", ");

  div.innerHTML = `
    <div style="margin-top:10px">
      <strong>🌿 Amies :</strong> ${goodList || "—"}<br>
      <strong>⚠️ Ennemies :</strong> ${badList || "—"}
    </div>
  `;
}

/* =====================================================
   === NUMÉROS PARCELLES
   ===================================================== */

function ensureTitlesAndLabels() {
  const svg = document.querySelector("svg");
  const garden = document.getElementById("garden");
  if (!svg || !garden) return;

  garden.querySelectorAll("text.plot-label").forEach(el => el.remove());

  garden.querySelectorAll("rect.plot").forEach(rect => {
    const id = rect.dataset.id;
    if (!id) return;

    const bbox = rect.getBBox();
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;

    const pt = svg.createSVGPoint();
    pt.x = cx;
    pt.y = cy;

    const rectMatrix = rect.getCTM();
    const gardenMatrix = garden.getCTM();
    const relativeMatrix = gardenMatrix.inverse().multiply(rectMatrix);
    const finalPoint = pt.matrixTransform(relativeMatrix);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("class", "plot-label");
    label.setAttribute("x", finalPoint.x);
    label.setAttribute("y", finalPoint.y);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "central");
    label.setAttribute("font-size", 14);
    label.setAttribute("pointer-events", "none");
    label.textContent = id;

    garden.appendChild(label);
  });
}

/* =====================================================
   === ENREGISTREMENT
   ===================================================== */

function setupSaveButton() {
  $("#save")?.addEventListener("click", async () => {

    const date = $("#date").value || new Date().toISOString().slice(0,10);
    const action = $("#action").value;
    const culture = $("#culture").value;

    if (!currentId || !action || !culture) {
      alert("Données incomplètes");
      return;
    }

    let plot = state.plots.find(p => p.id == currentId);

    if (!plot) {
      plot = { id: Number(currentId), history: [] };
      state.plots.push(plot);
    }

    plot.history.unshift({ date, action, culture });

    await syncSection("parcelles", state);

    renderHistory(currentId);

    console.log("💾 Action enregistrée");
  });
}

/* =====================================================
   === STATIC DATA
   ===================================================== */

async function loadStaticData() {
  companions = await fetch("./companions_bilingual.json").then(r => r.json());
  cultures = await fetch("./cultDict.json").then(r => r.json());
  families = await fetch("./families.json").then(r => r.json());
}

/* =====================================================
   === INITIALISATION
   ===================================================== */

async function init() {
  await loadStaticData();

  populateCultureSelect();
  populateFamilySelect();
  populateActionSelect();
  applyTranslations();
  setupCloseButton();
  setupEscapeClose();
  ensureTitlesAndLabels();
  setupPlotClicks();
  setupSaveButton();

  $("#culture")?.addEventListener("change", e => {
    updateCompanions(e.target.value);
  });

  document.getElementById("lang-toggle")?.addEventListener("click", () => {
  currentLang = currentLang === "fr" ? "nl" : "fr";

  populateCultureSelect();
  populateFamilySelect();
  populateActionSelect();
  applyTranslations();

  if (currentId) {
    renderHistory(currentId);
    showCompanionsForCurrentPlot(currentId);
  }
});

  console.log("✅ Application stabilisée (mode collaboratif)");
}

document.addEventListener("DOMContentLoaded", init);
