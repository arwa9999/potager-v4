/* =====================================================
   🌱 POTAGER — APP.JS VERSION STABLE FINALE
   ===================================================== */

import { syncSection, loadSection } from "./firebase.js";

/* =====================================================
   ===  VARIABLES GLOBALES
   ===================================================== */

let state = { plots: [] };
let currentId = null;

let companions = {};
let cultures = {};
let families = {};

/* =====================================================
   ===  UTILITAIRES DOM
   ===================================================== */

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* =====================================================
   ===  remplir les familles
   ===================================================== */
function populateFamilySelect() {
  const select = document.getElementById("family");
  const rotSelect = document.getElementById("rot-family");
  if (!select || !families) return;

  select.innerHTML = '<option value="">--</option>';
  if (rotSelect) rotSelect.innerHTML = '<option value="">Toutes</option>';

  Object.keys(families).forEach(key => {
    const label = families[key].fr || key;   // 👈 ici la correction

    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = label;
    select.appendChild(opt);

    if (rotSelect) {
      const opt2 = opt.cloneNode(true);
      rotSelect.appendChild(opt2);
    }
  });
}
/* =====================================================
les cultures
   ===================================================== */
function populateCultureSelect() {
  const select = document.getElementById("culture");
  if (!select || !cultures) return;

  select.innerHTML = '<option value="">-- Choisir --</option>';

  Object.keys(cultures).forEach(key => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = cultures[key].fr || key;
    select.appendChild(option);
  });
}
function populateActionSelect() {
  const select = document.getElementById("action");
  const filterSelect = document.getElementById("f-action");
  if (!select) return;

  const actions = ["Semis", "Plantation", "Récolte", "Arrachage", "Engrais"];

  select.innerHTML = '<option value="">-- Choisir --</option>';
  if (filterSelect) filterSelect.innerHTML = '<option value="">Toutes</option>';

  actions.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a;
    opt.textContent = a;
    select.appendChild(opt);

    if (filterSelect) {
      const opt2 = opt.cloneNode(true);
      filterSelect.appendChild(opt2);
    }
  });
}
/* =====================================================
   ===  compagnonnage
   ===================================================== */
function updateCompanions(cultureKey) {
  const div = document.getElementById("companions");
  if (!div || !companions[cultureKey]) {
    div.innerHTML = "";
    return;
  }

  const data = companions[cultureKey];

  div.innerHTML = `
    <div style="margin-top:10px">
      <strong>🌿 Amies :</strong> ${(data.good || []).join(", ")}<br>
      <strong>⚠️ Ennemies :</strong> ${(data.bad || []).join(", ")}
    </div>
  `;
}

/* =====================================================
   ===  NUMÉROS DES PARCELLES (VERSION SIMPLE ET STABLE)
   ===================================================== */

function ensureTitlesAndLabels() {
  const svg = document.querySelector("svg");
  const garden = document.getElementById("garden");
  if (!svg || !garden) return;

  garden.querySelectorAll("text.plot-label").forEach(el => el.remove());

  const rects = garden.querySelectorAll("rect.plot");

  rects.forEach(rect => {
    const id = rect.dataset.id;
    if (!id) return;

    const bbox = rect.getBBox();

    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;

    const pt = svg.createSVGPoint();
    pt.x = cx;
    pt.y = cy;

    // matrice du rectangle
    const rectMatrix = rect.getCTM();

    // matrice du garden
    const gardenMatrix = garden.getCTM();

    // on neutralise la matrice du parent
    const relativeMatrix = gardenMatrix.inverse().multiply(rectMatrix);

    const finalPoint = pt.matrixTransform(relativeMatrix);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("class", "plot-label");
    label.setAttribute("x", finalPoint.x);
    label.setAttribute("y", finalPoint.y);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "central");
    label.setAttribute("font-size", 14);
    label.textContent = id;

    garden.appendChild(label);
  });
}
/* =====================================================
   ===  COLORATION PAR RÉCENCE
   ===================================================== */

function applyRecencyColors() {
  const plots = state.plots || [];

  document.querySelectorAll('#garden rect.plot').forEach(rect => {
    const id = +rect.dataset.id;
    const plot = plots.find(p => p.id === id);

    if (!plot || !plot.history?.length) {
      rect.setAttribute("fill", "#bfe3b4");
      return;
    }

    const last = plot.history[0];
    const days = (Date.now() - new Date(last.date)) / 86400000;

    if (days < 45) rect.setAttribute("fill", "#a5d6a7");
    else if (days < 120) rect.setAttribute("fill", "#ffecb3");
    else rect.setAttribute("fill", "#ffcdd2");
  });
}

/* =====================================================
   ===  HISTORIQUE
   ===================================================== */

function renderHistory(id) {
  const plot = state.plots.find(p => p.id === id);
  const div = $('#history');
  if (!div) return;

  if (!plot || !plot.history?.length) {
    div.innerHTML = "—";
    return;
  }

  div.innerHTML = plot.history.map(h =>
    `<div class="entry">
       <strong>${h.date}</strong><br>
       ${h.action} — ${h.culture || ''}
     </div>`
  ).join('');
}

/* =====================================================
   ===  FIREBASE SYNC
   ===================================================== */

async function loadParcellesFromCloud() {
  try {
    const remote = await loadSection("parcelles");

    if (remote && typeof remote === "object" && Object.keys(remote).length) {
      state = remote;
      localStorage.setItem("potager_v2", JSON.stringify(remote));
    } else {
      const localRaw = localStorage.getItem("potager_v2");
      state = localRaw ? JSON.parse(localRaw) : { plots: [] };
    }
  } catch {
    const localRaw = localStorage.getItem("potager_v2");
    state = localRaw ? JSON.parse(localRaw) : { plots: [] };
  }
}

async function saveParcellesToCloud() {
  await syncSection("parcelles", state);
}

/* =====================================================
   ===  CHARGEMENT DES DONNÉES STATIQUES
   ===================================================== */

async function loadStaticData() {
  companions = await fetch("./companions_bilingual.json").then(r => r.json());
  cultures = await fetch("./cultDict.json").then(r => r.json());
  families = await fetch("./families.json").then(r => r.json());
}

/* =====================================================
   ===  AJOUT D’UNE ACTION
   ===================================================== */

function setupSaveButton() {
  $('#save')?.addEventListener('click', async () => {
    const date = $('#date').value || new Date().toISOString().slice(0, 10);
    const action = $('#action').value;
    const culture = $('#culture').value;

    if (!action || !culture || currentId == null) return;

    let plot = state.plots.find(p => p.id === currentId);
    if (!plot) {
      plot = { id: currentId, history: [] };
      state.plots.push(plot);
    }

    plot.history.unshift({ date, action, culture });

    localStorage.setItem("potager_v2", JSON.stringify(state));

    renderHistory(currentId);
    applyRecencyColors();
    await saveParcellesToCloud();
  });
}

/* =====================================================
   ===  CLIC SUR PARCELLES
   ===================================================== */

function setupPlotClicks() {
  $$('#garden rect.plot').forEach(plot => {
    plot.addEventListener('click', () => {
      currentId = +plot.dataset.id;

      $('#plot-title').textContent = `Parcelle ${currentId}`;
      $('#info-panel').classList.remove('hidden');

      renderHistory(currentId);
    });
  });
}

/* =====================================================
   ===  INITIALISATION
   ===================================================== */

async function init() {
  await loadStaticData();
  await loadParcellesFromCloud();

  populateActionSelect();
  populateCultureSelect();
  populateFamilySelect();

  ensureTitlesAndLabels();
  applyRecencyColors();
  setupPlotClicks();
  setupSaveButton();

  document.getElementById("culture")?.addEventListener("change", e => {
    updateCompanions(e.target.value);
  });

  console.log("✅ Potager initialisé proprement");
}
document.addEventListener("DOMContentLoaded", init);
