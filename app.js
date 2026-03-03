/* =====================================================
   🌱 POTAGER — VERSION STABLE CONSOLIDÉE
   ===================================================== */

import { syncSection, loadSection } from "./firebase.js";

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
const $$ = s => Array.from(document.querySelectorAll(s));

/* =====================================================
   === SELECTS DYNAMIQUES
   ===================================================== */

function populateCultureSelect() {
  const select = $("#culture");
  if (!select) return;

  select.innerHTML = '<option value="">--</option>';

  Object.keys(cultures).forEach(key => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = cultures[key][currentLang] || key;
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

function updateCompanions(cultureKey) {
  const div = $("#companions");
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

    const matrix = rect.getCTM();
    const finalPoint = pt.matrixTransform(matrix);

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
   === FIREBASE
   ===================================================== */

async function loadParcellesFromCloud() {
  const remote = await loadSection("parcelles");
  state = remote || { plots: [] };
}

async function saveParcellesToCloud() {
  await syncSection("parcelles", state);
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
  await loadParcellesFromCloud();

  populateCultureSelect();
  populateFamilySelect();
  populateActionSelect();
  applyTranslations();

  ensureTitlesAndLabels();

  $("#culture")?.addEventListener("change", e => {
    updateCompanions(e.target.value);
  });

  $("#lang-toggle")?.addEventListener("click", () => {
    currentLang = currentLang === "fr" ? "nl" : "fr";
    populateCultureSelect();
    populateFamilySelect();
    populateActionSelect();
    applyTranslations();
  });

  console.log("✅ Application stabilisée");
}

document.addEventListener("DOMContentLoaded", init);
