/* Potager FR/NL — logique app (v5.2 - Firebase sync bidirectionnelle) */
import { syncSection, loadSection } from "./firebase.js";

/* =====================================================
   ===  Vérification structure Firebase au démarrage  ===
   ===================================================== */
(async function ensureBaseStructure() {
  try {
    const parcelles = await loadSection("parcelles");
    if (!parcelles || typeof parcelles !== "object" || Array.isArray(parcelles)) {
      console.log("🌱 Création d'une section 'parcelles' vide dans Firebase");
      await syncSection("parcelles", {});
    } else {
      console.log("✅ Section 'parcelles' détectée dans Firebase");
    }

    const stockData = await loadSection("stock");
    if (!stockData || !Array.isArray(stockData)) {
      console.log("📦 Création d'une section 'stock' vide dans Firebase");
      await syncSection("stock", []);
    }
  } catch (e) {
    console.warn("⚠️ Impossible de vérifier la structure Firebase :", e);
  }
})();
function ensureTitlesAndLabels() {
  console.group("🔍 ensureTitlesAndLabels() — version repère écran (finale)");
  try {
    const svg = document.querySelector("svg");
    const garden = document.getElementById("garden");
    const rects = garden.querySelectorAll("rect.plot");

    console.log(`➡️ ${rects.length} parcelles détectées`);
    garden.querySelectorAll("text.plot-label").forEach(el => el.remove());

    const svgPoint = svg.createSVGPoint();

    rects.forEach(rect => {
      const id = +(rect.dataset.id || rect.getAttribute("data-id"));
      if (!Number.isFinite(id)) return;

      const name = (rect.dataset.name || "").trim();

      // --- Création / mise à jour du <title> ---
      let tit = rect.querySelector("title");
      if (!tit) {
        tit = document.createElementNS("http://www.w3.org/2000/svg", "title");
        rect.appendChild(tit);
      }
      tit.textContent = name ? `Parcelle ${id} — ${name}` : `Parcelle ${id}`;

      // --- Calcul centre visuel via transformation complète ---
      const bbox = rect.getBBox();
      const ctm = rect.getScreenCTM(); // 🧠 coordonnées réelles à l’écran
      svgPoint.x = bbox.x + bbox.width / 2;
      svgPoint.y = bbox.y + bbox.height / 2;
      const screenPt = svgPoint.matrixTransform(ctm);

      // Convertit les coordonnées écran -> coordonnées SVG globales
      const globalCTM = svg.getScreenCTM().inverse();
      const svgPt = svgPoint.matrixTransform(globalCTM);
      svgPt.x = screenPt.x * globalCTM.a + screenPt.y * globalCTM.c + globalCTM.e;
      svgPt.y = screenPt.x * globalCTM.b + screenPt.y * globalCTM.d + globalCTM.f;

      const cx = svgPt.x;
      const cy = svgPt.y;

      const fs = Math.max(8, Math.min(bbox.height * 1.2, bbox.width * 0.6, 18));

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("class", "plot-label");
      label.setAttribute("data-for", id);
      label.setAttribute("x", cx);
      label.setAttribute("y", cy);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "central");
      label.setAttribute("font-size", fs.toFixed(1));
      label.setAttribute(
        "style",
        "fill:#1b1b1b;font-weight:600;paint-order:stroke;stroke:#fff;stroke-width:2;pointer-events:none;user-select:none"
      );
      label.textContent = name || id;
      garden.appendChild(label);
    });

    console.log("🎯 Labels placés selon les coordonnées écran (aucun décalage).");
  } catch (err) {
    console.error("💥 Erreur dans ensureTitlesAndLabels():", err);
  }
  console.groupEnd();
}



/* =====================================================
   ===     Logique principale du potager (app.js)     ===
   ===================================================== */
(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  /* === État global === */
  let state = { plots: [] };
  let currentId = null;

  /* === Chargement Firebase → LocalStorage au démarrage === */
  async function loadParcellesFromCloud() {
    try {
      const remote = await loadSection("parcelles");
      if (remote && typeof remote === "object" && !Array.isArray(remote) && Object.keys(remote).length > 0) {
        console.log("☁️ Parcelles importées depuis Firebase");
        localStorage.setItem("potager_v2", JSON.stringify(remote));
        state = remote;
      } else {
        console.warn("⚠️ Aucune donnée de parcelles trouvée sur Firebase, utilisation du localStorage");
        const localRaw = localStorage.getItem("potager_v2");
        state = localRaw ? JSON.parse(localRaw) : { plots: [] };
      }
    } catch (e) {
      console.error("⚠️ Erreur de chargement des parcelles Firebase :", e);
      const localRaw = localStorage.getItem("potager_v2");
      state = localRaw ? JSON.parse(localRaw) : { plots: [] };
    }
  }


  /* === Sauvegarde LocalStorage → Firebase === */
  async function saveParcellesToCloud() {
    try {
      await syncSection("parcelles", state);
      console.log("✅ Parcelles sauvegardées sur Firebase");
    } catch (err) {
      console.warn("⚠️ Erreur de sauvegarde Firebase :", err);
    }
  }

  /* === Exemple d’appel (recopie ton code historique ici) === */
  function renderHistory(id) {
    const plot = (state.plots || []).find(p => p.id === id);
    const div = document.getElementById("history");
    if (!plot || !plot.history?.length) {
      div.innerHTML = "—";
      return;
    }
    div.innerHTML = plot.history.map(h =>
      `<div class='entry'><strong>${h.date}</strong> — ${h.action} — ${h.culture || ''}</div>`
    ).join('');
  }

  /* === Exemple d’événement === */
  $('#save')?.addEventListener('click', async () => {
    const d = $('#date').value || new Date().toISOString().slice(0, 10);
    const a = $('#action').value;
    const c = $('#culture').value;
    if (!a || !c || currentId == null) return;

    const p = state.plots.find(x => x.id === currentId) || { id: currentId, history: [] };
    p.history.unshift({ date: d, action: a, culture: c });
    if (!state.plots.some(x => x.id === currentId)) state.plots.push(p);

    localStorage.setItem("potager_v2", JSON.stringify(state));
    renderHistory(currentId);
    await saveParcellesToCloud();
  });

  /* === Chargement initial === */
(async function init() {
  await loadParcellesFromCloud();

  // === 1. Reconstitue les étiquettes et tooltips des parcelles ===
  if (typeof ensureTitlesAndLabels === "function") ensureTitlesAndLabels();
  else if (window.ensureTitlesAndLabels) window.ensureTitlesAndLabels();

  // === 2. Rafraîchit les couleurs selon la récence ===
  if (typeof applyRecencyColors === "function") applyRecencyColors();
  else if (window.applyRecencyColors) window.applyRecencyColors();

  // === 3. Reconnecte les événements de clic sur les parcelles ===
  $$('#garden rect.plot').forEach(plot => {
    plot.addEventListener('click', () => {
      currentId = +(plot.dataset.id || plot.getAttribute('data-id'));
      const titleEl = $('#plot-title');
      const panel = $('#info-panel');
      if (titleEl) titleEl.textContent = `Parcelle ${currentId}`;
      if (panel) panel.classList.remove('hidden');
      if (typeof renderHistory === "function") renderHistory(currentId);
    });
  });

  // === 4. Rendu initial si déjà une parcelle sélectionnée ===
  if (currentId != null && typeof renderHistory === "function") renderHistory(currentId);

  console.log("✅ App.js initialisé avec données :", state);
})();
// --- Expose les fonctions clés au scope global ---
window.ensureTitlesAndLabels = ensureTitlesAndLabels;
window.applyRecencyColors    = applyRecencyColors;
window.renderHistory         = renderHistory;
window.state                 = state; // utile pour debug ou sync future
// --- Correction affichage des numéros de parcelles ---
window.addEventListener('load', () => {
  if (typeof ensureTitlesAndLabels === "function") {
    console.log("🪴 Recréation des labels de parcelles…");
    ensureTitlesAndLabels();
  }
  if (typeof applyRecencyColors === "function") {
    applyRecencyColors();
  }
});

})();
