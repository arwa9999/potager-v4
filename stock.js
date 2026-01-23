// stock.js — Gestion du stock de semences avec Firebase (v11.2.0)
import { syncSection, loadSection } from "./firebase.js";

(function () {
  document.addEventListener("DOMContentLoaded", () => {
    /* === Sélecteurs utilitaires === */
    const $ = s => document.querySelector(s);
    const $$ = s => Array.from(document.querySelectorAll(s));

    /* === Éléments DOM === */
    const panel = $('#stock-panel');
    const openBtn = $('#open-stock');
    const closeBtn = $('#close-stock');
    const overlay = $('#stock-overlay');
    const listEl = $('#stock-list');
    const nameEl = $('#stock-name');
    const qtyEl = $('#stock-qty');
    const typeEl = $('#stock-type');
    const addBtn = $('#stock-add');

    /* === État interne === */
    let stock = [];
    let syncTimer = null;
    let isSyncing = false;

    /* =========================================================
       ===   LOCALSTORAGE   ====================================
       ========================================================= */
    function loadLocal() {
      try {
        const raw = localStorage.getItem("stock_v1");
        stock = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(stock)) stock = [];
      } catch {
        stock = [];
      }
    }

    function saveLocal() {
      try {
        localStorage.setItem("stock_v1", JSON.stringify(stock));
      } catch {}
    }

    /* =========================================================
       ===   FIREBASE SYNC   ===================================
       ========================================================= */
    async function syncFromCloud() {
      try {
        const remote = await loadSection("stock");
        if (Array.isArray(remote) && remote.length) {
          console.log("☁️ Stock importé depuis Firebase :", remote);
          stock = remote;
          saveLocal();
          render();
          setSyncState("ok");
        } else {
          console.log("ℹ️ Aucun stock trouvé sur Firebase (création vide)");
          await syncSection("stock", []);
          setSyncState("ok");
        }
      } catch (e) {
        console.warn("⚠️ SyncFromCloud échouée :", e);
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
          console.log("☁️ Stock synchronisé → Firebase");
          setSyncState("ok");
        } catch (e) {
          console.warn("⚠️ SyncToCloud échouée :", e);
          setSyncState("offline");
        } finally {
          isSyncing = false;
        }
      }, 700);
    }

    /* =========================================================
       ===   UI RENDERING   ====================================
       ========================================================= */
    function render() {
      if (!listEl) return;
      if (stock.length === 0) {
        listEl.innerHTML = "<p style='color:#666;font-style:italic'>Aucun article en stock.</p>";
        return;
      }

      const rows = stock
        .map(
          (item, i) => `
        <div class="entry" style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:4px 0;border-bottom:1px solid #eee">
          <span><strong>${item.name}</strong><br><small>${item.type}</small></span>
          <span style="display:flex;gap:6px;align-items:center">
            <input type="number" min="0" value="${item.qty}" data-idx="${i}" style="width:70px;padding:3px">
            <button class="del" data-idx="${i}" style="background:#c62828;color:#fff;border:0;border-radius:4px;padding:3px 6px;cursor:pointer">✕</button>
          </span>
        </div>
      `
        )
        .join('');
      listEl.innerHTML = rows;
    }

    /* =========================================================
       ===   EVENTS   ==========================================
       ========================================================= */
    addBtn?.addEventListener("click", () => {
      const name = nameEl.value.trim();
      const qty = Number(qtyEl.value || 0);
      const type = typeEl.value;
      if (!name) return alert("Nom requis");

      const existing = stock.find(i => i.name.toLowerCase() === name.toLowerCase() && i.type === type);
      if (existing) existing.qty += qty;
      else stock.push({ name, qty, type });

      saveLocal();
      render();
      syncToCloudDebounced();
      nameEl.value = "";
      qtyEl.value = "";
    });

    listEl?.addEventListener("click", e => {
      if (e.target.classList.contains("del")) {
        const idx = +e.target.dataset.idx;
        if (confirm("Supprimer cet article ?")) {
          stock.splice(idx, 1);
          saveLocal();
          render();
          syncToCloudDebounced();
        }
      }
    });

    listEl?.addEventListener("change", e => {
      if (e.target.matches('input[type="number"]')) {
        const idx = +e.target.dataset.idx;
        const val = Math.max(0, Number(e.target.value || 0));
        if (stock[idx]) {
          stock[idx].qty = val;
          saveLocal();
          syncToCloudDebounced();
        }
      }
    });

    /* =========================================================
       ===   PANNEAU UI   =====================================
       ========================================================= */
    openBtn?.addEventListener("click", () => {
      panel.classList.add("visible");
      overlay.classList.add("active");
      loadLocal();
      render();
      syncFromCloud();
    });

    closeBtn?.addEventListener("click", () => {
      panel.classList.remove("visible");
      overlay.classList.remove("active");
    });

    overlay?.addEventListener("click", () => {
      panel.classList.remove("visible");
      overlay.classList.remove("active");
    });

    /* =========================================================
       ===   INDICATEUR VISUEL (SYNC STATE)   ==================
       ========================================================= */
    const dot = document.getElementById("sync-dot");
    const label = document.getElementById("sync-label");

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

    window.addEventListener("online", () => setSyncState("ok"));
    window.addEventListener("offline", () => setSyncState("offline"));

    /* =========================================================
       ===   API PUBLIQUE GLOBALE   ============================
       ========================================================= */
    window.StockAPI = {
      getAll: () => structuredClone(stock),
      add: (name, qty = 1, type = "semence") => {
        const existing = stock.find(i => i.name.toLowerCase() === name.toLowerCase() && i.type === type);
        if (existing) existing.qty += qty;
        else stock.push({ name, qty, type });
        saveLocal();
        render();
        syncToCloudDebounced();
      },
      remove: (name, qty = 1) => {
        const idx = stock.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
        if (idx >= 0) {
          stock[idx].qty = Math.max(0, stock[idx].qty - qty);
          if (stock[idx].qty === 0) stock.splice(idx, 1);
          saveLocal();
          render();
          syncToCloudDebounced();
        }
      }
    };

    /* =========================================================
       ===   INIT AUTOMATIQUE   ================================
       ========================================================= */
    (async function init() {
      loadLocal();
      await syncFromCloud();
      setSyncState(navigator.onLine ? "ok" : "offline");
      console.log("[stock.js] ✅ Connecté à Firebase (section stock) + localStorage 💾");
    })();
  });
})();
