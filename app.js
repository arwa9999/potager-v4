/* Potager FR/NL — logique app (clean) */
(function(){
  /* ===== I18N (UI de base) ===== */
  let LANG = localStorage.getItem('lang') || 'fr';
  const I18N = {
    fr:{
      header:"Plan du potager",
      legend_plot:"Parcelle", legend_compost:"Compost", legend_water:"Eau", legend_pergola:"Pergola",
      legend_recent:"Récent", legend_mid:"Moyen", legend_old:"Ancien",
      ui_parcel:"Parcelle", compost:"Compost",
      panel_add:"+ Ajouter une action", action_type:"Type d'action…",
      culture_ph:"Nom de la culture", save:"Enregistrer", storage:"📦 Sauvegarde",
      export:"Exporter l’historique (.json)", import:"Importer",
      f_action:"Action", f_culture:"Culture", f_from:"Du", f_to:"Au", f_any:"(Toutes)", f_clear:"Réinitialiser",
      fruit_trees:"Fruitiers", family_label:"Famille botanique (optionnel)",
      rot_family:"Famille (rotation)", rot_years:"Années d'écart",
      photos_add:"Ajouter des photos (jpg/png)",
      companions_title:"Compagnonnage", friends:"Amies", enemies:"Ennemies"
    },
    nl:{
      header:"Moestuinplan",
      legend_plot:"Perceel", legend_compost:"Compost", legend_water:"Water", legend_pergola:"Pergola",
      legend_recent:"Recent", legend_mid:"Gemiddeld", legend_old:"Oud",
      ui_parcel:"Perceel", compost:"Compost",
      panel_add:"+ Actie toevoegen", action_type:"Actietype…",
      culture_ph:"Teeltnaam", save:"Opslaan", storage:"📦 Opslag",
      export:"Historiek exporteren (.json)", import:"Importeren",
      f_action:"Actie", f_culture:"Teelt", f_from:"Van", f_to:"Tot", f_any:"(Alles)", f_clear:"Reset",
      fruit_trees:"Fruitbomen", family_label:"Botanische familie (optioneel)",
      rot_family:"Familie (rotatie)", rot_years:"Jaren tussentijd",
      photos_add:"Foto's toevoegen (jpg/png)",
      companions_title:"Gezelschapsplanten", friends:"Vrienden", enemies:"Vijanden"
    }
  };

  // Actions: clés stables
  I18N.fr.actions = {
    any:"(Toutes)",
    semis:"Semis", plantation:"Plantation", recolte:"Récolte", amendement:"Amendement", autre:"Autre",
    mulch_leaves:"Paillage (feuilles)", mulch_compost:"Paillage (compost)", mulch_brf:"Paillage (BRF)",
    greenmanure_sow:"Engrais vert — semis", greenmanure_cut:"Engrais vert — fauche", greenmanure_incorp:"Engrais vert — incorporation",
    watering:"Arrosage", hilling:"Buttage", weeding:"Désherbage", bio_treatment:"Traitement bio", frost_protection:"Protection gel"
  };
  I18N.nl.actions = {
    any:"(Alles)",
    semis:"Zaaien", plantation:"Planten", recolte:"Oogst", amendement:"Bodemverbetering", autre:"Overig",
    mulch_leaves:"Mulch (bladeren)", mulch_compost:"Mulch (compost)", mulch_brf:"Mulch (hakselhout)",
    greenmanure_sow:"Groenbemester — zaaien", greenmanure_cut:"Groenbemester — maaien", greenmanure_incorp:"Groenbemester — inwerken",
    watering:"Besproeien", hilling:"Aanaarden", weeding:"Wieden", bio_treatment:"Biobehandeling", frost_protection:"Vorstbescherming"
  };

  const t  = k => (I18N[LANG] && I18N[LANG][k]) || I18N.fr[k] || k;
  const ta = k => (I18N[LANG].actions[k] || I18N.fr.actions[k] || k);

  // Familles depuis JSON
  let FAMILIES = {};             // { key -> {fr,nl} }
  let CULT = {};                 // cultDict.json (fr,nl,family,syn[])
  let COMP = {};                 // companions_bilingual.json (keys -> {friends[], enemies[]})

  /* ===== Helpers ===== */
  const svgNS = 'http://www.w3.org/2000/svg';
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const garden = $('#garden');
  const svg = garden?.ownerSVGElement || document.querySelector('svg');

  const tf = k => (FAMILIES[k]?.[LANG] || FAMILIES[k]?.fr || k);

  const norm = s => (s||'').toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ').trim();

  // Reverse-map Actions pour migration
  const REV_ACTIONS = (()=> {
    const m = new Map();
    for(const [k,v] of Object.entries(I18N.fr.actions)) if(k!=='any') m.set(norm(v), k);
    for(const [k,v] of Object.entries(I18N.nl.actions)) if(k!=='any') m.set(norm(v), k);
    // alias usuels
    const alias = {
      'semis':'semis','zaaien':'semis',
      'plantation':'plantation','planten':'plantation',
      'recolte':'recolte','oogst':'recolte',
      'amendement':'amendement','bodemverbetering':'amendement',
      'mulch (feuilles)':'mulch_leaves','mulch (bladeren)':'mulch_leaves',
      'mulch (compost)':'mulch_compost',
      'mulch (brf)':'mulch_brf','mulch (hakselhout)':'mulch_brf',
      'arrosage':'watering','besproeien':'watering',
      'aanaarden':'hilling','buttage':'hilling',
      'desherbage':'weeding','wieden':'weeding',
      'biobehandeling':'bio_treatment','traitement bio':'bio_treatment',
      'protection gel':'frost_protection','vorstbescherming':'frost_protection',
      'autre':'autre','overig':'autre'
    };
    for(const [lbl,key] of Object.entries(alias)) m.set(norm(lbl), key);
    return m;
  })();
  const actionKeyFromLabel = s => (REV_ACTIONS.get(norm(s)) || null);

  // Culture: résolution via CULT (fr/nl/syn) → {key, fr, nl, family}
  function resolveCultureAny(input){
    if(!input) return { key:null, fr:'', nl:'', family:'other' };
    const s = norm(input);
    for(const [key, v] of Object.entries(CULT)){
      if(norm(v.fr)===s || norm(v.nl)===s) return { key, fr:v.fr, nl:v.nl, family:v.family||'other' };
      const syns = (v.syn||[]).map(norm);
      if(syns.includes(s)) return { key, fr:v.fr, nl:v.nl, family:v.family||'other' };
    }
    // fallback texte libre
    return { key:null, fr:input, nl:input, family:'other' };
  }
  const cultureDisplay = (h, lang=LANG) => {
    if(h.culture_key && CULT[h.culture_key]){
      return (lang==='nl' ? CULT[h.culture_key].nl : CULT[h.culture_key].fr);
    }
    if(lang==='nl' && h.culture_nl) return h.culture_nl;
    if(lang==='fr' && h.culture_fr) return h.culture_fr;
    return h.culture || '';
  };

  /* ===== State & stockage ===== */
  function parseJSONInline(){
    try{ const el=$('#data-inline'); return el? JSON.parse(el.textContent||'{"plots":[]}') : {plots:[]}; }
    catch{ return {plots:[]}; }
  }
  function loadLocal(){
    try{
      const raw = localStorage.getItem('potager_v2');
      if(!raw) return null;
      const obj = JSON.parse(raw);
      return obj && obj.plots ? obj : {plots:obj};
    }catch{ return null; }
  }
  function saveLocal(st){ try{ localStorage.setItem('potager_v2', JSON.stringify(st)); }catch{} }

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

  const fileData  = parseJSONInline();
  const localData = loadLocal();
  let state = unifyData(fileData, localData);

  /* ===== UI: titres, labels, couleurs récence ===== */
  function localizedPlotName(rect){
    const key = (rect.dataset.name||'').trim();
    if(!key) return null;
    return I18N[LANG][key] || I18N.fr[key] || key;
  }
  function centerInParent(rect){
    const x=+rect.getAttribute('x')||0, y=+rect.getAttribute('y')||0;
    const w=+rect.getAttribute('width')||0, h=+rect.getAttribute('height')||0;
    const pt = svg.createSVGPoint(); pt.x=x+w/2; pt.y=y+h/2;
    const ctm = rect.getCTM(); if(!ctm) return {x:x+w/2, y:y+h/2};
    const inViewport = pt.matrixTransform(ctm);
    const parent = rect.parentNode; const parentCTM = parent.getCTM?.();
    if(!parentCTM || !parentCTM.inverse) return {x:inViewport.x, y:inViewport.y};
    const inParent = inViewport.matrixTransform(parentCTM.inverse());
    return {x:inParent.x, y:inParent.y};
  }
  function ensureTitlesAndLabels(){
    $$('#garden rect.plot').forEach(rect=>{
      const id = +(rect.dataset.id||rect.getAttribute('data-id'));
      if(!Number.isFinite(id)) return;
      let tit = rect.querySelector('title');
      if(!tit){ tit = document.createElementNS(svgNS,'title'); rect.appendChild(tit); }
      const name = localizedPlotName(rect);
      tit.textContent = name? `${t('ui_parcel')} ${id} — ${name}` : `${t('ui_parcel')} ${id}`;
      const parent = rect.parentNode;
      parent.querySelector(`text.plot-label[data-for="${id}"]`)?.remove();
      const {x:cx,y:cy} = centerInParent(rect);
      const w=+rect.getAttribute('width')||0, h=+rect.getAttribute('height')||0;
      const fs = Math.max(9, Math.min(h*0.6, w*0.5, 16));
      const label = document.createElementNS(svgNS,'text');
      label.setAttribute('class','plot-label'); label.setAttribute('data-for', String(id));
      label.setAttribute('x', cx); label.setAttribute('y', cy);
      label.setAttribute('text-anchor','middle'); label.setAttribute('dominant-baseline','central');
      label.setAttribute('font-size', fs.toFixed(1));
      label.setAttribute('style','fill:var(--ink);paint-order:stroke;stroke:#fff;stroke-width:1;pointer-events:none');
      label.textContent = name || id;
      parent.appendChild(label);
    });
  }
  const daysSince = d => {
    const x = new Date(d+'T00:00:00'); if(isNaN(x)) return Infinity;
    return Math.floor((Date.now()-x.getTime())/86400000);
  };
  const lastActionDate = p => {
    if(!p.history?.length) return null;
    return p.history.slice().sort((a,b)=> a.date>b.date?-1:1)[0].date;
  };
  const colorForDays = n => n===Infinity ? '#bfe3b4' : (n<=45?'#a5d6a7': n<=120?'#ffecb3':'#ffcdd2');
  function applyRecencyColors(){
    const map = new Map(state.plots.map(p=>[p.id,p]));
    $$('#garden rect.plot').forEach(rect=>{
      const id = +(rect.dataset.id||rect.getAttribute('data-id'));
      const p = map.get(id); if(!p) return;
      const n = (lastActionDate(p)? daysSince(lastActionDate(p)) : Infinity);
      rect.setAttribute('fill', colorForDays(n));
    });
  }

  /* ===== Tooltip ===== */
  (function(){
    const tip = document.getElementById('tooltip');
    function show(e, txt){
      const p = e.touches? e.touches[0] : e;
      tip.textContent = txt; tip.style.opacity='1';
      tip.style.left = (p.clientX+12)+'px'; tip.style.top = (p.clientY+12)+'px';
    }
    $$('#garden rect.plot').forEach(plot=>{
      const tt = ()=> plot.querySelector('title')?.textContent || `${t('ui_parcel')} ${plot.dataset.id||''}`;
      plot.addEventListener('pointerenter', e=>{ if(e.pointerType!=='touch') show(e,tt()); });
      plot.addEventListener('pointermove',  e=>{ if(e.pointerType!=='touch') show(e,tt()); });
      plot.addEventListener('pointerleave', ()=> tip.style.opacity='0');
      plot.addEventListener('touchstart',   e=>{ show(e,tt()); setTimeout(()=>tip.style.opacity='0',900); }, {passive:true});
    });
  })();

  /* ===== Panneau & historique (avec migration) ===== */
  const panel = $('#info-panel'), titleEl = $('#plot-title'), photosEl = $('#photos');
  let currentId = null;

  function migrateEntry(h){
    // actionKey
    if(!h.actionKey && h.action){
      const k = actionKeyFromLabel(h.action);
      if(k){ h.actionKey = k; h.action = ta(k); }
    }
    // culture normalisée
    if(!h.culture_key){
      const src = h.culture_fr || h.culture_nl || h.culture || '';
      const r = resolveCultureAny(src);
      h.culture_key = r.key || null;
      h.culture_fr  = r.fr  || (h.culture_fr || h.culture || '');
      h.culture_nl  = r.nl  || (h.culture_nl || h.culture || '');
      if(!h.family && r.family) h.family = r.family;
    } else if(CULT[h.culture_key]) {
      const v = CULT[h.culture_key];
      if(h.culture_fr !== v.fr) h.culture_fr = v.fr;
      if(h.culture_nl !== v.nl) h.culture_nl = v.nl;
      if(!h.family && v.family) h.family = v.family;
    }
  }
function renderHistory(id){
  const plot = state.plots.find(p=>p.id===id) || {history:[]};

  const rows = (plot.history||[]).map(h=>{
    migrateEntry(h); // ← IMPORTANT
    const label  = h.actionKey ? ta(h.actionKey) : (h.action||'');
    const fam    = h.family ? ` — <em>${tf(h.family)}</em>` : '';
    const cultTxt = (LANG==='nl' ? (h.culture_nl||'') : (h.culture_fr||'')) || (h.culture||'');
    return `<div class='entry'><strong>${h.date||""}</strong> — ${label} — ${cultTxt}${fam}</div>`;
  }).join('');

  document.getElementById('history').innerHTML = rows || '—';
  renderCompanionAdvice(id); // affiche/maj le bloc compagnonnage
}

  $$('#garden rect.plot').forEach(plot=>{
    plot.addEventListener('click', ()=>{
      currentId = +(plot.dataset.id||plot.getAttribute('data-id'));
      titleEl.textContent = `${t('ui_parcel')} ${currentId}`;
      panel.classList.remove('hidden');
      renderHistory(currentId);
    });
  });
  $('#close').addEventListener('click', ()=> panel.classList.add('hidden'));

  /* ===== Saisie: détection famille (fallback) ===== */
  function guessFamilyKey(txt){
    if(!txt) return '';
    const s = txt.toLowerCase();
    const map = [
      ['solanaceae',['tomate','tomaat','pomme de terre','aardappel','poivron','paprika','aubergine']],
      ['cucurbitaceae',['courgette','courge','citrouille','potiron','komkommer','pompoen','kalebas']],
      ['brassicaceae',['chou','brocoli','pakchoi','chou-fleur','kool','bloemkool','paksoi']],
      ['alliaceae',['poireau','oignon','ail','prei','ui','knoflook']],
      ['apiaceae',['carotte','céleri','fenouil','wortel','selderij','venkel']],
      ['fabaceae',['haricot','pois','boon','erwt']],
      ['chenopodiaceae',['épinard','bette','blette','spinazie','snijbiet']],
      ['asteraceae',['laitue','sla']]
    ];
    for(const [fam,keys] of map){ if(keys.some(k=> s.includes(k))) return fam; }
    return '';
  }

  $('#save').addEventListener('click', ()=>{
    if(currentId==null) return;
    const d = $('#date').value || new Date().toISOString().slice(0,10);
    const aKey = $('#action').value || '';
    const aLbl = aKey ? ta(aKey) : '';
    const cTxt = $('#culture').value.trim();
    const famKeySel = $('#family').value;
    if(!aLbl || !cTxt) return alert(LANG==='nl'?"Vul actietype en teelt in.":"Remplis le type d'action et la culture.");

    const plot = state.plots.find(p=>p.id===currentId);
    plot.history = plot.history || [];
    // normaliser culture
    const r = resolveCultureAny(cTxt);
    const fam = famKeySel || r.family || guessFamilyKey(cTxt) || 'other';

    plot.history.unshift({
      date:d,
      action:aLbl, actionKey:aKey||null,
      culture:cTxt, culture_key: r.key || null,
      culture_fr: r.fr, culture_nl: r.nl,
      family:fam
    });
    saveLocal(state);
    renderHistory(currentId);
    applyRecencyColors();
    applyRotationOverlay();
    $('#date').value=''; $('#culture').value=''; $('#action').value=''; $('#family').value='';
  });

  /* ===== Export / Import ===== */
  $('#export').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify({plots:state.plots}, null, 2)], {type:'application/json'});
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
        const arr = Array.isArray(obj)? obj : obj.plots;
        if(!Array.isArray(arr)) throw new Error('Format attendu: tableau [...] ou {"plots":[...]}');
        const map = new Map(state.plots.map(p=>[p.id,p]));
        arr.forEach(p=>{
          const id = Number(p.id); if(!Number.isFinite(id)) return;
          const hist = Array.isArray(p.history)? p.history : [];
          // migration entrée par entrée
          hist.forEach(migrateEntry);
          map.set(id, { id, history:hist, photos:Array.isArray(p.photos)?p.photos:[] });
        });
        state.plots = Array.from(map.values()).sort((a,b)=>a.id-b.id);
        saveLocal(state);
        applyRecencyColors(); ensureTitlesAndLabels();
        if(currentId!=null) renderHistory(currentId);
        alert(LANG==='nl'?'Import gelukt!':'Importation réussie !');
      }catch(err){ alert('Fichier invalide: '+(err.message||err)); }
    };
    r.readAsText(f);
  });

  /* ===== Filtres ===== */
  function applyFilters(){
    const actKey = $('#f-action').value || '';
    const cult   = ($('#f-culture').value||'').toLowerCase().trim();
    const dFrom  = $('#f-from').value || '';
    const dTo    = $('#f-to').value   || '';
    const map = new Map(state.plots.map(p=>[p.id,p]));

    $$('#garden rect.plot').forEach(rect=>{
      const id = +(rect.dataset.id||rect.getAttribute('data-id'));
      const p = map.get(id) || {history:[]};
      const keep = p.history.some(h=>{
        const k = h.actionKey || actionKeyFromLabel(h.action||'') || '';
        if(actKey && k!==actKey) return false;
        const label = (h.culture_key && CULT[h.culture_key]) ? (CULT[h.culture_key].fr+' '+CULT[h.culture_key].nl).toLowerCase() : (h.culture||'').toLowerCase();
        if(cult && !label.includes(cult)) return false;
        if(dFrom && h.date < dFrom) return false;
        if(dTo   && h.date > dTo)   return false;
        return true;
      }) || (!actKey && !cult && !dFrom && !dTo);
      rect.classList.toggle('dimmed', !keep);
    });
  }
  $('#f-clear').addEventListener('click', ()=>{
    $('#f-action').value=''; $('#f-culture').value=''; $('#f-from').value=''; $('#f-to').value='';
    $('#rot-family').value=''; $('#rot-years').value='3';
    applyFilters(); applyRotationOverlay();
  });
  ['f-action','f-culture','f-from','f-to'].forEach(id=>{
    const el = document.getElementById(id);
    el && el.addEventListener('input', applyFilters);
    el && el.addEventListener('change', applyFilters);
  });

  /* ===== Rotation ===== */
  const withinYears = (dateStr, years)=>{
    const d = new Date(dateStr+'T00:00:00'); if(isNaN(d)) return false;
    const now = new Date(); const past = new Date(now.getFullYear()-years, now.getMonth(), now.getDate());
    return d >= past;
  };
  function applyRotationOverlay(){
    const fam = $('#rot-family').value || '';
    const yrs = Math.max(1, Math.min(6, Number($('#rot-years').value)||3));
    $$('#garden rect.plot').forEach(r=>{ r.classList.remove('rot-ok','rot-bad'); r.style.strokeDasharray=''; });
    if(!fam) return;
    const map = new Map(state.plots.map(p=>[p.id,p]));
    $$('#garden rect.plot').forEach(rect=>{
      const id = +(rect.dataset.id||rect.getAttribute('data-id'));
      const p = map.get(id) || {history:[]};
      const bad = (p.history||[]).some(h=>{
        const famKey = h.family;
        const isPlant = (h.actionKey==='semis' || h.actionKey==='plantation' || actionKeyFromLabel(h.action||'')==='semis' || actionKeyFromLabel(h.action||'')==='plantation');
        return famKey===fam && isPlant && withinYears(h.date, yrs);
      });
      rect.classList.add(bad ? 'rot-bad' : 'rot-ok');
    });
  }
  $('#rot-family').addEventListener('change', applyRotationOverlay);
  $('#rot-years').addEventListener('input', applyRotationOverlay);
// --- Globals chargés au boot ---
          

// --- Pont de clés cultDict (FR normalisées) -> clés EN du fichier compagnons ---
const COMP_BRIDGE = {
  // Solanacées
  tomate:"tomato", aubergine:"eggplant", poivron:"pepper", piment:"chili",
  pomme_de_terre:"potato",
  // Cucurbitacées
  courgette:"zucchini", concombre:"cucumber", potiron:"squash", butternut:"squash", melon:"melon",
  // Alliaceae / Apiaceae / etc.
  poireau:"leek", oignon:"onion", ail:"garlic", carotte:"carrot", persil:"parsley", céleri:"celery",
  // Légumineuses
  haricot_rame:"bean_pole", haricot_nain:"bean_bush", pois:"pea", feve:"fava",
  // Salades & racines
  laitue:"lettuce", epinard:"spinach", betterave:"beet", blette:"chard", radis:"radish",
  // Aromatiques & fleurs compagnes
  basilic:"basil", capucine:"nasturtium", souci:"calendula", oeillet_d_inde:"marigold",
  aneth:"dill", fenouil:"fennel",
  romarin:"rosemary", sauge:"sage", menthe:"mint", lavande:"lavender", bourrache:"borage",
  // Divers
  mais:"corn", fraise:"strawberry", tournesol:"sunflower",
  // Choux
  chou_blanc:"cabbage", chou_rouge:"cabbage", chou_fleur:"cauliflower", brocoli:"broccoli"
};
// Normalise "clé CULT" (accents → supprimés, espaces/’- → _)
function normKey(s){
  return (s||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
}

// Trouver l’entrée compagnon pour une ligne d’historique
function findCompanionEntryForHistoryItem(h){
  // 1) culture_key direct
  if (h.culture_key){
    const k = COMP_BRIDGE[h.culture_key] || COMP_BRIDGE[normKey(h.culture_key)];
    if (k) return COMP_IDX.get(k) || null;
  }
  // 2) via CULT (fr/nl/syn)
  const txt = (h.culture || h.culture_fr || h.culture_nl || '').toLowerCase();
  for (const [frKey,info] of Object.entries(CULT)){
    const bag = new Set([info.fr, info.nl, ...(info.syn||[])].filter(Boolean).map(s => s.toLowerCase()));
    if (bag.has(txt)){
      const enKey = COMP_BRIDGE[frKey] || COMP_BRIDGE[normKey(frKey)];
      return enKey ? (COMP_IDX.get(enKey) || null) : null;
    }
  }
  return null;
}

// --- Index des compagnons (clé EN -> objet du JSON compagnons) ---
let COMP_IDX = new Map();
function buildCompanionIndex(arr){
  COMP_IDX = new Map();
  (arr||[]).forEach(o => { if (o && o.key) COMP_IDX.set(o.key, o); });
}

// EN -> clé FR (reverse du bridge), utile pour libellés localisés depuis CULT
const BRIDGE_INV = Object.entries(COMP_BRIDGE)
  .reduce((m,[frKey,enKey]) => (m[enKey]=frKey, m), {});

// Libellé localisé pour une clé EN compagnon
function labelFromCompKey(enKey, lang='fr'){
  const frKey = BRIDGE_INV[enKey];
  if (frKey && CULT[frKey]) return (lang==='nl' ? CULT[frKey].nl : CULT[frKey].fr);
  const c = COMP_IDX.get(enKey);
  if (c) return (lang==='nl' ? (c.nl || c.fr || enKey) : (c.fr || c.nl || enKey));
  return enKey;
}

// Trouver l’entrée compagnon pour une ligne d’historique
function findCompanionEntryForHistoryItem(h){
  // 1) Si on a une clé de culture normalisée
  if (h.culture_key && COMP_BRIDGE[h.culture_key]){
    return COMP_IDX.get(COMP_BRIDGE[h.culture_key]) || null;
  }
  // 2) Sinon, tenter via CULT et les synonymes
  const txt = (h.culture || h.culture_fr || h.culture_nl || '').toLowerCase();
  for (const [frKey,info] of Object.entries(CULT)){
    const bag = new Set([info.fr, info.nl, ...(info.syn||[])].filter(Boolean).map(s => s.toLowerCase()));
    if (bag.has(txt)){
      const enKey = COMP_BRIDGE[frKey];
      return enKey ? (COMP_IDX.get(enKey) || null) : null;
    }
  }
  return null;
}

// Rendu du bloc “Compagnonnage”
function renderCompanionAdvice(plotId){
  const host = document.getElementById("history");
  if (!host) return;
  let box = document.getElementById("comp-advice");
  if(!box){
    box = document.createElement("div");
    box.id = "comp-advice";
    box.style.cssText = "border-top:1px solid #eee;padding-top:.5rem;margin-top:.5rem;font-size:.95rem";
    host.insertAdjacentElement("afterend", box);
  }
  const plot = state.plots.find(p=>p.id===plotId) || {history:[]};
  const lastCult = (plot.history||[]).find(h => (h.actionKey==="plantation" || h.actionKey==="semis"));
  if(!lastCult){ box.innerHTML = ""; return; }

  const compEntry = findCompanionEntryForHistoryItem(lastCult);
  if(!compEntry){ box.innerHTML = ""; return; }

  const friends = (compEntry.good||[]).map(k => labelFromCompKey(k, LANG)).join(", ") || "—";
  const enemies = (compEntry.bad ||[]).map(k => labelFromCompKey(k, LANG)).join(", ") || "—";
  const notes   = (LANG==='nl' ? (compEntry.notes_nl||"") : (compEntry.notes_fr||""));

  box.innerHTML = `
    <strong>${LANG==="nl"?"Gezelschapsplanten":"Compagnonnage"}</strong><br>
    <small>${LANG==="nl"?"Goede buren:":"Bons voisins:"}</small> ${friends}<br>
    <small>${LANG==="nl"?"Slechte buren:":"Mauvais voisins:"}</small> ${enemies}
    ${notes ? `<div style="margin-top:.25rem;color:#555"><em>${notes}</em></div>` : "" }
  `;
}


    /* ===== Sélecteurs + Lang ===== */
  function buildSelects(){
    const act = $('#action'), fAct = $('#f-action');
    const fam = $('#family'), rot = $('#rot-family');
    const opt = (v,txt)=>{ const o=document.createElement('option'); o.value=v; o.textContent=txt; return o; };

    act.innerHTML=''; fAct.innerHTML=''; fam.innerHTML=''; rot.innerHTML='';
    act.appendChild(opt('', I18N[LANG].action_type)); fAct.appendChild(opt('', I18N[LANG].f_any));
    ['semis','plantation','recolte','amendement','mulch_leaves','mulch_compost','mulch_brf','greenmanure_sow','greenmanure_cut','greenmanure_incorp','watering','hilling','weeding','bio_treatment','frost_protection','autre']
      .forEach(k=>{ act.appendChild(opt(k, ta(k))); fAct.appendChild(opt(k, ta(k))); });

    // Familles depuis FAMILIES
    fam.appendChild(opt('', FAMILIES.any?.[LANG] || FAMILIES.any?.fr || '(Toutes)'));
    rot.appendChild(opt('', FAMILIES.any?.[LANG] || FAMILIES.any?.fr || '(Toutes)'));
    Object.keys(FAMILIES).filter(k=>k!=='any').forEach(k=>{
      fam.appendChild(opt(k, tf(k)));
      rot.appendChild(opt(k, tf(k)));
    });
  }

  function patchFileInputsI18N(){
    const pairs = [
      { id:'import',    key:'import' },
      { id:'add-photo', key:'photos_add' }
    ];
    pairs.forEach(({id,key})=>{
      const input = document.getElementById(id); if(!input) return;
      if(!input.previousElementSibling || input.previousElementSibling.getAttribute('for')!==id){
        const lab = document.createElement('label');
        lab.className='file-proxy';
        lab.setAttribute('for', id);
        lab.style.cssText = "display:inline-block;margin:.35rem 0;padding:.4rem .6rem;border-radius:6px;background:#1976d2;color:#fff;cursor:pointer";
        input.insertAdjacentElement('beforebegin', lab);
      }
      input.style.display = 'none';
      input.previousElementSibling.textContent = t(key);
    });
  }

  function applyLang(){
    document.documentElement.lang = LANG;
    // Textes simples
    $$('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      if(key && I18N[LANG][key]) el.textContent = I18N[LANG][key];
    });
    // Placeholder
    $$('[data-i18n-ph]').forEach(el=>{
      const key = el.getAttribute('data-i18n-ph');
      if(key && I18N[LANG][key]) el.setAttribute('placeholder', I18N[LANG][key]);
    });
    // Compost vertical
    const compostLabel = document.querySelector('#garden [data-role="compost-label"]');
    if(compostLabel) compostLabel.textContent = I18N[LANG].compost;

    buildSelects();
    ensureTitlesAndLabels();
    patchFileInputsI18N();
    if(currentId!=null){ titleEl.textContent = `${t('ui_parcel')} ${currentId}`; renderHistory(currentId); }
  }

  $('#lang-toggle').addEventListener('click', ()=>{
    LANG = (LANG==='fr' ? 'nl' : 'fr');
    localStorage.setItem('lang', LANG);
    applyLang();
  });

  /* ===== Photos (ajout/suppression) ===== */
  async function fileToDataURL(file, max=1280){
    const img = new Image(); const fr = new FileReader();
    const p = new Promise((res,rej)=>{ fr.onload=()=>{ img.onload=()=>res(); img.onerror=rej; img.src=fr.result; }; fr.onerror=rej; });
    fr.readAsDataURL(file); await p;
    const w=img.naturalWidth, h=img.naturalHeight; const scale=Math.min(1, max/Math.max(w,h));
    const cw=Math.round(w*scale), ch=Math.round(h*scale);
    const c=document.createElement('canvas'); c.width=cw; c.height=ch;
    c.getContext('2d').drawImage(img,0,0,cw,ch);
    return c.toDataURL('image/jpeg', 0.85);
  }
  $('#add-photo').addEventListener('change', async ev=>{
    if(currentId==null) return;
    const files = Array.from(ev.target.files||[]).slice(0,12);
    if(!files.length) return;
    const plot = state.plots.find(p=>p.id===currentId); plot.photos = plot.photos||[];
    for(const f of files){ try{ plot.photos.push(await fileToDataURL(f)); }catch{} }
    saveLocal(state); renderHistory(currentId); ev.target.value='';
  });
  $('#photos').addEventListener('click', e=>{
    if(!e.target.classList.contains('del')) return;
    const fig = e.target.closest('figure'); const idx = +fig.dataset.idx;
    const plot = state.plots.find(p=>p.id===currentId);
    plot.photos.splice(idx,1); saveLocal(state); renderHistory(currentId);
  });

  /* ===== Chargement JSON & init ===== */
  async function boot(){
  // charger dictionnaires
  const [families, cult, comp] = await Promise.all([
    fetch('./families.json').then(r=>r.json()).catch(()=>({})),
    fetch('./cultDict.json').then(r=>r.json()).catch(()=>({})),
    fetch('./companions_bilingual.json').then(r=>r.json()).catch(()=>([]))
  ]);

  FAMILIES = families || {};
  CULT     = cult     || {};
  COMP     = Array.isArray(comp) ? comp : [];

  // index compagnonnage
  buildCompanionIndex(COMP);

  // premier rendu (ton ordre habituel)
  ensureTitlesAndLabels();
  applyRecencyColors();
  buildSelects();
  applyFilters();
  applyRotationOverlay();
  applyLang(); // finalise labels + placeholders + file labels
}

  boot();
})();
