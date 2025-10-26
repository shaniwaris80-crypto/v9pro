/* =======================================================
   🥝 ARSLAN PRO V10 ULTRA — app.js (SIN PIN, COMPLETO)
==========================================================*/
(function(){
"use strict";

/* ---------- HELPERS ---------- */
const $  = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
const money = n => (isNaN(n)?0:n).toFixed(2).replace('.', ',') + " €";
const parseNum = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
const escapeHTML = s => String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
const todayISO = () => new Date().toISOString();
const fmtDateDMY = (d) => `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
const unMoney = s => parseFloat(String(s).replace(/\./g,'').replace(',','.').replace(/[^\d.]/g,'')) || 0;

/* ---------- KEYS & STATE ---------- */
const K_CLIENTES='arslan_v10_clientes', K_PRODUCTOS='arslan_v10_productos', K_FACTURAS='arslan_v10_facturas', K_PRICEHIST='arslan_v10_pricehist';
const K_DRAFT='arslan_v10_draft', K_THEME='arslan_v10_theme';
const K_FIRMA_PROV='arslan_v10_firma_prov', K_FIRMA_CLI='arslan_v10_firma_cli';

let clientes  = safeParse(localStorage.getItem(K_CLIENTES), []);
let productos = safeParse(localStorage.getItem(K_PRODUCTOS), []);
let facturas  = safeParse(localStorage.getItem(K_FACTURAS), []);
let priceHist = safeParse(localStorage.getItem(K_PRICEHIST), {});
let firmaProv = localStorage.getItem(K_FIRMA_PROV) || '';
let firmaCli  = localStorage.getItem(K_FIRMA_CLI)  || '';

function safeParse(json, fallback){ try{ const v=JSON.parse(json||''); return v??fallback; }catch{ return fallback; } }
function downloadJSON(obj, filename){
  const blob = new Blob([JSON.stringify(obj,null,2)], {type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function uploadJSON(cb){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json,application/zip,.zip';
  inp.onchange=e=>{ const f=e.target.files[0]; if(!f) return;
    if(f.name.endsWith('.zip')){ // restaurar zip
      JSZip.loadAsync(f).then(zip=>{
        Promise.all([
          zip.file('clientes.json')?.async('string'),
          zip.file('productos.json')?.async('string'),
          zip.file('facturas.json')?.async('string'),
          zip.file('priceHist.json')?.async('string'),
          zip.file('firmaProv.txt')?.async('string'),
          zip.file('firmaCli.txt')?.async('string')
        ]).then(([c,p,fa,ph,fp,fc])=>{
          cb({zip:true,
            clientes: c?JSON.parse(c):undefined,
            productos: p?JSON.parse(p):undefined,
            facturas: fa?JSON.parse(fa):undefined,
            priceHist: ph?JSON.parse(ph):undefined,
            firmaProv: fp||'',
            firmaCli: fc||''
          });
        });
      }).catch(()=>alert('ZIP inválido'));
    } else {
      const r=new FileReader(); r.onload=()=>{ try{ cb(JSON.parse(r.result)); }catch{ alert('JSON inválido'); } }; r.readAsText(f);
    }
  };
  inp.click();
}

/* ---------- THEME (dark / light) ---------- */
(function initTheme(){
  const saved = localStorage.getItem(K_THEME);
  if(saved==='dark') document.documentElement.classList.add('dark');
  $('#themeToggle').checked = document.documentElement.classList.contains('dark');
  $('#themeToggle').addEventListener('change', (e)=>{
    document.documentElement.classList.toggle('dark', e.target.checked);
    localStorage.setItem(K_THEME, e.target.checked ? 'dark' : 'light');
  });
})();

/* ---------- Splash sin PIN ---------- */

})();

/* ---------- NAV ---------- */
function switchTab(id){
  $$('button.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  $$('section.panel').forEach(p=>p.classList.toggle('active', p.dataset.tabPanel===id));
  if(id==='resumen'){ drawResumen(); drawCharts(); }
  if(id==='productos'){ renderProductos(); }
  if(id==='facturas'){ renderFacturas(); }
}
$$('button.tab').forEach(b=>b.addEventListener('click', ()=>switchTab(b.dataset.tab)));
switchTab('factura');

/* ---------- DOM refs ---------- */
const lineasDiv=$('#lineas');
const btnAddLinea=$('#btnAddLinea'); const btnVaciarLineas=$('#btnVaciarLineas');

const prov = { nombre: $('#provNombre'), nif: $('#provNif'), dir: $('#provDir'), tel: $('#provTel'), email: $('#provEmail') };
const cli  = { nombre: $('#cliNombre'), nif: $('#cliNif'), dir: $('#cliDir'), tel: $('#cliTel'), email: $('#cliEmail') };
const selCliente = $('#selCliente'); const btnNuevoCliente = $('#btnNuevoCliente');

const chkTransporte = $('#chkTransporte'); const chkIvaIncluido = $('#chkIvaIncluido');
const estado = $('#estado'); const pagadoInp = $('#pagado'); const metodoPago = $('#metodoPago'); const observaciones = $('#observaciones');

const subtotalEl = $('#subtotal'); const transpEl = $('#transp'); const ivaEl = $('#iva'); const totalEl = $('#total');
const mostPagadoEl = $('#mostPagado'); const pendienteEl = $('#pendiente');

const btnGuardar = $('#btnGuardar'); const btnImprimir = $('#btnImprimir'); const btnNueva = $('#btnNueva');
const btnShareWA = $('#btnShareWA'); const btnShareMail=$('#btnShareMail');

const listaClientes = $('#listaClientes'); const btnAddCliente = $('#btnAddCliente'); const buscarCliente=$('#buscarCliente');
const btnExportClientes = $('#btnExportClientes'); const btnImportClientes = $('#btnImportClientes');

const filtroEstado = $('#filtroEstado'); const buscaCliente = $('#buscaCliente'); const listaFacturas = $('#listaFacturas');
const btnExportFacturas = $('#btnExportFacturas'); const btnImportFacturas = $('#btnImportFacturas');
const fechaDesde=$('#fechaDesde'), fechaHasta=$('#fechaHasta'); const facturasTotales=$('#facturasTotales');

const rHoy=$('#rHoy'), rSemana=$('#rSemana'), rMes=$('#rMes'), rTotal=$('#rTotal');
const resGlobal=$('#resGlobal'), resPorCliente=$('#resPorCliente');
const btnResetCliente=$('#btnResetCliente'), btnResetGlobal=$('#btnResetGlobal');
const btnBackup=$('#btnBackup'), btnRestore=$('#btnRestore');
const btnBackupZip=$('#btnBackupZip'), btnRestoreZip=$('#btnRestoreZip');
const chartDiario=$('#chartDiario'), chartMensual=$('#chartMensual');

const listaProductos=$('#listaProductos');
const firmaProvFile=$('#firmaProvFile'), firmaCliFile=$('#firmaCliFile');

// PRINT refs
const pNum=$('#p-num'), pFecha=$('#p-fecha'), pProv=$('#p-prov'), pCli=$('#p-cli'), pTabla=$('#p-tabla tbody');
const pSub=$('#p-sub'), pTra=$('#p-tra'), pIva=$('#p-iva'), pTot=$('#p-tot'), pEstado=$('#p-estado'), pMetodo=$('#p-metodo'), pObs=$('#p-obs');
const pFirmaProv=$('#p-firma-prov'), pFirmaCli=$('#p-firma-cli');

// Panel historial precios
const pricePanel = $('#pricePanel'), ppBody = $('#ppBody');
let hidePanelTimer=null;
function showPricePanel(){ if(pricePanel.hasAttribute('hidden')) pricePanel.removeAttribute('hidden'); clearTimeout(hidePanelTimer); }
function scheduleHidePricePanel(){ clearTimeout(hidePanelTimer); hidePanelTimer=setTimeout(()=>pricePanel.setAttribute('hidden',''), 5000); }
pricePanel?.addEventListener('mouseenter', ()=>clearTimeout(hidePanelTimer));
pricePanel?.addEventListener('mouseleave', scheduleHidePricePanel);

/* ---------- FIRMAS ---------- */
function fileToDataUrl(file, cb){
  if(!file) return;
  const fr=new FileReader(); fr.onload=()=>cb(fr.result); fr.readAsDataURL(file);
}
function refreshSignatures(){
  if(pFirmaProv) pFirmaProv.src = firmaProv || '';
  if(pFirmaCli)  pFirmaCli.src  = firmaCli  || '';
}
firmaProvFile?.addEventListener('change', e=> fileToDataUrl(e.target.files[0], data=>{ firmaProv=data; localStorage.setItem(K_FIRMA_PROV,firmaProv); refreshSignatures(); }));
firmaCliFile ?.addEventListener('change', e=> fileToDataUrl(e.target.files[0], data=>{ firmaCli =data; localStorage.setItem(K_FIRMA_CLI ,firmaCli ); refreshSignatures(); }));
refreshSignatures();

/* ---------- PRECIO HISTORIAL ---------- */
function savePriceHist(){ localStorage.setItem(K_PRICEHIST, JSON.stringify(priceHist)); }
function lastPrice(name){ const arr = priceHist[name]; return arr?.length ? arr[0].price : null; }
function pushPriceHistory(name, price){
  if(!name || !(price>0)) return;
  const arr = priceHist[name] || [];
  arr.unshift({price, date: todayISO()});
  priceHist[name] = arr.slice(0,10);
  savePriceHist();
}
function renderPriceHistory(name){
  showPricePanel();
  const hist = priceHist[name] || [];
  if(hist.length===0){ ppBody.innerHTML = `<div class="pp-row"><span>${escapeHTML(name)}</span><strong>Sin historial</strong></div>`; scheduleHidePricePanel(); return; }
  ppBody.innerHTML = `<div class="pp-row" style="justify-content:center"><strong>${escapeHTML(name)}</strong></div>` +
    hist.slice(0,10).map(h=>`<div class="pp-row"><span>${fmtDateDMY(new Date(h.date))}</span><strong>${money(h.price)}</strong></div>`).join('');
  scheduleHidePricePanel();
}

/* ---------- CLIENTES ---------- */
function uniqueByName(arr){
  const map=new Map();
  arr.forEach(c=>{ const key=(c.nombre||'').trim().toLowerCase(); if(!key) return; if(!map.has(key)) map.set(key,c); });
  return [...map.values()];
}
function saveClientes(){ localStorage.setItem(K_CLIENTES, JSON.stringify(clientes)); }
function seedClientesIfEmpty(){
  if(clientes.length>0) return;
  clientes = uniqueByName([
    {nombre:'Riviera — CONOR ESY SLU', nif:'B16794893', dir:'Paseo del Espolón, 09003 Burgos'},
    {nombre:'Alesal Pan / Café de Calle San Lesmes — Alesal Pan y Café S.L.', nif:'B09582420', dir:'C/ San Lesmes 1, Burgos'},
    {nombre:'Al Pan Pan Burgos, S.L.', nif:'B09569344', dir:'C/ Miranda 17, Bajo, 09002 Burgos', tel:'947 277 977', email:'bertiz.miranda@gmail.com'},
    {nombre:'Cuevas Palacios Restauración S.L. (Con/sentidos)', nif:'B10694792', dir:'C/ San Lesmes, 1 – 09004 Burgos', tel:'947 20 35 51'},
    {nombre:'Café Bar Nuovo (Einy Mercedes Olivo Jiménez)', nif:'120221393', dir:'C/ San Juan de Ortega 14, 09007 Burgos'},
    {nombre:'Hotel Cordon'},{nombre:'Vaivén Hostelería'},{nombre:'Grupo Resicare'},{nombre:'Carlos Alameda Peralta & Seis Más'},
    {nombre:'Tabalou Development SLU', nif:'ES B09567769'},
    {nombre:'Golden Garden — David Herrera Estalayo', nif:'71281665L', dir:'Trinidad, 12, 09003 Burgos'},
    {nombre:'Romina — PREMIER', dir:'C/ Madrid 42, Burgos'},
    {nombre:'Abbas — Locutorio Gamonal', dir:'C/ Derechos Humanos 45, Burgos'},
    {nombre:'Nadeem Bhai — RIA Locutorio', dir:'C/ Vitoria 137, Burgos'},
    {nombre:'Mehmood — Mohsin Telecom', dir:'C/ Vitoria 245, Burgos'},
    {nombre:'Adnan Asif', nif:'X7128589S', dir:'C/ Padre Flórez 3, Burgos'},
    {nombre:'Imran Khan — Estambul', dir:'Avda. del Cid, Burgos'},
    {nombre:'Waqas Sohail', dir:'C/ Vitoria, Burgos'},
    {nombre:'Malik — Locutorio Malik', dir:'C/ Progreso, Burgos'},
    {nombre:'Angela', dir:'C/ Madrid, Burgos'},
    {nombre:'Aslam — Locutorio Aslam', dir:'Avda. del Cid, Burgos'},
    {nombre:'Victor Pelu — Tienda Centro', dir:'Burgos Centro'},
    {nombre:'Domingo'},{nombre:'Bar Tropical'},
    {nombre:'Bar Punta Cana — PUNTA CANA', dir:'C/ Los Titos, Burgos'},
    {nombre:'Jose — Alimentación Patxi', dir:'C/ Camino Casa la Vega 33, Burgos'},
    {nombre:'Ideal — Ideal Supermercado', dir:'Avda. del Cid, Burgos'}
  ]);
  saveClientes();
}
function renderClientesSelect(){
  selCliente.innerHTML = `<option value="">— Seleccionar cliente —</option>`;
  [...clientes].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'')).forEach((c,i)=>{
    const opt=document.createElement('option'); opt.value=i; opt.textContent=c.nombre||`Cliente ${i+1}`; selCliente.appendChild(opt);
  });
}
function renderClientesLista(){
  listaClientes.innerHTML='';
  const q=(buscarCliente.value||'').toLowerCase();
  const arr=[...clientes].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'' ));
  const view = q ? arr.filter(c=> (c.nombre||'').toLowerCase().includes(q) || (c.nif||'').toLowerCase().includes(q)) : arr;
  if(view.length===0){ listaClientes.innerHTML='<div class="item">Sin clientes.</div>'; return; }
  view.forEach((c,idx)=>{
    const row=document.createElement('div'); row.className='item';
    row.innerHTML=`
      <div>
        <strong>${escapeHTML(c.nombre||'(Sin nombre)')}</strong>
        <div class="meta">${escapeHTML(c.nif||'')} · ${escapeHTML(c.dir||'')}</div>
        <div class="meta">${escapeHTML(c.tel||'')} ${c.email?('· '+escapeHTML(c.email)) : ''}</div>
      </div>
      <div class="row">
        <button class="btn small" data-e="select" data-i="${idx}">Usar</button>
        <button class="btn small" data-e="edit" data-i="${idx}">Editar</button>
        <button class="btn small ghost" data-e="del" data-i="${idx}">Borrar</button>
      </div>`;
    listaClientes.appendChild(row);
  });
  listaClientes.querySelectorAll('button').forEach(b=>{
    const i = +b.dataset.i;
    b.addEventListener('click', ()=>{
      if(b.dataset.e==='del'){
        if(confirm('¿Eliminar cliente?')){ clientes.splice(i,1); saveClientes(); renderClientesSelect(); renderClientesLista(); }
      } else if(b.dataset.e==='select'){
        const c=clientes[i]; cli.nombre.value=c.nombre||''; cli.nif.value=c.nif||''; cli.dir.value=c.dir||''; cli.tel.value=c.tel||''; cli.email.value=c.email||''; switchTab('factura');
      } else {
        const c=clientes[i];
        const nombre = prompt('Nombre', c.nombre||'') ?? c.nombre;
        const nif    = prompt('NIF/CIF', c.nif||'') ?? c.nif;
        const dir    = prompt('Dirección', c.dir||'') ?? c.dir;
        const tel    = prompt('Teléfono', c.tel||'') ?? c.tel;
        const email  = prompt('Email', c.email||'') ?? c.email;
        clientes[i]={nombre,nif,dir,tel,email}; saveClientes(); renderClientesSelect(); renderClientesLista();
      }
    });
  });
}
btnNuevoCliente?.addEventListener('click', ()=>switchTab('clientes'));
btnAddCliente?.addEventListener('click', ()=>{
  const nombre=prompt('Nombre del cliente:'); if(!nombre) return;
  const nif=prompt('NIF/CIF:')||''; const dir=prompt('Dirección:')||''; const tel=prompt('Teléfono:')||''; const email=prompt('Email:')||'';
  clientes.push({nombre,nif,dir,tel,email}); saveClientes(); renderClientesSelect(); renderClientesLista();
});
buscarCliente?.addEventListener('input', renderClientesLista);
btnExportClientes?.addEventListener('click', ()=>downloadJSON(clientes,'clientes-arslan-v10.json'));
btnImportClientes?.addEventListener('click', ()=>uploadJSON(arr=>{
  if(arr?.zip){ if(arr.clientes) clientes=uniqueByName(arr.clientes); saveClientes(); renderClientesSelect(); renderClientesLista(); return; }
  if(Array.isArray(arr)){ clientes=uniqueByName(arr); saveClientes(); renderClientesSelect(); renderClientesLista(); }
}));
selCliente?.addEventListener('change', ()=>{
  const i=selCliente.value; if(i==='') return; const c=clientes[+i]; if(!c) return;
  cli.nombre.value=c.nombre||''; cli.nif.value=c.nif||''; cli.dir.value=c.dir||''; cli.tel.value=c.tel||''; cli.email.value=c.email||'';
  saveDraft();
});

/* ---------- PRODUCTOS ---------- */
function saveProductos(){ localStorage.setItem(K_PRODUCTOS, JSON.stringify(productos)); }
const PRODUCT_NAMES = [
"GRANNY FRANCIA","MANZANA PINK LADY","MANDARINA COLOMBE","KIWI ZESPRI GOLD","PARAGUAYO","KIWI TOMASIN PLANCHA","PERA RINCON DEL SOTO","MELOCOTON PRIMERA","AGUACATE GRANEL","MARACUYÁ",
"MANZANA GOLDEN 24","PLATANO CANARIO PRIMERA","MANDARINA HOJA","MANZANA GOLDEN 20","NARANJA TOMASIN","NECTARINA","NUECES","SANDIA","LIMON SEGUNDA","MANZANA FUJI",
"NARANJA MESA SONRISA","JENGIBRE","BATATA","AJO PRIMERA","CEBOLLA NORMAL","CALABAZA GRANDE","PATATA LAVADA","TOMATE CHERRY RAMA","TOMATE CHERRY PERA","TOMATE DANIELA","TOMATE ROSA PRIMERA",
"CEBOLLINO","TOMATE ASURCADO MARRON","TOMATE RAMA","PIMIENTO PADRON","ZANAHORIA","PEPINO","CEBOLLETA","PUERROS","BROCOLI","JUDIA VERDE","BERENJENA","PIMIENTO ITALIANO VERDE",
"PIMIENTO ITALIANO ROJO","CHAMPIÑON","UVA ROJA","UVA BLANCA","ALCACHOFA","CALABACIN","COLIFLOR","BATAVIA","ICEBERG","MANDARINA SEGUNDA","MANZANA GOLDEN 28","NARANJA ZUMO","KIWI SEGUNDA",
"MANZANA ROYAL GALA 24","PLATANO CANARIO SUELTO","CEREZA","FRESAS","ARANDANOS","ESPINACA","PEREJIL","CILANTRO","ACELGAS","PIMIENTO VERDE","PIMIENTO ROJO","MACHO VERDE","MACHO MADURO",
"YUCA","AVOCADO","CEBOLLA ROJA","MENTA","HABANERO","RABANITOS","POMELO","PAPAYA","REINETA 28","NISPERO","ALBARICOQUE","TOMATE PERA","TOMATE BOLA","TOMATE PINK","VALVENOSTA GOLDEN",
"MELOCOTON ROJO","MELON GALIA","APIO","NARANJA SANHUJA","LIMON PRIMERA","MANGO","MELOCOTON AMARILLO","VALVENOSTA ROJA","PIÑA","NARANJA HOJA","PERA CONFERENCIA SEGUNDA","CEBOLLA DULCE",
"TOMATE ASURCADO AZUL","ESPARRAGOS BLANCOS","ESPARRAGOS TRIGUEROS","REINETA PRIMERA","AGUACATE PRIMERA","COCO","NECTARINA SEGUNDA","REINETA 24","NECTARINA CARNE BLANCA","GUINDILLA",
"REINETA VERDE","PATATA 25KG","PATATA 5 KG","TOMATE RAFF","REPOLLO","KIWI ZESPRI","PARAGUAYO SEGUNDA","MELON","REINETA 26","TOMATE ROSA","MANZANA CRIPS",
"ALOE VERA PIEZAS","TOMATE ENSALADA","PATATA 10KG","MELON BOLLO","CIRUELA ROJA","LIMA","GUINEO VERDE","SETAS","BANANA","BONIATO","FRAMBUESA","BREVAS","PERA AGUA","YAUTIA","YAME",
"OKRA","MANZANA MELASSI","CACAHUETE","SANDIA NEGRA","SANDIA RAYADA","HIGOS","KUMATO","KIWI CHILE","MELOCOTON AMARILLO SEGUNDA","HIERBABUENA","REMOLACHA","LECHUGA ROMANA","CEREZA",
"KAKI","CIRUELA CLAUDIA","PERA LIMONERA","CIRUELA AMARILLA","HIGOS BLANCOS","UVA ALVILLO","LIMON EXTRA","PITAHAYA ROJA","HIGO CHUMBO","CLEMENTINA","GRANADA","NECTARINA PRIMERA BIS",
"CHIRIMOYA","UVA CHELVA","PIMIENTO CALIFORNIA VERDE","KIWI TOMASIN","PIMIENTO CALIFORNIA ROJO","MANDARINA SATSUMA","CASTAÑA","CAKI","MANZANA KANZI","PERA ERCOLINA","NABO",
"UVA ALVILLO NEGRA","CHAYOTE","ROYAL GALA 28","MANDARINA PRIMERA","PIMIENTO PINTON","MELOCOTON AMARILLO DE CALANDA","HINOJOS","MANDARINA DE HOJA","UVA ROJA PRIMERA","UVA BLANCA PRIMERA"
];
function seedProductsIfEmpty(){ if(productos.length>0) return; productos=PRODUCT_NAMES.map(n=>({name:n})); saveProductos(); }
function findProducto(name){ return productos.find(p=>(p.name||'').toLowerCase()===String(name).toLowerCase()); }

function renderProductos(){
  if(!listaProductos) return;
  listaProductos.innerHTML = `
    <div class="prod-header">
      <button id="btnNuevoProd" class="btn green" title="Clic: 1 producto · Shift+Clic: varios">➕ Añadir producto nuevo</button>
      <input id="buscarProducto" placeholder="🔍 Buscar producto..." style="flex:1;padding:8px;margin-left:10px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--fg);">
    </div>
    <div id="gridProductos" class="grid-productos"></div>
  `;

  const grid = $('#gridProductos');
  const buscar = $('#buscarProducto');
  const btnNuevo = $('#btnNuevoProd');

  function filtrarYMostrar(){
    const q = (buscar.value || '').toLowerCase();
    const view = q ? productos.filter(p => (p.name || '').toLowerCase().includes(q)) : productos;
    mostrar(view);
  }
  function mostrar(lista){
    grid.innerHTML = '';
    if(lista.length === 0){
      grid.innerHTML = '<div class="item" style="grid-column:1 / span 3;text-align:center;color:#777;">Sin resultados.</div>';
      return;
    }
    lista.forEach((p,idx)=>{
      const card = document.createElement('div');
      card.className = 'prod-card';
      card.innerHTML = `
        <div class="prod-name"><strong>${escapeHTML(p.name||'(sin nombre)')}</strong></div>
        <div class="prod-fields">
          <select data-f="mode">
            <option value="" ${!p.mode?'selected':''}>—</option>
            <option value="kg" ${p.mode==='kg'?'selected':''}>kg</option>
            <option value="unidad" ${p.mode==='unidad'?'selected':''}>unidad</option>
            <option value="caja" ${p.mode==='caja'?'selected':''}>caja</option>
          </select>
          <input type="number" step="0.01" min="0" value="${p.boxKg??''}" data-f="boxKg" placeholder="Kg/caja">
          <input type="number" step="0.01" min="0" value="${p.price??''}" data-f="price" placeholder="€ base">
          <input value="${escapeHTML(p.origin||'')}" data-f="origin" placeholder="Origen">
        </div>
        <div class="prod-actions">
          <button class="btn small" data-e="save" data-i="${idx}">💾</button>
          <button class="btn small ghost" data-e="del" data-i="${idx}">🗑️</button>
        </div>
      `;
      grid.appendChild(card);
    });
    grid.querySelectorAll('button').forEach(b=>{
      const i = +b.dataset.i;
      b.addEventListener('click', ()=>{
        if(b.dataset.e==='del'){
          if(confirm('¿Eliminar producto?')){ productos.splice(i,1); saveProductos(); filtrarYMostrar(); }
        } else if(b.dataset.e==='save'){
          const card=b.closest('.prod-card');
          const get=f=>card.querySelector(`[data-f="${f}"]`).value.trim();
          const mode=(get('mode')||null);
          const boxKgStr=get('boxKg'); const boxKg = boxKgStr===''?null:parseNum(boxKgStr);
          const priceStr=get('price'); const price = priceStr===''?null:parseNum(priceStr);
          const origin=get('origin')||null;
          productos[i]={...productos[i], mode, boxKg, price, origin};
          saveProductos();
        }
      });
    });
  }

  // Añadir nuevo (simple o múltiple con Shift)
  btnNuevo.addEventListener('click', (e)=>{
    if(e.shiftKey){ 
      const texto = prompt('Pega aquí los nombres de los productos (uno por línea):');
      if(!texto) return;
      const nuevos = texto.split(/\n+/).map(t => t.trim()).filter(t => t.length > 0 && !productos.some(p => (p.name||'').toLowerCase() === t.toLowerCase()));
      if(nuevos.length === 0){ alert('No se han detectado nuevos productos.'); return; }
      nuevos.forEach(n => productos.push({name:n}));
      saveProductos(); filtrarYMostrar();
      setTimeout(()=>grid.lastElementChild?.scrollIntoView({behavior:'smooth', block:'center'}), 200);
      alert(`${nuevos.length} productos añadidos correctamente.`);
    } else {
      const nombre = prompt('Nombre del nuevo producto:'); if(!nombre) return;
      productos.push({name:nombre}); saveProductos(); filtrarYMostrar();
      setTimeout(()=>{ const last = grid.lastElementChild; if(last){ last.scrollIntoView({behavior:'smooth', block:'center'}); last.classList.add('highlight'); setTimeout(()=>last.classList.remove('highlight'), 2000); } }, 200);
    }
  });

  buscar.addEventListener('input', filtrarYMostrar);
  filtrarYMostrar();
}

/* ---------- FACTURA: líneas ---------- */
function lineaHTML(){
  const wrap=document.createElement('div');
  wrap.className='linea';
  wrap.innerHTML=`
    <div class="suggest-box">
      <input class="name" placeholder="Producto">
      <div class="suggest-list" hidden></div>
    </div>
    <select class="mode">
      <option value="">—</option><option value="kg">kg</option><option value="unidad">unidad</option><option value="caja">caja</option>
    </select>
    <input class="qty" type="number" inputmode="numeric" min="0" step="1" placeholder="Cant.">
    <input class="gross" type="number" min="0" step="0.01" placeholder="Bruto kg">
    <input class="tare" type="number" min="0" step="0.01" placeholder="Tara kg">
    <input class="net" type="number" min="0" step="0.01" placeholder="Neto kg" disabled>
    <input class="price" type="number" min="0" step="0.01" placeholder="Precio">
    <input class="origin" placeholder="Origen">
    <input class="amount" placeholder="Importe" disabled>
    <button class="del">✕</button>
  `;

  const nameInp=wrap.querySelector('.name'), list=wrap.querySelector('.suggest-list'), modeInp=wrap.querySelector('.mode');
  const qtyInp=wrap.querySelector('.qty'), grossInp=wrap.querySelector('.gross'), tareInp=wrap.querySelector('.tare'), netInp=wrap.querySelector('.net');
  const priceInp=wrap.querySelector('.price'), originInp=wrap.querySelector('.origin'), amtInp=wrap.querySelector('.amount');

  const showHist=()=>{ const n=nameInp.value.trim(); if(n){ renderPriceHistory(n); } };
  nameInp.addEventListener('focus', showHist); priceInp.addEventListener('focus', showHist);

  nameInp.addEventListener('input', ()=>{
    const q=nameInp.value.trim().toLowerCase(); 
    if(!q){ list.hidden=true; list.innerHTML=''; return; }
    const matches=productos.filter(p=>p.name?.toLowerCase().includes(q)).slice(0,20);
    if(matches.length===0){ list.hidden=true; list.innerHTML=''; return; }
    list.innerHTML='';
    matches.forEach(p=>{
      const last=lastPrice(p.name);
      const btn=document.createElement('button'); btn.type='button';
      btn.textContent=`${p.name}${p.mode?` · ${p.mode}`:''}${p.boxKg?` · ${p.boxKg}kg/caja`:''}${p.price!=null?` · base ${p.price}€`:''}${p.origin?` · ${p.origin}`:''}${last?` · último ${last}€`:''}`;
      btn.addEventListener('click', ()=>{
        nameInp.value=p.name;
        if(p.mode){ modeInp.value=p.mode; }
        if(p.price!=null){ priceInp.value=p.price; }
        if(p.origin){ originInp.value=p.origin; }
        list.hidden=true; recalcLine(); renderPriceHistory(p.name); saveDraft();
      });
      list.appendChild(btn);
    });
    list.hidden=false;
  });
  nameInp.addEventListener('blur',()=>setTimeout(()=>list.hidden=true,150));

  [modeInp, qtyInp, grossInp, tareInp, priceInp, originInp].forEach(el=>el.addEventListener('input', ()=>{ recalcLine(); saveDraft(); }));
  wrap.querySelector('.del').addEventListener('click', ()=>{ wrap.remove(); recalc(); saveDraft(); });

  function recalcLine(){
    const mode=(modeInp.value||'').toLowerCase();
    const qty=Math.max(0, Math.floor(parseNum(qtyInp.value||0)));
    const gross=Math.max(0, parseNum(grossInp.value||0));
    const tare=Math.max(0, parseNum(tareInp.value||0));
    const price=Math.max(0, parseNum(priceInp.value||0));
    let net=0;

    if(gross>0){ net=Math.max(0,gross - tare); }
    else if(mode==='caja'){ const p=findProducto(nameInp.value); const kg=p?.boxKg||0; net = qty * kg; }
    else if(mode==='kg'){ net = qty; }
    else if(mode==='unidad'){ net = qty; }

    netInp.value = net ? net.toFixed(2) : '';
    const amount = (mode==='unidad') ? qty*price : net*price;
    amtInp.value = amount>0 ? amount.toFixed(2) : '';

    recalc();
  }
  return wrap;
}
function addLinea(){ lineasDiv.appendChild(lineaHTML()); }
btnAddLinea?.addEventListener('click', ()=>{ addLinea(); saveDraft(); });
btnVaciarLineas?.addEventListener('click', ()=>{ if(confirm('¿Vaciar todas las líneas?')){ lineasDiv.innerHTML=''; for(let i=0;i<5;i++) addLinea(); recalc(); saveDraft(); } });

function getLineas(){
  return $$('.linea').map(r=>{
    const name=r.querySelector('.name').value.trim();
    const mode=r.querySelector('.mode').value.trim().toLowerCase();
    const qty=Math.max(0, Math.floor(parseNum(r.querySelector('.qty').value||0)));
    const gross=Math.max(0, parseNum(r.querySelector('.gross').value||0));
    const tare=Math.max(0, parseNum(r.querySelector('.tare').value||0));
    const net=Math.max(0, parseNum(r.querySelector('.net').value||0));
    const price=Math.max(0, parseNum(r.querySelector('.price').value||0));
    const origin=r.querySelector('.origin').value.trim();
    return {name,mode,qty,gross,tare,net,price,origin};
  }).filter(l=> l.name && (l.qty>0 || l.net>0 || l.gross>0) );
}
function lineImporte(l){ return (l.mode==='unidad') ? l.qty*l.price : l.net*l.price; }

/* ---------- AUTO-SAVE ---------- */
function saveDraft(){
  const draft = {
    proveedor:{nombre:prov.nombre.value,nif:prov.nif.value,dir:prov.dir.value,tel:prov.tel.value,email:prov.email.value},
    cliente:{nombre:cli.nombre.value,nif:cli.nif.value,dir:cli.dir.value,tel:cli.tel.value,email:cli.email.value},
    lineas: getLineas(),
    opciones:{transporte:chkTransporte.checked, ivaIncluido:chkIvaIncluido.checked, estado:estado.value, pagado:pagadoInp.value, metodo:metodoPago.value, obs:observaciones.value}
  };
  localStorage.setItem(K_DRAFT, JSON.stringify(draft));
}
function loadDraft(){
  const d = safeParse(localStorage.getItem(K_DRAFT), null); if(!d) return;
  prov.nombre.value=d.proveedor?.nombre||''; prov.nif.value=d.proveedor?.nif||''; prov.dir.value=d.proveedor?.dir||''; prov.tel.value=d.proveedor?.tel||''; prov.email.value=d.proveedor?.email||'';
  cli.nombre.value=d.cliente?.nombre||''; cli.nif.value=d.cliente?.nif||''; cli.dir.value=d.cliente?.dir||''; cli.tel.value=d.cliente?.tel||''; cli.email.value=d.cliente?.email||'';
  lineasDiv.innerHTML=''; for(const l of (d.lineas||[])){ const w=lineaHTML(); lineasDiv.appendChild(w);
    w.querySelector('.name').value=l.name||''; w.querySelector('.mode').value=l.mode||''; w.querySelector('.qty').value=l.qty||''; w.querySelector('.gross').value=l.gross||''; w.querySelector('.tare').value=l.tare||''; w.querySelector('.net').value=l.net||''; w.querySelector('.price').value=l.price||''; w.querySelector('.origin').value=l.origin||''; w.querySelector('.amount').value = (l.mode==='unidad')?(l.qty*l.price).toFixed(2):((l.net*l.price)||0).toFixed(2);
  }
  if($$('.linea').length===0){ for(let i=0;i<5;i++) addLinea(); }
  chkTransporte.checked=!!d.opciones?.transporte; chkIvaIncluido.checked=!!d.opciones?.ivaIncluido; estado.value=d.opciones?.estado||'pendiente'; pagadoInp.value=d.opciones?.pagado||''; metodoPago.value=d.opciones?.metodo||'Efectivo'; observaciones.value=d.opciones?.obs||'';
  recalc();
}
[prov.nombre,prov.nif,prov.dir,prov.tel,prov.email,cli.nombre,cli.nif,cli.dir,cli.tel,cli.email,chkTransporte,chkIvaIncluido,estado,pagadoInp,metodoPago,observaciones].forEach(el=>el?.addEventListener('input', saveDraft));

/* ---------- Totales ---------- */
function recalc(){
  const ls=getLineas();
  let subtotal=0; ls.forEach(l=> subtotal+=lineImporte(l));
  const transporte = chkTransporte.checked ? subtotal*0.10 : 0;
  const baseMasTrans = subtotal + transporte;
  const iva = baseMasTrans * 0.04; // informativo
  const total = baseMasTrans;
  const pagado = parseNum(pagadoInp.value||0);
  const pendiente = Math.max(0, total - pagado);

  subtotalEl.textContent=money(subtotal);
  transpEl.textContent=money(transporte);
  ivaEl.textContent=money(iva);
  totalEl.textContent=money(total);
  mostPagadoEl.textContent=money(pagado);
  pendienteEl.textContent=money(pendiente);

  fillPrint(ls,{subtotal,transporte,iva,total});
  drawResumen();
}

/* ---------- Guardar / PDF / Nueva / Compartir ---------- */
function genNumFactura(){ const d=new Date(), pad=n=>String(n).padStart(2,'0'); return `FA-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; }
function saveFacturas(){ localStorage.setItem(K_FACTURAS, JSON.stringify(facturas)); }

$('#btnGuardar')?.addEventListener('click', ()=>{
  const ls=getLineas(); if(ls.length===0){ alert('Añade al menos una línea.'); return; }
  const numero=genNumFactura(); const now=todayISO();

  ls.forEach(l=> pushPriceHistory(l.name, l.price));

  const subtotal=unMoney($('#subtotal').textContent);
  const transporte=unMoney($('#transp').textContent);
  const iva=unMoney($('#iva').textContent);
  const total=unMoney($('#total').textContent);
  const pagado=parseNum($('#pagado').value);
  const pendiente=Math.max(0,total-pagado);

  const factura={
    numero, fecha:now,
    proveedor:{nombre:prov.nombre.value,nif:prov.nif.value,dir:prov.dir.value,tel:prov.tel.value,email:prov.email.value},
    cliente:{nombre:cli.nombre.value,nif:cli.nif.value,dir:cli.dir.value,tel:cli.tel.value,email:cli.email.value},
    lineas:ls, transporte:chkTransporte.checked, ivaIncluido:chkIvaIncluido.checked,
    estado:estado.value, metodo:metodoPago.value, obs:observaciones.value,
    totals:{subtotal,transporte,iva,total,pagado,pendiente}
  };
  facturas.unshift(factura); saveFacturas();
  localStorage.removeItem(K_DRAFT);
  alert(`Factura ${numero} guardada.`);
  renderFacturas(); drawResumen(); fillPrint(ls,{subtotal,transporte,iva,total},factura);
});

$('#btnImprimir')?.addEventListener('click', ()=>{
  const fTemp={ lineas:getLineas(), totals:{ subtotal:unMoney($('#subtotal').textContent), transporte:unMoney($('#transp').textContent), iva:unMoney($('#iva').textContent), total:unMoney($('#total').textContent)}, estado:estado.value, metodo:metodoPago.value, obs:observaciones.value, proveedor:{nombre:prov.nombre.value,nif:prov.nif.value,dir:prov.dir.value,tel:prov.tel.value,email:prov.email.value}, cliente:{nombre:cli.nombre.value,nif:cli.nif.value,dir:cli.dir.value,tel:cli.tel.value,email:cli.email.value}, numero:'(Borrador)', fecha:todayISO() };
  fillPrint(fTemp.lineas,fTemp.totals,fTemp);
  window.print();
});

async function generatePDFBlob(){
  const area=document.getElementById('printArea');
  const opt={ margin:10, filename:'Factura.pdf', image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} };
  const worker = html2pdf().set(opt).from(area);
  const blob = await worker.output('blob'); // correcto
  return blob;
}
$('#btnShareWA')?.addEventListener('click', async ()=>{
  const fTemp={ lineas:getLineas(), totals:{ subtotal:unMoney($('#subtotal').textContent), transporte:unMoney($('#transp').textContent), iva:unMoney($('#iva').textContent), total:unMoney($('#total').textContent)}, estado:estado.value, metodo:metodoPago.value, obs:observaciones.value, proveedor:{nombre:prov.nombre.value}, cliente:{nombre:cli.nombre.value}, numero:'(Borrador)', fecha:todayISO() };
  fillPrint(fTemp.lineas,fTemp.totals,fTemp);
  const blob = await generatePDFBlob();
  const url = URL.createObjectURL(blob);
  const texto = encodeURIComponent(`Factura ${fTemp.cliente.nombre||''} (${fmtDateDMY(new Date())}) Total: ${money(fTemp.totals.total)}\nPDF: ${url}`);
  window.open(`https://wa.me/?text=${texto}`, '_blank');
  setTimeout(()=>URL.revokeObjectURL(url), 60000);
});
$('#btnShareMail')?.addEventListener('click', async ()=>{
  const fTemp={ lineas:getLineas(), totals:{ subtotal:unMoney($('#subtotal').textContent), transporte:unMoney($('#transp').textContent), iva:unMoney($('#iva').textContent), total:unMoney($('#total').textContent)}, estado:estado.value, metodo:metodoPago.value, obs:observaciones.value, proveedor:{nombre:prov.nombre.value}, cliente:{nombre:cli.nombre.value,email:cli.email.value}, numero:'(Borrador)', fecha:todayISO() };
  fillPrint(fTemp.lineas,fTemp.totals,fTemp);
  const blob = await generatePDFBlob();
  const url = URL.createObjectURL(blob);
  const to = encodeURIComponent(fTemp.cliente.email || '');
  const subject = encodeURIComponent(`Factura ${fTemp.cliente.nombre||''} - ${fmtDateDMY(new Date())}`);
  const body = encodeURIComponent(`Descarga temporal del PDF:\n${url}\n\nTotal: ${money(fTemp.totals.total)}`);
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  setTimeout(()=>URL.revokeObjectURL(url), 60000);
});

$('#btnNueva')?.addEventListener('click', ()=>{
  lineasDiv.innerHTML=''; for(let i=0;i<5;i++) addLinea();
  chkTransporte.checked=false; chkIvaIncluido.checked=true; estado.value='pendiente';
  pagadoInp.value=''; metodoPago.value='Efectivo'; observaciones.value='';
  saveDraft(); recalc();
});

/* ---------- FACTURAS LISTA (filtros + duplicar + totales) ---------- */
function badgeEstado(f){
  if(f.estado==='pagado') return `<span class="badge ok">Pagada</span>`;
  if(f.estado==='parcial'){ const resta=Math.max(0,(f.totals?.total||0)-(f.totals?.pagado||0)); return `<span class="badge warn">Parcial · resta ${money(resta)}</span>`; }
  return `<span class="badge bad">Pendiente</span>`;
}
function fechaDentro(f, d1, d2){
  const d=new Date(f.fecha);
  if(d1 && d < new Date(d1)) return false;
  if(d2 && d > new Date(d2+'T23:59:59')) return false;
  return true;
}
function renderFacturas(){
  listaFacturas.innerHTML='';
  const q=(buscaCliente.value||'').toLowerCase();
  const fe=filtroEstado.value;
  const d1=fechaDesde.value || null, d2=fechaHasta.value || null;
  let arr=facturas.slice();
  if(fe!=='todas') arr=arr.filter(f=>f.estado===fe);
  if(q) arr=arr.filter(f=>(f.cliente?.nombre||'').toLowerCase().includes(q));
  if(d1||d2) arr=arr.filter(f=>fechaDentro(f,d1,d2));

  if(arr.length===0){ listaFacturas.innerHTML='<div class="item">No hay facturas.</div>'; facturasTotales.textContent=''; return; }

  let sumTotal=0, sumPend=0;
  arr.slice(0,800).forEach((f,idx)=>{
    const fecha=new Date(f.fecha).toLocaleString();
    sumTotal += (f.totals?.total||0);
    sumPend  += (f.totals?.pendiente||0);

    const div=document.createElement('div'); div.className='item';
    div.innerHTML=`
      <div>
        <strong>${escapeHTML(f.numero)}</strong> ${badgeEstado(f)}
        <div class="meta">${fecha} · ${escapeHTML(f.cliente?.nombre||'')}</div>
      </div>
      <div class="row">
        <strong>${money(f.totals.total)}</strong>
        <button class="btn small" data-e="ver" data-i="${idx}">Ver</button>
        <button class="btn small" data-e="dup" data-i="${idx}">📋 Duplicar</button>
        <button class="btn small" data-e="cobrar" data-i="${idx}">💶 Cobrado</button>
        <button class="btn small ghost" data-e="pdf" data-i="${idx}">PDF</button>
      </div>`;
    listaFacturas.appendChild(div);
  });

  facturasTotales.innerHTML = `
    <div><strong>Total facturado:</strong> ${money(sumTotal)}</div>
    <div><strong>Total pendiente:</strong> ${money(sumPend)}</div>
  `;

  listaFacturas.querySelectorAll('button').forEach(b=>{
    const i=+b.dataset.i; const f=facturas[i];
    b.addEventListener('click', ()=>{
      if(b.dataset.e==='ver'){
        fillPrint(f.lineas,f.totals,f); switchTab('factura'); $('#printArea').scrollIntoView({behavior:'smooth'}); return;
      }
      if(b.dataset.e==='dup'){
        localStorage.setItem(K_DRAFT, JSON.stringify({
          proveedor:f.proveedor, cliente:f.cliente, lineas:f.lineas,
          opciones:{transporte:f.transporte, ivaIncluido:f.ivaIncluido, estado:'pendiente', pagado:'0', metodo:f.metodo, obs:f.obs}
        }));
        loadDraft(); switchTab('factura'); alert('Factura duplicada como borrador. Edita y guarda.');
        return;
      }
      if(b.dataset.e==='cobrar'){
        const tot=f.totals.total||0;
        f.totals.pagado=tot; f.totals.pendiente=0; f.estado='pagado';
        saveFacturas(); renderFacturas(); drawResumen(); return;
      }
      if(b.dataset.e==='pdf'){
        fillPrint(f.lineas,f.totals,f);
        const dt=new Date(f.fecha);
        const nombreCliente=(f.cliente?.nombre||'Cliente').replace(/\s+/g,'');
        const filename=`Factura-${nombreCliente}-${fmtDateDMY(dt)}.pdf`;
        const opt={ margin:10, filename, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} };
        html2pdf().set(opt).from(document.getElementById('printArea')).save();
        return;
      }
    });
  });
}
[filtroEstado, buscaCliente, fechaDesde, fechaHasta].forEach(el=>el?.addEventListener('input', renderFacturas));
btnExportFacturas?.addEventListener('click', ()=>downloadJSON(facturas,'facturas-arslan-v10.json'));
btnImportFacturas?.addEventListener('click', ()=>uploadJSON(arr=>{
  if(arr?.zip){ if(arr.facturas) facturas = arr.facturas; saveFacturas(); renderFacturas(); drawResumen(); return; }
  if(Array.isArray(arr)){ facturas=arr; saveFacturas(); renderFacturas(); drawResumen(); }
});

/* ---------- Resumen + Deudas + Charts ---------- */
function drawResumen(){
  const now=new Date(); const todayKey=now.toISOString().slice(0,10);
  const startOfWeek=(()=>{ const d=new Date(now); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); d.setHours(0,0,0,0); return d; })();
  const startOfMonth=new Date(now.getFullYear(), now.getMonth(), 1);

  let hoy=0, semana=0, mes=0, total=0, pendiente=0;
  facturas.forEach(f=>{
    const d=new Date(f.fecha);
    total += (f.totals?.total||0);
    if(f.fecha.slice(0,10)===todayKey) hoy += (f.totals?.total||0);
    if(d>=startOfWeek) semana += (f.totals?.total||0);
    if(d>=startOfMonth) mes += (f.totals?.total||0);
    pendiente += (f.totals?.pendiente||0);
  });
  rHoy.textContent=money(hoy); rSemana.textContent=money(semana); rMes.textContent=money(mes); rTotal.textContent=money(total);
  resGlobal.textContent=money(pendiente);

  const map=new Map();
  facturas.forEach(f=>{
    const nom=f.cliente?.nombre||'(s/cliente)';
    const pend=f.totals?.pendiente||0;
    map.set(nom,(map.get(nom)||0)+pend);
  });
  resPorCliente.innerHTML='';
  if(map.size===0){ resPorCliente.innerHTML='<div class="item">No hay deudas registradas.</div>'; return; }
  [...map.entries()].sort((a,b)=>b[1]-a[1]).forEach(([nom,pend])=>{
    const div=document.createElement('div'); div.className='item';
    div.innerHTML=`<div><strong>${escapeHTML(nom)}</strong></div><div><strong>${money(pend)}</strong></div>`;
    resPorCliente.appendChild(div);
  });
}

let chart1, chart2;
function groupDaily(n=7){
  const now=new Date(); const buckets=[];
  for(let i=n-1;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i); const k=d.toISOString().slice(0,10); buckets.push({k, label:k.slice(5), sum:0}); }
  facturas.forEach(f=>{ const k=f.fecha.slice(0,10); const b=buckets.find(x=>x.k===k); if(b) b.sum+=(f.totals?.total||0); });
  return buckets;
}
function groupMonthly(n=12){
  const now=new Date(); const buckets=[];
  for(let i=n-1;i>=0;i--){ const d=new Date(now); d.setMonth(d.getMonth()-i); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; buckets.push({k,label:k,sum:0}); }
  facturas.forEach(f=>{ const d=new Date(f.fecha); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; const b=buckets.find(x=>x.k===k); if(b) b.sum+=(f.totals?.total||0); });
  return buckets;
}
function drawCharts(){
  if(!chartDiario||!chartMensual || typeof Chart==='undefined') return;
  const daily=groupDaily(7); const monthly=groupMonthly(12);
  if(chart1) chart1.destroy(); if(chart2) chart2.destroy();
  chart1=new Chart(chartDiario.getContext('2d'), {type:'bar', data:{labels:daily.map(d=>d.label), datasets:[{label:'Ventas diarias', data:daily.map(d=>d.sum)}]}, options:{responsive:true, plugins:{legend:{display:false}}}});
  chart2=new Chart(chartMensual.getContext('2d'), {type:'line', data:{labels:monthly.map(d=>d.label), datasets:[{label:'Ventas mensuales', data:monthly.map(d=>d.sum)}]}, options:{responsive:true, plugins:{legend:{display:false}}}});
}

/* ---------- Reset deudas ---------- */
btnResetCliente?.addEventListener('click', ()=>{
  const i=selCliente.value; if(i===''){ alert('Selecciona un cliente en la pestaña Factura.'); return; }
  const nombre=clientes[+i]?.nombre||''; if(!nombre){ alert('Cliente sin nombre.'); return; }
  if(!confirm(`¿Resetear deudas del cliente "${nombre}"?`)) return;
  facturas=facturas.map(f=>{
    if((f.cliente?.nombre||'')===nombre){
      const n={...f, totals:{...f.totals}}; const tot=n.totals.total||0; n.totals.pagado=tot; n.totals.pendiente=0; n.estado='pagado'; return n;
    } return f;
  });
  saveFacturas(); renderFacturas(); drawResumen();
});
btnResetGlobal?.addEventListener('click', ()=>{
  if(!confirm('¿Resetear TODAS las deudas?')) return;
  facturas=facturas.map(f=>{ const n={...f, totals:{...f.totals}}; const tot=n.totals.total||0; n.totals.pagado=tot; n.totals.pendiente=0; n.estado='pagado'; return n; });
  saveFacturas(); renderFacturas(); drawResumen();
});

/* ---------- Impresión (relleno) ---------- */
function fillPrint(lines, totals, factura=null){
  pNum.textContent = factura?.numero || '(Sin guardar)';
  pFecha.textContent = (factura?new Date(factura.fecha):new Date()).toLocaleString();

  pProv.innerHTML = `
    <div><strong>${escapeHTML(factura?.proveedor?.nombre||prov.nombre.value||'')}</strong></div>
    <div>${escapeHTML(factura?.proveedor?.nif||prov.nif.value||'')}</div>
    <div>${escapeHTML(factura?.proveedor?.dir||prov.dir.value||'')}</div>
    <div>${escapeHTML(factura?.proveedor?.tel||prov.tel.value||'')} · ${escapeHTML(factura?.proveedor?.email||prov.email.value||'')}</div>
  `;
  pCli.innerHTML = `
    <div><strong>${escapeHTML(factura?.cliente?.nombre||cli.nombre.value||'')}</strong></div>
    <div>${escapeHTML(factura?.cliente?.nif||cli.nif.value||'')}</div>
    <div>${escapeHTML(factura?.cliente?.dir||cli.dir.value||'')}</div>
    <div>${escapeHTML(factura?.cliente?.tel||cli.tel.value||'')} · ${escapeHTML(factura?.cliente?.email||cli.email.value||'')}</div>
  `;

  pTabla.innerHTML='';
  (lines||[]).forEach(l=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(l.name)}</td>
      <td>${escapeHTML(l.mode||'')}</td>
      <td>${l.qty||''}</td>
      <td>${l.net?l.net.toFixed(2):''}</td>
      <td>${money(l.price)}</td>
      <td>${escapeHTML(l.origin||'')}</td>
      <td>${money((l.mode==='unidad') ? l.qty*l.price : l.net*l.price)}</td>`;
    pTabla.appendChild(tr);
  });

  pSub.textContent = money(totals?.subtotal||0);
  pTra.textContent = money(totals?.transporte||0);
  pIva.textContent = money(totals?.iva||0);
  pTot.textContent = money(totals?.total||0);
  pEstado.textContent = factura?.estado || estado.value;
  pMetodo.textContent = factura?.metodo || metodoPago.value;
  pObs.textContent = factura?.obs || (observaciones.value||'—');

  // Firmas
  pFirmaProv.src = firmaProv || '';
  pFirmaCli.src  = firmaCli  || '';
}

/* ---------- Backup JSON y ZIP ---------- */
btnBackup?.addEventListener('click', ()=>{
  const payload = {clientes, productos, facturas, priceHist, firmaProv, firmaCli, fecha: todayISO(), version: 'ARSLAN PRO V10'};
  downloadJSON(payload, `backup-${fmtDateDMY(new Date())}.json`);
});
btnRestore?.addEventListener('click', ()=>{
  uploadJSON(obj=>{
    if(!obj || typeof obj!=='object'){ alert('Copia inválida'); return; }
    if(obj.clientes) clientes=obj.clientes;
    if(obj.productos) productos=obj.productos;
    if(obj.facturas) facturas=obj.facturas;
    if(obj.priceHist) priceHist=obj.priceHist;
    if(obj.firmaProv!==undefined){ firmaProv=obj.firmaProv; localStorage.setItem(K_FIRMA_PROV,firmaProv); }
    if(obj.firmaCli!==undefined){ firmaCli=obj.firmaCli; localStorage.setItem(K_FIRMA_CLI ,firmaCli ); }
    saveClientes(); saveProductos(); saveFacturas(); savePriceHist(); refreshSignatures();
    renderClientesSelect(); renderClientesLista(); renderProductos(); renderFacturas(); drawResumen(); alert('Copia restaurada.');
  });
});
btnBackupZip?.addEventListener('click', async ()=>{
  const zip=new JSZip();
  zip.file('clientes.json', JSON.stringify(clientes,null,2));
  zip.file('productos.json', JSON.stringify(productos,null,2));
  zip.file('facturas.json', JSON.stringify(facturas,null,2));
  zip.file('priceHist.json', JSON.stringify(priceHist,null,2));
  zip.file('firmaProv.txt', firmaProv||'');
  zip.file('firmaCli.txt',  firmaCli ||'');
  const blob=await zip.generateAsync({type:'blob'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`arslan-backup-${fmtDateDMY(new Date())}.zip`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});
btnRestoreZip?.addEventListener('click', ()=>{
  uploadJSON(obj=>{
    if(!obj?.zip){ alert('Selecciona un ZIP generado por el sistema.'); return; }
    if(obj.clientes) clientes=obj.clientes;
    if(obj.productos) productos=obj.productos;
    if(obj.facturas) facturas=obj.facturas;
    if(obj.priceHist) priceHist=obj.priceHist;
    firmaProv=obj.firmaProv||''; firmaCli=obj.firmaCli||'';
    localStorage.setItem(K_FIRMA_PROV,firmaProv); localStorage.setItem(K_FIRMA_CLI,firmaCli);
    saveClientes(); saveProductos(); saveFacturas(); savePriceHist(); refreshSignatures();
    renderClientesSelect(); renderClientesLista(); renderProductos(); renderFacturas(); drawResumen(); alert('ZIP restaurado.');
  });
});

/* ---------- BOOT ---------- */
function initLines(){ if($$('.linea').length===0){ for(let i=0;i<5;i++) addLinea(); } }
function renderAll(){ renderClientesSelect(); renderClientesLista(); renderProductos(); renderFacturas(); drawResumen(); }

function savePriceHist(){ localStorage.setItem(K_PRICEHIST, JSON.stringify(priceHist)); } // ensure defined

seedClientesIfEmpty();
seedProductsIfEmpty();
renderAll();
initLines();
loadDraft();
recalc();

// Refuerzo de render
window.addEventListener('load', ()=>setTimeout(()=>{ try{ seedClientesIfEmpty(); seedProductsIfEmpty(); renderAll(); recalc(); }catch(e){ console.error(e);} }, 600));

})();
