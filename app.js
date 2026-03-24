/* =====================================================
   🌱 POTAGER — VERSION STABLE COLLABORATIVE
   ===================================================== */

/* import { listenSection, syncSection } from "./firebase.js";
*/
import { listenSection, syncSection, loadSection } from "./firebase.js";
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

  if (currentId != null) {
    renderHistory(currentId);
    showCompanionsForCurrentPlot(currentId);
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
async function loadInitialState() {
  const data = await loadSection("parcelles");
  state = data || { plots: [] };
}

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

    if ($("#used-variety")) $("#used-variety").value = "";
    if ($("#used-qty")) $("#used-qty").value = 1;

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
function getCurrentCultures(plot) {
  if (!plot || !plot.history?.length) return [];

  const active = new Set();

  // On lit de la plus ancienne à la plus récente
  const orderedHistory = [...plot.history].reverse();

  for (const entry of orderedHistory) {
    const action = entry.action;
    const culture = entry.culture;

    if (!culture) continue;

    if (action === "Semis" || action === "Plantation") {
      active.add(culture);
    }

    if (action === "Arrachage") {
      active.delete(culture);
    }
  }

  return [...active];
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
  const div = document.getElementById("companions");

  if (!div) return;

  if (!plot) {
    div.innerHTML = "<em>Parcelle introuvable</em>";
    return;
  }

  const cultureKeys = getCurrentCultures(plot);

  if (!cultureKeys.length) {
    div.innerHTML = "<em>Parcelle vide</em>";
    return;
  }

  const cultureObjects = cultureKeys
    .map(key => companions.find(c => c.key === key))
    .filter(Boolean);

  if (!cultureObjects.length) {
    div.innerHTML = "<em>Aucune donnée compagnonnage</em>";
    return;
  }

  const cultureNames = cultureObjects.map(c => c[currentLang] || c.fr || c.key);

  const allGood = new Set();
  const allBad = new Set();

  cultureObjects.forEach(cultureObj => {
    (cultureObj.good || []).forEach(k => allGood.add(k));
    (cultureObj.bad || []).forEach(k => allBad.add(k));
  });

  // On retire les cultures déjà présentes de la suggestion
  cultureKeys.forEach(k => {
    allGood.delete(k);
    allBad.delete(k);
  });

  const goodList = [...allGood]
    .map(k => {
      const item = companions.find(c => c.key === k);
      return item ? (item[currentLang] || item.fr || k) : k;
    })
    .sort()
    .join(", ");

  const badList = [...allBad]
    .map(k => {
      const item = companions.find(c => c.key === k);
      return item ? (item[currentLang] || item.fr || k) : k;
    })
    .sort()
    .join(", ");

  div.innerHTML = `
    <div style="margin-top:10px">
      <strong>🌿 Cultures en place :</strong><br>${cultureNames.join(", ")}<br><br>
      <strong>🌱 Bon compagnonnage possible :</strong><br>${goodList || "—"}<br><br>
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
function updateStockFromAction(action, cultureKey) {
  if (!window.StockAPI || !cultureKey) return;

  // Actions qui consomment potentiellement du stock
  const consumesStock = action === "Semis" || action === "Plantation";
  if (!consumesStock) return;

  const allStock = window.StockAPI.getAll?.() || [];

  const matchingItems = allStock.filter(item => item.cultureKey === cultureKey);

  if (!matchingItems.length) {
    console.log(`ℹ️ Aucun stock trouvé pour la culture : ${cultureKey}`);
    return;
  }

  // Priorité : semence pour semis, plant pour plantation
  let chosen = null;

  if (action === "Semis") {
    chosen = matchingItems.find(item => item.type === "semence" && item.qty > 0);
  }

  if (action === "Plantation") {
    chosen = matchingItems.find(item => item.type === "plant" && item.qty > 0)
      || matchingItems.find(item => item.type === "bulbe" && item.qty > 0);
  }

  // Fallback : premier article avec stock > 0
  if (!chosen) {
    chosen = matchingItems.find(item => item.qty > 0);
  }

  if (!chosen) {
    console.warn(`⚠️ Stock trouvé pour ${cultureKey}, mais quantité nulle`);
    return;
  }

  const success = window.StockAPI.consume?.({ id: chosen.id }, 1);

  if (success) {
    console.log(`📦 Stock mis à jour : -1 sur ${chosen.name || chosen.cultureKey}`);
  } else {
    console.warn(`⚠️ Impossible de décrémenter le stock pour ${cultureKey}`);
  }
}
function getMatchingStockItems(cultureKey, variety = "", action = "") {
  if (!window.StockAPI?.getAll || !cultureKey) return [];

  const allStock = window.StockAPI.getAll() || [];

  let items = allStock.filter(item => item.cultureKey === cultureKey);

  if (variety) {
    items = items.filter(item =>
      (item.variety || "").toLowerCase() === variety.toLowerCase()
    );
  }

  // Priorité selon action
  if (action === "Semis") {
    items.sort((a, b) => {
      if (a.type === "semence" && b.type !== "semence") return -1;
      if (a.type !== "semence" && b.type === "semence") return 1;
      return 0;
    });
  }

  if (action === "Plantation") {
    items.sort((a, b) => {
      const rank = type =>
        type === "plant" ? 0 :
        type === "bulbe" ? 1 :
        type === "semence" ? 2 : 3;
      return rank(a.type) - rank(b.type);
    });
  }

  return items;
}

function updateStockFromAction(action, cultureKey, variety = "", qtyUsed = 1) {
  if (!window.StockAPI || !cultureKey) return true;

  const consumesStock = action === "Semis" || action === "Plantation";
  if (!consumesStock) return true;

  const qty = Math.max(0.01, Number(qtyUsed || 1));
  const matches = getMatchingStockItems(cultureKey, variety, action);

  if (!matches.length) {
    const proceed = confirm(
      `Aucun stock trouvé pour "${cultureKey}"` +
      (variety ? ` / variété "${variety}"` : "") +
      `. Continuer sans mettre à jour le stock ?`
    );
    return proceed;
  }

  const chosen = matches.find(item => item.qty >= qty) || matches[0];

  if (!chosen || chosen.qty < qty) {
    alert(
      `Stock insuffisant pour ${chosen?.name || cultureKey}.\n` +
      `Disponible : ${chosen?.qty || 0}\n` +
      `Demandé : ${qty}`
    );
    return false;
  }

  const success = window.StockAPI.consume({ id: chosen.id }, qty);

  if (!success) {
    alert("Impossible de mettre à jour le stock.");
    return false;
  }

  console.log(`📦 Stock mis à jour : -${qty} sur ${chosen.name || chosen.cultureKey}`);
  return true;
}

function setupSaveButton() {
  $("#save")?.addEventListener("click", async () => {
    const date = $("#date").value || new Date().toISOString().slice(0, 10);
    const action = $("#action").value;
    const culture = $("#culture").value;
    const family = $("#family")?.value || "";
    const usedVariety = $("#used-variety")?.value?.trim() || "";
    const usedQty = Number($("#used-qty")?.value || 1);

    if (!currentId || !action || !culture) {
      alert("Données incomplètes");
      return;
    }

    // 1) vérifier / décrémenter le stock si nécessaire
    const stockOk = updateStockFromAction(action, culture, usedVariety, usedQty);
    if (!stockOk) return;

    // 2) enregistrer dans l’historique parcelle
    let plot = state.plots.find(p => p.id == currentId);

    if (!plot) {
      plot = { id: Number(currentId), history: [] };
      state.plots.push(plot);
    }

    plot.history.unshift({
      date,
      action,
      culture,
      family,
      usedVariety,
      usedQty
    });

    await syncSection("parcelles", state);

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
      ? (cultureObj[currentLang] || cultureObj.fr || h.culture)
      : h.culture;

    const details = [];
    if (h.usedVariety) details.push(`variété : ${h.usedVariety}`);
    if (h.usedQty) details.push(`qté : ${h.usedQty}`);

    return `
      <div class="entry">
        <strong>${h.date}</strong><br>
        ${h.action} — ${cultureLabel}
        ${details.length ? `<br><small>${details.join(" • ")}</small>` : ""}
      </div>
    `;
  }).join("");
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
  try {
    await loadStaticData();
  } catch (err) {
    console.error("❌ Erreur loadStaticData :", err);
  }

  try {
    await loadInitialState();
  } catch (err) {
    console.error("❌ Erreur loadInitialState :", err);
    state = { plots: [] };
  }

  try {
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
  } catch (err) {
    console.error("❌ Erreur pendant init :", err);
  }
}

document.addEventListener("DOMContentLoaded", init);
