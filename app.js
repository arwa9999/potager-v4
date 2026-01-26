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
  console.group("🔍 ensureTitlesAndLabels()");
  try {
    const rects = document.querySelectorAll('#garden rect.plot, svg rect.plot');
    console.log(`➡️ ${rects.length} parcelles détectées`);

    if (!rects.length) {
      console.warn("⚠️ Aucune parcelle (#garden rect.plot) trouvée dans le DOM !");
      console.groupEnd();
      return;
    }

    rects.forEach(rect => {
      const id = +(rect.dataset.id || rect.getAttribute('data-id'));
      if (!Number.isFinite(id)) {
        console.warn("⛔ Parcelle sans ID valide :", rect);
        return;
      }

      // Supprimer anciens labels pour éviter doublons
      const parent = rect.parentNode;
      parent.querySelectorAll(`text.plot-label[data-for="${id}"]`).forEach(el => el.remove());

      // Créer ou mettre à jour le <title>
      let tit = rect.querySelector('title');
      if (!tit) {
        tit = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        rect.appendChild(tit);
        console.log(`🆕 Ajout title pour parcelle ${id}`);
      }

      const name = (rect.dataset.name || '').trim();
      tit.textContent = name ? `Parcelle ${id} — ${name}` : `Parcelle ${id}`;

      // Calcul du centre
      const x = +rect.getAttribute('x') || 0;
      const y = +rect.getAttribute('y') || 0;
      const w = +rect.getAttribute('width') || 0;
      const h = +rect.getAttribute('height') || 0;
      const cx = x + w / 2;
      const cy = y + h / 2;

      // Taille de police proportionnelle
      const fs = Math.max(9, Math.min(h * 0.6, w * 0.5, 16));

      // Création du label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('class', 'plot-label');
      label.setAttribute('data-for', String(id));
      label.setAttribute('x', cx);
      label.setAttribute('y', cy);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'central');
      label.setAttribute('font-size', fs.toFixed(1));
      label.setAttribute('style', 'fill:#222;paint-order:stroke;stroke:#fff;stroke-width:1;pointer-events:none');
      label.textContent = name || id;

      parent.appendChild(label);
      console.log(`✅ Label créé pour parcelle ${id}`);
    });

    console.log("🎯 Labels terminés.");
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
