/* stock.js — Gestion du stock + synchronisation Firebase (v11.0.1)
   Adapté au nouveau firebase.js (sections séparées) */

import { syncSection, loadSection } from "./firebase.js";

(function(){
  const STORAGE_KEY = "stock_potager_v1";

  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const panel = $('#stock-panel');
  const openBtn = $('#open-stock');
  const closeBtn = $('#close-stock');
  const overlay = $('#stock-overlay');
  const listEl = $('#stock-list');
  const nameEl = $('#stock-name');
  const qtyEl  = $('#stock-qty');
  const typeEl = $('#stock-type');
  const addBtn = $('#stock-add');

  let stock = [];
  let syncTimer = null;
  let isSyncing = false;

  /* === LocalStorage === */
  function loadLocal(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      stock = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(stock)) stock = [];
    } catch { stock = []; }
  }

  function saveLocal(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stock)); } catch {}
  }

  /* === Firebase sync === */
  async function syncFromCloud(){
    try {
      const remote = await loadSection("stock");
      if (Array.isArray(remote) && remote.length) {
        console.log("☁️ Import Firebase → local stock");
        stock = remote;
        saveLocal();
        render();
      }
    } catch (e) {
      console.warn("⚠️ SyncFromCloud échouée:", e);
    }
  }

  async function syncToCloudDebounced(){
    if (isSyncing) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async ()=>{
      try {
        isSyncing = true;
        await syncSection("stock", stock);
        console.log("☁️ Stock synchronisé vers Firebase");
      } catch (e) {
        console.warn("⚠️ SyncToCloud échouée:", e);
      } finally {
        isSyncing = false;
      }
    }, 800);
  }

  /* === Rendu UI === */
  function render(){
    if (!listEl) return;
    if (stock.length === 0) {
      listEl.innerHTML = "<p style='color:#666;font-style:italic'>Aucun article en stock.</p>";
      return;
    }

    const rows = stock.map((item, i)=>`
      <div class="entry" style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:4px 0;border-bottom:1px solid #eee">
        <span><strong>${item.name}</strong><br><small>${item.type}</small></span>
        <span style="display:flex;gap:6px;align-items:center">
          <input type="number" min="0" value="${item.qty}" data-idx="${i}" style="width:70px;padding:3px">
          <button class="del" data-idx="${i}" style="background:#c62828;color:#fff;border:0;border-radius:4px;padding:3px 6px;cursor:pointer">✕</button>
        </span>
      </div>
    `).join('');
    listEl.innerHTML = rows;
  }

  /* === Événements === */
  addBtn?.addEventListener('click', ()=>{
    const name = nameEl.value.trim();
    const qty  = Number(qtyEl.value || 0);
    const type = typeEl.value;
    if (!name) return alert("Nom requis");
    const existing = stock.find(i => i.name.toLowerCase() === name.toLowerCase() && i.type === type);
    if (existing) existing.qty += qty;
    else stock.push({ name, qty, type });
    saveLocal(); render(); syncToCloudDebounced();
    nameEl.value = ''; qtyEl.value = '';
  });

  listEl?.addEventListener('click', e=>{
    if (e.target.classList.contains('del')) {
      const idx = +e.target.dataset.idx;
      if (confirm("Supprimer cet article ?")) {
        stock.splice(idx, 1);
        saveLocal(); render(); syncToCloudDebounced();
      }
    }
  });

  listEl?.addEventListener('change', e=>{
    if (e.target.matches('input[type="number"]')) {
      const idx = +e.target.dataset.idx;
      const val = Math.max(0, Number(e.target.value || 0));
      if (stock[idx]) {
        stock[idx].qty = val;
        saveLocal(); syncToCloudDebounced();
      }
    }
  });

  /* === Panneau === */
  openBtn?.addEventListener('click', ()=>{
    panel.classList.add('visible');
    overlay.classList.add('active');
    loadLocal();
    render();
    syncFromCloud();
  });
  closeBtn?.addEventListener('click', ()=>{
    panel.classList.remove('visible');
    overlay.classList.remove('active');
  });
  overlay?.addEventListener('click', ()=>{
    panel.classList.remove('visible');
    overlay.classList.remove('active');
  });

  /* === API publique === */
 /* === API publique + Initialisation === */
window.StockAPI = {
  stock: [],

  getAll() {
    return structuredClone(this.stock);
  },

  add(name, qty = 1, type = "semence") {
    const existing = this.stock.find(i => i.name.toLowerCase() === name.toLowerCase() && i.type === type);
    if (existing) existing.qty += qty;
    else this.stock.push({ name, qty, type });
    this.saveLocal();
    this.syncToCloudDebounced();
  },

  remove(name, qty = 1) {
    const idx = this.stock.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
    if (idx >= 0) {
      this.stock[idx].qty = Math.max(0, this.stock[idx].qty - qty);
      if (this.stock[idx].qty === 0) this.stock.splice(idx, 1);
      this.saveLocal();
      this.syncToCloudDebounced();
    }
  },

  /* === LocalStorage === */
  loadLocal() {
    try {
      const raw = localStorage.getItem("stock_v1");
      this.stock = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(this.stock)) this.stock = [];
    } catch {
      this.stock = [];
    }
  },

  saveLocal() {
    try {
      localStorage.setItem("stock_v1", JSON.stringify(this.stock));
    } catch {}
  },

  /* === Firebase Sync === */
  async syncFromCloud() {
    try {
      const remote = await loadSection("stock");
      if (Array.isArray(remote) && remote.length) {
        console.log("☁️ Stock importé depuis Firebase :", remote);
        this.stock = remote;
        this.saveLocal();
      } else {
        console.log("ℹ️ Aucun stock trouvé sur Firebase (création d’un stock vide)");
        await syncSection("stock", []);
      }
    } catch (e) {
      console.warn("⚠️ Erreur syncFromCloud :", e);
    }
  },

  async syncToCloudDebounced() {
    clearTimeout(this._timer);
    this._timer = setTimeout(async () => {
      try {
        await syncSection("stock", this.stock);
        console.log("☁️ Stock synchronisé → Firebase");
        this.setSyncState("ok");
      } catch (e) {
        console.warn("⚠️ Sync Firebase échouée :", e);
        this.setSyncState("offline");
      }
    }, 500);
  },

  /* === Indicateur visuel === */
  setSyncState(state) {
    const dot = document.getElementById("sync-dot");
    const label = document.getElementById("sync-label");
    if (!dot || !label) return;
    switch (state) {
      case "ok":
        dot.style.background = "#2e7d32";
        label.textContent = "Sync : à jour";
        break;
      case "offline":
        dot.style.background = "#d32f2f";
        label.textContent = "Sync : hors ligne";
        break;
      case "syncing":
        dot.style.background = "#f9a825";
        label.textContent = "Sync : en cours…";
        break;
    }
  },

  /* === Initialisation === */
  async init() {
    this.loadLocal();
    await this.syncFromCloud();
    this.setSyncState(navigator.onLine ? "ok" : "offline");
    console.log("[stock.js] ✅ Connecté à Firebase + LocalStorage prêt :", this.stock);
  }
};

// 🟢 Lance automatiquement l'init
window.StockAPI.init();
