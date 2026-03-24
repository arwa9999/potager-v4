// stock.js — Gestion du stock de semences / plants / bulbes avec Firebase (v3)
import { syncSection, loadSection } from "./firebase.js";

(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const $ = s => document.querySelector(s);

    /* =========================================================
       === ÉLÉMENTS DOM
       ========================================================= */
    const panel = $("#stock-panel");
    const openBtn = $("#open-stock");
    const closeBtn = $("#close-stock");
    const overlay = $("#stock-overlay");
    const listEl = $("#stock-list");

    // Vue consultation
    const openViewBtn = $("#open-stock-view");
    const closeViewBtn = $("#close-stock-view");
    const viewOverlay = $("#stock-view-overlay");
    const viewPanel = $("#stock-view-panel");
    const stockViewList = $("#stock-view-list");
    const stockSummary = $("#stock-summary");

    // Champs formulaire
    const nameEl = $("#stock-name");
    const cultureEl = $("#stock-culture");
    const varietyEl = $("#stock-variety");
    const qtyEl = $("#stock-qty");
    const unitEl = $("#stock-unit");
    const typeEl = $("#stock-type");
    const yearEl = $("#stock-year");
    const viabilityEl = $("#stock-viability");
    const thresholdEl = $("#stock-threshold");
    const sourceEl = $("#stock-source");
    const notesEl = $("#stock-notes");
    const addBtn = $("#stock-add");

    // Indicateur sync
    const dot = document.getElementById("sync-dot");
    const label = document.getElementById("sync-label");

    /* =========================================================
       === ÉTAT
       ========================================================= */
    let stock = [];
    let syncTimer = null;
    let isSyncing = false;

    const STORAGE_KEY = "stock_v3";

    /* =========================================================
       === HELPERS
       ========================================================= */
    function currentYear() {
      return new Date().getFullYear();
    }

    function uid() {
      return crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(16).slice(2);
    }

    function toNumber(value, fallback = 0) {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    }

    function normalizeText(value) {
      return String(value || "").trim();
    }

    function escapeHtml(str) {
      return String(str || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function normalizeItem(raw = {}) {
      return {
        id: raw.id || uid(),
        name: normalizeText(raw.name),
        cultureKey: normalizeText(raw.cultureKey),
        variety: normalizeText(raw.variety),
        qty: Math.max(0, toNumber(raw.qty, 0)),
        unit: normalizeText(raw.unit) || "pcs",
        type: normalizeText(raw.type) || "semence",
        year: raw.year === "" || raw.year == null ? null : toNumber(raw.year, null),
        viabilityYears:
          raw.viabilityYears === "" || raw.viabilityYears == null
            ? null
            : Math.max(0, toNumber(raw.viabilityYears, null)),
        lowStockThreshold:
          raw.lowStockThreshold === "" || raw.lowStockThreshold == null
            ? 0
            : Math.max(0, toNumber(raw.lowStockThreshold, 0)),
        source: normalizeText(raw.source),
        notes: normalizeText(raw.notes),
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString()
      };
    }

    function getDisplayName(item) {
      if (item.name) return item.name;
      if (item.cultureKey && item.variety) return `${item.cultureKey} — ${item.variety}`;
      if (item.cultureKey) return item.cultureKey;
      return "Article sans nom";
    }

    function getStatus(item) {
  if (item.qty === 0) return "empty";

  const low = item.qty <= (item.lowStockThreshold || 0);

  if (item.year && item.viabilityYears != null) {
    const age = currentYear() - item.year;
    if (age > item.viabilityYears) return "expired";
    if (age === item.viabilityYears) return low ? "last_year_low" : "last_year";
  }

  if (low) return "low";
  return "ok";
}

    function getStatusLabel(item) {
  const status = getStatus(item);

  switch (status) {
    case "empty":
      return "⚫ Épuisé";
    case "expired":
      return "🔴 À remplacer";
    case "last_year":
      return "🟠 Dernière année";
    case "last_year_low":
      return "🟠 Dernière année / stock bas";
    case "low":
      return "🟡 Stock bas";
    default:
      return "🟢 OK";
  }
}

    function sameItem(a, b) {
      return (
        normalizeText(a.name).toLowerCase() === normalizeText(b.name).toLowerCase() &&
        normalizeText(a.cultureKey).toLowerCase() === normalizeText(b.cultureKey).toLowerCase() &&
        normalizeText(a.variety).toLowerCase() === normalizeText(b.variety).toLowerCase() &&
        normalizeText(a.type).toLowerCase() === normalizeText(b.type).toLowerCase() &&
        normalizeText(a.unit).toLowerCase() === normalizeText(b.unit).toLowerCase() &&
        (a.year || null) === (b.year || null)
      );
    }

    function setSyncState(state) {
      if (!dot || !label) return;

      switch (state) {
        case "ok":
          dot.style.background = "#2e7d32";
          label.textContent = "Sync : à jour";
          break;
        case "syncing":
          dot.style.background = "#f9a825";
          label.textContent = "Sync : en cours…";
          break;
        case "offline":
          dot.style.background = "#d32f2f";
          label.textContent = "Sync : hors ligne";
          break;
      }
    }

    function closeEditPanel() {
      panel?.classList.remove("visible");
      overlay?.classList.remove("active");
    }

    function closeViewPanel() {
      viewPanel?.classList.remove("visible");
      viewOverlay?.classList.remove("active");
    }

    function clearForm() {
      if (nameEl) nameEl.value = "";
      if (cultureEl) cultureEl.value = "";
      if (varietyEl) varietyEl.value = "";
      if (qtyEl) qtyEl.value = 1;
      if (unitEl) unitEl.value = "pcs";
      if (typeEl) typeEl.value = "semence";
      if (yearEl) yearEl.value = "";
      if (viabilityEl) viabilityEl.value = "";
      if (thresholdEl) thresholdEl.value = "";
      if (sourceEl) sourceEl.value = "";
      if (notesEl) notesEl.value = "";
    }

    /* =========================================================
       === LOCAL STORAGE
       ========================================================= */
    function loadLocal() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        stock = Array.isArray(parsed) ? parsed.map(normalizeItem) : [];
      } catch {
        stock = [];
      }
    }

    function saveLocal() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stock));
      } catch {}
    }

    /* =========================================================
       === FIREBASE
       ========================================================= */
    async function syncFromCloud() {
      try {
        const remote = await loadSection("stock");

        if (Array.isArray(remote)) {
          stock = remote.map(normalizeItem);
        } else {
          stock = [];
          await syncSection("stock", []);
        }

        saveLocal();
        render();
        renderStockView();
        setSyncState("ok");
      } catch (e) {
        console.warn("⚠️ syncFromCloud échouée :", e);
        setSyncState("offline");
      }
    }

    async function syncToCloudDebounced() {
      if (isSyncing) return;

      clearTimeout(syncTimer);
      syncTimer = setTimeout(async () => {
        try {
          isSyncing = true;
          setSyncState("syncing");
          await syncSection("stock", stock);
          setSyncState("ok");
          console.log("☁️ Stock synchronisé → Firebase");
        } catch (e) {
          console.warn("⚠️ syncToCloud échouée :", e);
          setSyncState("offline");
        } finally {
          isSyncing = false;
        }
      }, 500);
    }

    /* =========================================================
       === RENDER GESTION
       ========================================================= */
    function render() {
      if (!listEl) return;

      if (!stock.length) {
        listEl.innerHTML = "<p style='color:#666;font-style:italic'>Aucun article en stock.</p>";
        return;
      }

      const sorted = [...stock].sort((a, b) =>
        getDisplayName(a).localeCompare(getDisplayName(b), "fr")
      );

      listEl.innerHTML = sorted.map(item => {
        const statusLabel = getStatusLabel(item);
        const subtitle = [
          item.type,
          item.variety || null,
          item.year ? `année ${item.year}` : null
        ]
          .filter(Boolean)
          .join(" • ");

        const meta = [
          `${item.qty} ${item.unit}`,
          item.lowStockThreshold ? `seuil ${item.lowStockThreshold}` : null,
          item.source || null
        ]
          .filter(Boolean)
          .join(" • ");

        return `
          <div class="entry" data-id="${item.id}" style="padding:8px 0;border-bottom:1px solid #eee">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
              <div style="flex:1">
                <div><strong>${escapeHtml(getDisplayName(item))}</strong></div>
                ${subtitle ? `<div style="font-size:.85rem;color:#666">${escapeHtml(subtitle)}</div>` : ""}
                ${meta ? `<div style="font-size:.85rem;color:#444;margin-top:3px">${escapeHtml(meta)}</div>` : ""}
                <div style="font-size:.85rem;margin-top:4px">${statusLabel}</div>
                ${item.notes ? `<div style="font-size:.82rem;color:#666;margin-top:4px"><em>${escapeHtml(item.notes)}</em></div>` : ""}
              </div>

              <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
                <div style="display:flex;gap:4px">
                  <button class="qty-minus" data-id="${item.id}" style="padding:2px 7px;border:0;border-radius:4px;background:#ddd;cursor:pointer">−</button>
                  <input
                    class="qty-input"
                    data-id="${item.id}"
                    type="number"
                    min="0"
                    step="0.01"
                    value="${item.qty}"
                    style="width:70px;padding:3px;text-align:center"
                  >
                  <button class="qty-plus" data-id="${item.id}" style="padding:2px 7px;border:0;border-radius:4px;background:#ddd;cursor:pointer">+</button>
                </div>
                <button class="del" data-id="${item.id}" style="background:#c62828;color:#fff;border:0;border-radius:4px;padding:4px 8px;cursor:pointer">Supprimer</button>
              </div>
            </div>
          </div>
        `;
      }).join("");
    }

    /* =========================================================
       === RENDER CONSULTATION
       ========================================================= */
    function renderStockView() {
      if (!stockViewList || !stockSummary) return;

      if (!stock.length) {
        stockSummary.innerHTML = "";
        stockViewList.innerHTML = "<p style='color:#666;font-style:italic'>Aucun article en stock.</p>";
        return;
      }

      const total = stock.length;
      const lowCount = stock.filter(item => {
        const s = getStatus(item);
        return s === "low" || s === "last_year_low";
      }).length;
      const expiredCount = stock.filter(item => getStatus(item) === "expired").length;
      const okCount = stock.filter(item => {
        const s = getStatus(item);
        return s === "ok" || s === "last_year";
      }).length;

      stockSummary.innerHTML = `
        <span class="stock-badge">Total : ${total}</span>
        <span class="stock-badge">🟢 OK : ${okCount}</span>
        <span class="stock-badge">🟡 Bas : ${lowCount}</span>
        <span class="stock-badge">🔴 À remplacer : ${expiredCount}</span>
      `;

      const sorted = [...stock].sort((a, b) =>
        getDisplayName(a).localeCompare(getDisplayName(b), "fr")
      );

      stockViewList.innerHTML = sorted.map(item => `
        <div class="entry" style="padding:8px 0;border-bottom:1px solid #eee">
          <div><strong>${escapeHtml(getDisplayName(item))}</strong></div>
          <div style="font-size:.85rem;color:#666">
            ${escapeHtml(item.type || "—")}
            ${item.variety ? ` • ${escapeHtml(item.variety)}` : ""}
            ${item.year ? ` • année ${item.year}` : ""}
          </div>
          <div style="margin-top:4px">
            ${item.qty} ${escapeHtml(item.unit || "pcs")}
          </div>
          <div style="font-size:.85rem;margin-top:4px">
            ${getStatusLabel(item)}
          </div>
        </div>
      `).join("");
    }

    /* =========================================================
       === ACTIONS
       ========================================================= */
async function populateStockCultureSelect() {
  const select = $("#stock-culture");
  if (!select) return;

  try {
    const companions = await fetch("./companions_bilingual.json").then(r => r.json());

    select.innerHTML = '<option value="">--</option>';

    companions.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.key;                         // ✅ clé technique
      opt.textContent = item.fr || item.key;       // ✅ texte visible
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("❌ Impossible de remplir la liste des cultures du stock :", err);
  }
}

    
    function addItemFromForm() {
      const draft = normalizeItem({
        name: nameEl?.value,
        cultureKey: cultureEl?.value,
        variety: varietyEl?.value,
        qty: qtyEl?.value || 0,
        unit: unitEl?.value || "pcs",
        type: typeEl?.value,
        year: yearEl?.value,
        viabilityYears: viabilityEl?.value,
        lowStockThreshold: thresholdEl?.value,
        source: sourceEl?.value,
        notes: notesEl?.value
      });

      if (!draft.name && !draft.cultureKey) {
  alert("Nom ou culture requis");
  return;
}

      const existing = stock.find(item => sameItem(item, draft));

      if (existing) {
        existing.qty += draft.qty;
        existing.updatedAt = new Date().toISOString();
      } else {
        stock.push(draft);
      }

      saveLocal();
      render();
      renderStockView();
      syncToCloudDebounced();
      clearForm();
    }

    function updateQty(id, newQty) {
      const item = stock.find(i => i.id === id);
      if (!item) return;

      item.qty = Math.max(0, Number(newQty || 0));
      item.updatedAt = new Date().toISOString();

      saveLocal();
      render();
      renderStockView();
      syncToCloudDebounced();
    }

    function changeQty(id, delta) {
      const item = stock.find(i => i.id === id);
      if (!item) return;

      item.qty = Math.max(0, item.qty + delta);
      item.updatedAt = new Date().toISOString();

      saveLocal();
      render();
      renderStockView();
      syncToCloudDebounced();
    }

    function deleteItem(id) {
      const idx = stock.findIndex(i => i.id === id);
      if (idx < 0) return;

      if (!confirm("Supprimer cet article ?")) return;

      stock.splice(idx, 1);
      saveLocal();
      render();
      renderStockView();
      syncToCloudDebounced();
    }

    /* =========================================================
       === EVENTS
       ========================================================= */
    addBtn?.addEventListener("click", addItemFromForm);

    listEl?.addEventListener("click", e => {
      const id = e.target.dataset.id;
      if (!id) return;

      if (e.target.classList.contains("del")) {
        deleteItem(id);
      }

      if (e.target.classList.contains("qty-minus")) {
        changeQty(id, -1);
      }

      if (e.target.classList.contains("qty-plus")) {
        changeQty(id, 1);
      }
    });

    listEl?.addEventListener("change", e => {
      if (!e.target.classList.contains("qty-input")) return;
      updateQty(e.target.dataset.id, e.target.value);
    });

    openBtn?.addEventListener("click", () => {
      loadLocal();
      render();
      panel?.classList.add("visible");
      overlay?.classList.add("active");
      syncFromCloud();
    });

    closeBtn?.addEventListener("click", closeEditPanel);
    overlay?.addEventListener("click", closeEditPanel);

    openViewBtn?.addEventListener("click", () => {
      loadLocal();
      renderStockView();
      viewPanel?.classList.add("visible");
      viewOverlay?.classList.add("active");
      syncFromCloud().then(() => renderStockView());
    });

    closeViewBtn?.addEventListener("click", closeViewPanel);
    viewOverlay?.addEventListener("click", closeViewPanel);

    window.addEventListener("online", () => setSyncState("ok"));
    window.addEventListener("offline", () => setSyncState("offline"));

    /* =========================================================
       === API PUBLIQUE
       ========================================================= */
    window.StockAPI = {
      getAll: () => structuredClone(stock),

      add: (itemOrName, qty = 1, type = "semence") => {
        let item;

        if (typeof itemOrName === "string") {
          item = normalizeItem({ name: itemOrName, qty, type });
        } else {
          item = normalizeItem(itemOrName);
        }

        const existing = stock.find(x => sameItem(x, item));

        if (existing) {
          existing.qty += item.qty;
          existing.updatedAt = new Date().toISOString();
        } else {
          stock.push(item);
        }

        saveLocal();
        render();
        renderStockView();
        syncToCloudDebounced();
      },

      remove: (matcher, qty = 1) => {
  let item = null;

  if (typeof matcher === "string") {
    item = stock.find(i => i.name.toLowerCase() === matcher.toLowerCase());
  } else if (matcher?.id) {
    item = stock.find(i => i.id === matcher.id);
  } else if (matcher?.cultureKey) {
    item = stock.find(i =>
      i.cultureKey === matcher.cultureKey &&
      (!matcher.variety || i.variety === matcher.variety)
    );
  }

  if (!item) return false;

  item.qty = Math.max(0, item.qty - qty);
  item.updatedAt = new Date().toISOString();

  saveLocal();
  render();
  renderStockView();
  syncToCloudDebounced();
  return true;
},

      consume: (matcher, qty = 1) => {
        return window.StockAPI.remove(matcher, qty);
      }
    };

    /* =========================================================
       === INIT
       ========================================================= */
    (async function init() {
  await populateStockCultureSelect();
  loadLocal();
  render();
  renderStockView();
  await syncFromCloud();
  setSyncState(navigator.onLine ? "ok" : "offline");
  console.log("[stock.js] ✅ Stock v3 prêt");
})();
  });
})();
