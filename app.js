/* Potager FR/NL — logique app (synchronisée Firebase) */
import { syncSection, loadSection } from "./firebase.js";

/* === Vérification structure Firebase === */
(async function ensureBaseStructure(){
  try {
    const data = await loadSection("parcelles");
    if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length === 0) {
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

(function(){

  /* === Helpers basiques === */
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  /* === Synchro Firebase === */
  async function syncParcellesToCloud() {
    try {
      await syncSection("parcelles", state);
      console.log("☁️ Parcelles synchronisées vers Firebase");
    } catch (err) {
      console.warn("⚠️ Erreur de sync Firebase (parcelles):", err);
    }
  }

  async function loadParcellesFromCloud() {
    try {
      const data = await loadSection("parcelles");
      if (data && data.plots && Array.isArray(data.plots) && data.plots.length > 0) {
        console.log("☁️ Données de parcelles récupérées depuis Firebase :", data);
        saveLocal(data); // mise à jour locale
        state = data;    // recharge dans l’état global
      } else {
        console.log("⚠️ Aucune donnée de parcelles trouvée sur Firebase, utilisation du localStorage");
      }
    } catch (err) {
      console.warn("⚠️ Impossible de charger les parcelles depuis Firebase :", err);
    }
  }

  /* === Gestion locale === */
  function loadLocal(){
    try{
      const raw = localStorage.getItem('potager_v2');
      if(!raw) return null;
      const obj = JSON.parse(raw);
      return obj && obj.plots ? obj : {plots:obj};
    }catch{ return null; }
  }

  function saveLocal(st){ 
    try{ 
      localStorage.setItem('potager_v2', JSON.stringify(st)); 
    }catch(e){ console.warn("⚠️ Erreur lors de la sauvegarde locale :", e); }
  }

  function unifyData(fileObj, localObj){
    const byId = new Map();
    const push = src => {
      if(!src || !Array.isArray(src.plots)) return;
      src.plots.forEach(p=>{
        const id = Number(p.id);
        if(!Number.isFinite(id)) return;
        byId.set(id, {
          id,
          history: Array.isArray(p.history)? p.history.slice() : [],
          photos:  Array.isArray(p.photos)?  p.photos.slice()  : []
        });
      });
    };
    push(fileObj); push(localObj);
    $$('#garden rect.plot').forEach(r=>{
      const id = Number(r.dataset.id||r.getAttribute('data-id'));
      if(!byId.has(id)) byId.set(id,{id,history:[],photos:[]});
    });
    return { plots: Array.from(byId.values()).sort((a,b)=>a.id-b.id) };
  }

  /* === Chargement initial === */
  const fileData  = (()=>{ try{ const el=$('#data-inline'); return el? JSON.parse(el.textContent): {plots:[]}; }catch{ return {plots:[]}; }})();
  let localData = loadLocal();
  let state = unifyData(fileData, localData);

  /* === Chargement prioritaire depuis Firebase === */
  loadParcellesFromCloud().then(()=>{
    applyRecencyColors?.();
    ensureTitlesAndLabels?.();
  });

  /* === Sauvegarde d’une nouvelle action === */
  $('#save').addEventListener('click', ()=>{
    if(currentId==null) return;
    const d = $('#date').value || new Date().toISOString().slice(0,10);
    const aKey = $('#action').value || '';
    const aLbl = aKey;
    const cTxt = $('#culture').value.trim();
    const famKeySel = $('#family').value;
    if(!aLbl || !cTxt) return alert("Remplis le type d'action et la culture.");

    const plot = state.plots.find(p=>p.id===currentId);
    plot.history = plot.history || [];
    const fam = famKeySel || 'other';

    plot.history.unshift({
      date:d,
      action:aLbl, actionKey:aKey||null,
      culture:cTxt, family:fam
    });

    saveLocal(state);
    syncParcellesToCloud(); // 🔁 Synchro Firebase
    renderHistory(currentId);
    applyRecencyColors?.();
  });

  /* === Export / Import === */
  $('#export').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'historique_potager_'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },600);
  });

  $('#import').addEventListener('change', ev=>{
    const f = ev.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = e=>{
      try{
        const obj = JSON.parse(e.target.result);
        if(!obj.plots) throw new Error("Format JSON invalide");
        state = obj;
        saveLocal(state);
        syncParcellesToCloud(); // 🔁 Réimporte aussi sur Firebase
        alert('Importation réussie et synchronisée !');
      }catch(err){ alert('Fichier invalide: '+(err.message||err)); }
    };
    r.readAsText(f);
  });

})();
