/* =======================================================
   🥝 ARSLAN V9 PRO — app.js (completo y estable)
   =======================================================
   - Splash con logo girando y apertura directa en “Factura”
   - Pestañas: Factura, Clientes, Facturas, Productos, Resumen
   - Clientes y productos precargados (más de 150)
   - Línea de factura: modo (kg/unidad/caja), bruto, tara, neto, origen, precio
   - Historial global de precios (últimos 10 por producto)
   - Guardar / PDF / marcar cobrada / resumen y gráficos (Chart.js)
   - Exportar/Importar JSON (backup/restore)
   ======================================================= */

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

  // Claves de storage
  const K_CLIENTES  = 'arslan_v9_clientes';
  const K_PRODUCTOS = 'arslan_v9_productos';
  const K_FACTURAS  = 'arslan_v9_facturas';
  const K_PRICEHIST = 'arslan_v9_pricehist';

  // Estado
  let clientes  = safeParse(localStorage.getItem(K_CLIENTES), []);
  let productos = safeParse(localStorage.getItem(K_PRODUCTOS), []);
  let facturas  = safeParse(localStorage.getItem(K_FACTURAS), []);
  let priceHist = safeParse(localStorage.getItem(K_PRICEHIST), {});

  function safeParse(json, fallback){
    try{ const v = JSON.parse(json||''); return v ?? fallback; }catch(_){ return fallback; }
  }
  function downloadJSON(obj, filename){
    const blob = new Blob([JSON.stringify(obj,null,2)], {type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function uploadJSON(cb){
    const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
    inp.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const reader=new FileReader(); reader.onload=()=>{ try{ cb(JSON.parse(reader.result)); }catch{ alert('JSON inválido'); } }; reader.readAsText(f); };
    inp.click();
  }

  /* ---------- SPLASH ---------- */
  window.addEventListener('load', () => {
    const splash = $('#splash');
    setTimeout(() => {
      if(splash) splash.classList.add('fade-out');
      const firstTab = document.querySelector('[data-tab="factura"]') || document.querySelector('button.tab');
      if(firstTab) firstTab.click();
    }, 1400);
  });

  /* ---------- NAVEGACIÓN ---------- */
  function switchTab(id){
    $$('button.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
    $$('section.panel').forEach(p=>p.classList.toggle('active', p.dataset.tabPanel===id));
    if(id==='resumen'){ drawResumen(); drawCharts(); }
  }
  document.addEventListener('DOMContentLoaded', ()=>{
    $$('button.tab').forEach(b=>b.addEventListener('click', ()=>switchTab(b.dataset.tab)));
  });

  /* ---------- DOM refs (se resuelven al cargar) ---------- */
  let lineasDiv, btnAddLinea, btnVaciarLineas;
  let prov={}, cli={}, selCliente, btnNuevoCliente;
  let chkTransporte, chkIvaIncluido, estado, pagadoInp, metodoPago, observaciones;
  let subtotalEl, transpEl, ivaEl, totalEl, mostPagadoEl, pendienteEl;
  let btnGuardar, btnImprimir, btnNueva;

  // Clientes
  let listaClientes, btnAddCliente, buscarCliente, btnExportClientes, btnImportClientes;

  // Facturas
  let filtroEstado, buscaCliente, listaFacturas, btnExportFacturas, btnImportFacturas;

  // Resumen
  let rHoy, rSemana, rMes, rTotal, resGlobal, resPorCliente, btnResetCliente, btnResetGlobal, btnBackup, btnRestore, chartDiario, chartMensual;

  // Productos
  let listaProductos, btnAddProducto, btnExportProductos, btnImportProductos;

  // Impresión
  let pNum, pFecha, pProv, pCli, pTabla, pSub, pTra, pIva, pTot, pEstado, pMetodo, pObs;

  // Historial panel
  let pricePanel, ppBody, hidePanelTimer=null;

  function bindDOM(){
    // Factura
    lineasDiv = $('#lineas');
    btnAddLinea = $('#btnAddLinea');
    btnVaciarLineas = $('#btnVaciarLineas');

    prov = { nombre: $('#provNombre'), nif: $('#provNif'), dir: $('#provDir'), tel: $('#provTel'), email: $('#provEmail') };
    cli  = { nombre: $('#cliNombre'),  nif: $('#cliNif'),  dir: $('#cliDir'),  tel: $('#cliTel'),  email: $('#cliEmail') };
    selCliente = $('#selCliente'); btnNuevoCliente = $('#btnNuevoCliente');

    chkTransporte = $('#chkTransporte'); chkIvaIncluido = $('#chkIvaIncluido');
    estado = $('#estado'); pagadoInp = $('#pagado'); metodoPago = $('#metodoPago'); observaciones = $('#observaciones');

    subtotalEl = $('#subtotal'); transpEl = $('#transp'); ivaEl = $('#iva'); totalEl = $('#total');
    mostPagadoEl = $('#mostPagado'); pendienteEl = $('#pendiente');

    btnGuardar = $('#btnGuardar'); btnImprimir = $('#btnImprimir'); btnNueva = $('#btnNueva');

    // Clientes
    listaClientes = $('#listaClientes'); btnAddCliente = $('#btnAddCliente'); buscarCliente=$('#buscarCliente');
    btnExportClientes = $('#btnExportClientes'); btnImportClientes = $('#btnImportClientes');

    // Facturas
    filtroEstado = $('#filtroEstado'); buscaCliente = $('#buscaCliente'); listaFacturas = $('#listaFacturas');
    btnExportFacturas = $('#btnExportFacturas'); btnImportFacturas = $('#btnImportFacturas');

    // Resumen
    rHoy=$('#rHoy'); rSemana=$('#rSemana'); rMes=$('#rMes'); rTotal=$('#rTotal');
    resGlobal=$('#resGlobal'); resPorCliente=$('#resPorCliente');
    btnResetCliente=$('#btnResetCliente'); btnResetGlobal=$('#btnResetGlobal');
    btnBackup=$('#btnBackup'); btnRestore=$('#btnRestore');
    chartDiario=$('#chartDiario'); chartMensual=$('#chartMensual');

    // Productos
    listaProductos=$('#listaProductos'); btnAddProducto=$('#btnAddProducto');
    btnExportProductos=$('#btnExportProductos'); btnImportProductos=$('#btnImportProductos');

    // Print refs
    pNum=$('#p-num'); pFecha=$('#p-fecha'); pProv=$('#p-prov'); pCli=$('#p-cli');
    pTabla=$('#p-tabla tbody'); pSub=$('#p-sub'); pTra=$('#p-tra'); pIva=$('#p-iva'); pTot=$('#p-tot'); pEstado=$('#p-estado'); pMetodo=$('#p-metodo'); pObs=$('#p-obs');

    // Historial
    pricePanel = $('#pricePanel'); ppBody = $('#ppBody');
    if(pricePanel){
      pricePanel.addEventListener('mouseenter', ()=>clearTimeout(hidePanelTimer));
      pricePanel.addEventListener('mouseleave', scheduleHidePricePanel);
    }
  }

  function showPricePanel(){ if(pricePanel && pricePanel.hasAttribute('hidden')) pricePanel.removeAttribute('hidden'); clearTimeout(hidePanelTimer); }
  function scheduleHidePricePanel(){ clearTimeout(hidePanelTimer); hidePanelTimer=setTimeout(()=>{ if(pricePanel) pricePanel.setAttribute('hidden',''); }, 5000); }
  function renderPriceHistory(name){
    if(!ppBody) return;
    showPricePanel();
    const hist = priceHist[name] || [];
    if(hist.length===0){ ppBody.innerHTML = `<div class="pp-row"><span>${escapeHTML(name)}</span><strong>Sin historial</strong></div>`; scheduleHidePricePanel(); return; }
    ppBody.innerHTML = `<div class="pp-row" style="justify-content:center"><strong>${escapeHTML(name)}</strong></div>` +
      hist.slice(0,10).map(h=>{
        const d=new Date(h.date);
        return `<div class="pp-row"><span>${fmtDateDMY(d)}</span><strong>${money(h.price)}</strong></div>`;
      }).join('');
    scheduleHidePricePanel();
  }

  /* ---------- CLIENTES ---------- */
  function saveClientes(){ localStorage.setItem(K_CLIENTES, JSON.stringify(clientes)); }
  function uniqueByName(arr){
    const map=new Map();
    arr.forEach(c=>{ const key=(c.nombre||'').trim().toLowerCase(); if(!key) return; if(!map.has(key)) map.set(key,c); });
    return [...map.values()];
  }
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
    if(!selCliente) return;
    selCliente.innerHTML = `<option value="">— Seleccionar cliente —</option>`;
    [...clientes].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'')).forEach((c,i)=>{
      const opt=document.createElement('option'); opt.value=i; opt.textContent=c.nombre||`Cliente ${i+1}`; selCliente.appendChild(opt);
    });
  }
  function renderClientesLista(){
    if(!listaClientes) return;
    listaClientes.innerHTML='';
    const q=(buscarCliente?.value||'').toLowerCase();
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
        <div class="row-inline">
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
          const c=clientes[i]; if(!c) return;
          if(cli.nombre) cli.nombre.value=c.nombre||''; if(cli.nif) cli.nif.value=c.nif||''; if(cli.dir) cli.dir.value=c.dir||''; if(cli.tel) cli.tel.value=c.tel||''; if(cli.email) cli.email.value=c.email||'';
          switchTab('factura');
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

  function lastPrice(name){ const arr = priceHist[name]; return arr?.length ? arr[0].price : null; }
  function savePriceHist(){ localStorage.setItem(K_PRICEHIST, JSON.stringify(priceHist)); }
  function pushPriceHistory(name, price){
    if(!name || !(price>0)) return;
    const arr = priceHist[name] || [];
    arr.unshift({price, date: todayISO()});
    priceHist[name] = arr.slice(0,10); // últimos 10
    savePriceHist();
  }

  function renderProductos(){
    if(!listaProductos) return;
    listaProductos.innerHTML='';
    if(productos.length===0){ listaProductos.innerHTML='<div class="item">Sin productos. Usa “Añadir” o Importar JSON.</div>'; return; }
    productos.forEach((p,idx)=>{
      const row=document.createElement('div');
      row.className='product-row';
      row.innerHTML=`
        <input value="${escapeHTML(p.name||'')}" data-f="name">
        <select data-f="mode">
          <option value="" ${!p.mode?'selected':''}>—</option>
          <option value="kg" ${p.mode==='kg'?'selected':''}>kg</option>
          <option value="unidad" ${p.mode==='unidad'?'selected':''}>unidad</option>
          <option value="caja" ${p.mode==='caja'?'selected':''}>caja</option>
        </select>
        <input type="number" step="0.01" min="0" value="${p.boxKg??''}" data-f="boxKg" placeholder="Kg/caja">
        <input type="number" step="0.01" min="0" value="${p.price??''}" data-f="price" placeholder="€ base">
        <input value="${escapeHTML(p.origin||'')}" data-f="origin" placeholder="Origen">
        <div class="row-inline">
          <button class="btn small" data-e="save" data-i="${idx}">Guardar</button>
          <button class="btn small ghost" data-e="del" data-i="${idx}">Borrar</button>
        </div>
      `;
      listaProductos.appendChild(row);
    });
    listaProductos.querySelectorAll('button').forEach(b=>{
      const i=+b.dataset.i;
      b.addEventListener('click', ()=>{
        if(b.dataset.e==='del'){
          if(confirm('¿Eliminar producto?')){ productos.splice(i,1); saveProductos(); renderProductos(); }
        }else{
          const row=b.closest('.product-row');
          const get=f=>row.querySelector(`[data-f="${f}"]`).value.trim();
          const name=get('name'); const mode=(get('mode')||null);
          const boxKgStr=get('boxKg'); const boxKg = boxKgStr===''?null:parseNum(boxKgStr);
          const priceStr=get('price'); const price = priceStr===''?null:parseNum(priceStr);
          const origin=get('origin')||null;
          productos[i]={name,mode,boxKg,price,origin}; saveProductos(); renderProductos();
        }
      });
    });
  }
  btnAddProducto?.addEventListener('click', ()=>{
    const name=prompt('Nombre del producto:'); if(!name) return;
    productos.push({name}); saveProductos(); renderProductos();
  });
  btnExportProductos?.addEventListener('click', ()=>downloadJSON(productos,'productos-arslan-v9.json'));
  btnImportProductos?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ productos=arr; saveProductos(); renderProductos(); } }));

  /* ---------- FACTURA: líneas con cálculo + HISTORIAL AUTO ---------- */
  function findProducto(name){ return productos.find(p=>(p.name||'').toLowerCase()===String(name).toLowerCase()); }
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

    // Historial al enfocar
    const maybeShowHistory = ()=>{ const n = nameInp.value.trim(); if(n){ renderPriceHistory(n); } };
    nameInp.addEventListener('focus', maybeShowHistory);
    priceInp.addEventListener('focus', maybeShowHistory);

    nameInp.addEventListener('input', ()=>{
      const q=nameInp.value.trim().toLowerCase(); 
      if(!q){ list.hidden=true; list.innerHTML=''; return; }
      const matches=productos.filter(p=>p.name?.toLowerCase().includes(q)).slice(0,20);
      if(matches.length===0){ list.hidden=true; list.innerHTML=''; return; }
      list.innerHTML='';
      matches.forEach(p=>{
        const last=lastPrice(p.name);
        const btn=document.createElement('button');
        btn.type='button';
        btn.textContent=`${p.name}${p.mode?` · ${p.mode}`:''}${p.boxKg?` · ${p.boxKg}kg/caja`:''}${p.price!=null?` · base ${p.price}€`:''}${p.origin?` · ${p.origin}`:''}${last?` · último ${last}€`:''}`;
        btn.addEventListener('click', ()=>{
          nameInp.value=p.name;
          if(p.mode){ modeInp.value=p.mode; }
          if(p.price!=null){ priceInp.value=p.price; }
          if(p.origin){ originInp.value=p.origin; }
          list.hidden=true; recalcLine(); renderPriceHistory(p.name);
        });
        list.appendChild(btn);
      });
      list.hidden=false;
    });
    nameInp.addEventListener('blur',()=>setTimeout(()=>list.hidden=true,150));

    [modeInp, qtyInp, grossInp, tareInp, priceInp].forEach(el=>el.addEventListener('input', recalcLine));
    wrap.querySelector('.del').addEventListener('click', ()=>{ wrap.remove(); recalc(); });

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
      let amount=0; amount = (mode==='unidad') ? qty*price : net*price;
      amtInp.value = amount>0 ? amount.toFixed(2) : '';

      recalc();
    }
    return wrap;
  }

  /* ---------- Cálculos ---------- */
  function lineImporte(l){ return (l.mode==='unidad') ? l.qty*l.price : l.net*l.price; }
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

  function recalc(){
    const ls=getLineas();
    let subtotal=0; ls.forEach(l=> subtotal+=lineImporte(l));
    const transporte = $('#chkTransporte')?.checked ? subtotal*0.10 : 0;
    const baseMasTrans = subtotal + transporte;
    const iva = baseMasTrans * 0.04; // informativo
    const total = baseMasTrans;
    const pagado = parseNum($('#pagado')?.value || 0);
    const pendiente = Math.max(0, total - pagado);

    if(subtotalEl) subtotalEl.textContent=money(subtotal);
    if(transpEl)   transpEl.textContent=money(transporte);
    if(ivaEl)      ivaEl.textContent=money(iva);
    if(totalEl)    totalEl.textContent=money(total);
    if(mostPagadoEl) mostPagadoEl.textContent=money(pagado);
    if(pendienteEl)  pendienteEl.textContent=money(pendiente);

    fillPrint(ls,{subtotal,transporte,iva,total});
    drawResumen();
  }

  /* ---------- Guardar / PDF / Nueva ---------- */
  function genNumFactura(){ const d=new Date(), pad=n=>String(n).padStart(2,'0'); return `FA-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; }
  function saveFacturas(){ localStorage.setItem(K_FACTURAS, JSON.stringify(facturas)); }

  document.addEventListener('click', (e)=>{
    const t=e.target;
    if(t?.id==='btnGuardar'){
      const ls=getLineas(); if(ls.length===0){ alert('Añade al menos una línea.'); return; }
      const numero=genNumFactura(); const now=todayISO();

      // historial de precios (GLOBAL por producto)
      ls.forEach(l=> pushPriceHistory(l.name, l.price));

      const subtotal=unMoney($('#subtotal')?.textContent||'0');
      const transporte=unMoney($('#transp')?.textContent||'0');
      const iva=unMoney($('#iva')?.textContent||'0');
      const total=unMoney($('#total')?.textContent||'0');
      const pagado=parseNum($('#pagado')?.value||0);
      const pendiente=Math.max(0,total-pagado);

      const factura={
        numero, fecha:now,
        proveedor:{nombre:$('#provNombre')?.value||'', nif:$('#provNif')?.value||'', dir:$('#provDir')?.value||'', tel:$('#provTel')?.value||'', email:$('#provEmail')?.value||''},
        cliente:{nombre:$('#cliNombre')?.value||'', nif:$('#cliNif')?.value||'', dir:$('#cliDir')?.value||'', tel:$('#cliTel')?.value||'', email:$('#cliEmail')?.value||''},
        lineas:ls, transporte:$('#chkTransporte')?.checked||false, ivaIncluido:$('#chkIvaIncluido')?.checked||true,
        estado:$('#estado')?.value||'pendiente', metodo:$('#metodoPago')?.value||'Efectivo', obs:$('#observaciones')?.value||'',
        totals:{subtotal,transporte,iva,total,pagado,pendiente}
      };
      facturas.unshift(factura); saveFacturas();
      alert(`Factura ${numero} guardada.`);
      renderFacturas(); renderResumen(); fillPrint(ls,{subtotal,transporte,iva,total},factura);
      return;
    }

    if(t?.id==='btnImprimir'){
      window.print(); return;
    }

    if(t?.id==='btnNueva'){
      if(lineasDiv){ lineasDiv.innerHTML=''; for(let i=0;i<5;i++) addLinea(); }
      $('#chkTransporte') && ($('#chkTransporte').checked=false);
      $('#chkIvaIncluido') && ($('#chkIvaIncluido').checked=true);
      $('#estado') && ($('#estado').value='pendiente');
      $('#pagado') && ($('#pagado').value='');
      $('#metodoPago') && ($('#metodoPago').value='Efectivo');
      $('#observaciones') && ($('#observaciones').value='');
      recalc(); return;
    }

    if(t?.id==='btnAddLinea'){ addLinea(); return; }
    if(t?.id==='btnVaciarLineas'){ if(confirm('¿Vaciar todas las líneas?')){ if(lineasDiv){ lineasDiv.innerHTML=''; for(let i=0;i<5;i++) addLinea(); recalc(); } } return; }

    if(t?.id==='btnAddCliente'){
      const nombre=prompt('Nombre del cliente:'); if(!nombre) return;
      const nif=prompt('NIF/CIF:')||''; const dir=prompt('Dirección:')||''; const tel=prompt('Teléfono:')||''; const email=prompt('Email:')||'';
      clientes.push({nombre,nif,dir,tel,email}); saveClientes(); renderClientesSelect(); renderClientesLista(); return;
    }

    if(t?.id==='btnExportClientes'){ downloadJSON(clientes,'clientes-arslan-v9.json'); return; }
    if(t?.id==='btnImportClientes'){ uploadJSON(arr=>{ if(Array.isArray(arr)){ clientes=uniqueByName(arr); saveClientes(); renderClientesSelect(); renderClientesLista(); } }); return; }

    if(t?.id==='btnExportProductos'){ downloadJSON(productos,'productos-arslan-v9.json'); return; }
    if(t?.id==='btnImportProductos'){ uploadJSON(arr=>{ if(Array.isArray(arr)){ productos=arr; saveProductos(); renderProductos(); } }); return; }

    if(t?.id==='btnExportFacturas'){ downloadJSON(facturas,'facturas-arslan-v9.json'); return; }
    if(t?.id==='btnImportFacturas'){ uploadJSON(arr=>{ if(Array.isArray(arr)){ facturas=arr; saveFacturas(); renderFacturas(); renderResumen(); } }); return; }

    if(t?.id==='btnBackup'){
      const payload={clientes, productos, facturas, priceHist, fecha: todayISO(), version:'ARSLAN V9 PRO'};
      const d=new Date(); downloadJSON(payload, `backup-${fmtDateDMY(d)}.json`); return;
    }
    if(t?.id==='btnRestore'){
      uploadJSON(obj=>{
        if(!obj || typeof obj!=='object'){ alert('Copia inválida'); return; }
        clientes = Array.isArray(obj.clientes)? obj.clientes : clientes;
        productos= Array.isArray(obj.productos)?obj.productos: productos;
        facturas = Array.isArray(obj.facturas) ? obj.facturas : facturas;
        priceHist= obj.priceHist && typeof obj.priceHist==='object' ? obj.priceHist : priceHist;
        saveClientes(); saveProductos(); saveFacturas(); savePriceHist();
        renderAll(); alert('Copia restaurada.');
      });
      return;
    }
  });

  function addLinea(){ if(!lineasDiv) return; lineasDiv.appendChild(lineaHTML()); }

  /* ---------- Lista de facturas ---------- */
  function badgeEstado(f){
    if(f.estado==='pagado') return `<span class="badge ok">Pagada</span>`;
    if(f.estado==='parcial'){
      const resta=Math.max(0,(f.totals?.total||0)-(f.totals?.pagado||0));
      return `<span class="badge warn">Parcial · resta ${money(resta)}</span>`;
    }
    return `<span class="badge bad">Pendiente</span>`;
  }
  function renderFacturas(){
    if(!listaFacturas) return;
    listaFacturas.innerHTML='';
    const q=(buscaCliente?.value||'').toLowerCase();
    const fe=filtroEstado?.value||'todas';
    let arr=facturas.slice();
    if(fe!=='todas') arr=arr.filter(f=>f.estado===fe);
    if(q) arr=arr.filter(f=>(f.cliente?.nombre||'').toLowerCase().includes(q));
    if(arr.length===0){ listaFacturas.innerHTML='<div class="item">No hay facturas.</div>'; return; }

    arr.slice(0,400).forEach((f,idx)=>{
      const fecha=new Date(f.fecha).toLocaleString();
      const div=document.createElement('div'); div.className='item';
      div.innerHTML=`
        <div>
          <strong>${escapeHTML(f.numero)}</strong> ${badgeEstado(f)}
          <div class="meta">${fecha} · ${escapeHTML(f.cliente?.nombre||'')}</div>
        </div>
        <div class="row-inline">
          <strong>${money(f.totals.total)}</strong>
          <button class="btn small" data-e="ver" data-i="${idx}">Ver</button>
          <button class="btn small" data-e="cobrar" data-i="${idx}">💶 Cobrado</button>
          <button class="btn small ghost" data-e="pdf" data-i="${idx}">PDF Factura</button>
        </div>`;
      listaFacturas.appendChild(div);
    });

    listaFacturas.querySelectorAll('button').forEach(b=>{
      const i=+b.dataset.i;
      b.addEventListener('click', ()=>{
        const f=facturas[i]; if(!f) return;
        if(b.dataset.e==='ver'){
          fillPrint(f.lineas,f.totals,f); switchTab('factura'); $('#printArea')?.scrollIntoView({behavior:'smooth'}); return;
        }
        if(b.dataset.e==='cobrar'){
          const tot=f.totals.total||0;
          f.totals.pagado=tot; f.totals.pendiente=0; f.estado='pagado';
          saveFacturas(); renderFacturas(); renderResumen(); return;
        }
        if(b.dataset.e==='pdf'){
          fillPrint(f.lineas,f.totals,f);
          const dt=new Date(f.fecha);
          const nombreCliente=(f.cliente?.nombre||'Cliente').replace(/\s+/g,'');
          const filename=`Factura-${nombreCliente}-${fmtDateDMY(dt)}.pdf`;
          if(typeof html2pdf!=='undefined'){
            const opt={ margin:10, filename, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} };
            html2pdf().set(opt).from(document.getElementById('printArea')).save();
          }else{
            window.print();
          }
          return;
        }
      });
    });
  }
  [()=>filtroEstado, ()=>buscaCliente].forEach(fn=>{
    const el = fn();
    if(el) el.addEventListener('input', renderFacturas);
  });

  /* ---------- Resumen + Deudas + Charts ---------- */
  function drawResumen(){
    if(!rHoy||!rSemana||!rMes||!rTotal||!resGlobal||!resPorCliente) return;
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

    // Deudas por cliente
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
    const now=new Date();
    const buckets=[];
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

  // Reset deudas
  btnResetCliente?.addEventListener('click', ()=>{
    if(!selCliente) return;
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

  /* ---------- Impresión ---------- */
  function fillPrint(lines, totals, factura=null){
    if(pNum)   pNum.textContent = factura?.numero || '(Sin guardar)';
    if(pFecha) pFecha.textContent = (factura?new Date(factura.fecha):new Date()).toLocaleString();

    if(pProv) pProv.innerHTML = `
      <div><strong>${escapeHTML(factura?.proveedor?.nombre||$('#provNombre')?.value||'')}</strong></div>
      <div>${escapeHTML(factura?.proveedor?.nif||$('#provNif')?.value||'')}</div>
      <div>${escapeHTML(factura?.proveedor?.dir||$('#provDir')?.value||'')}</div>
      <div>${escapeHTML(factura?.proveedor?.tel||$('#provTel')?.value||'')} · ${escapeHTML(factura?.proveedor?.email||$('#provEmail')?.value||'')}</div>
    `;
    if(pCli) pCli.innerHTML = `
      <div><strong>${escapeHTML(factura?.cliente?.nombre||$('#cliNombre')?.value||'')}</strong></div>
      <div>${escapeHTML(factura?.cliente?.nif||$('#cliNif')?.value||'')}</div>
      <div>${escapeHTML(factura?.cliente?.dir||$('#cliDir')?.value||'')}</div>
      <div>${escapeHTML(factura?.cliente?.tel||$('#cliTel')?.value||'')} · ${escapeHTML(factura?.cliente?.email||$('#cliEmail')?.value||'')}</div>
    `;

    if(pTabla){
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
    }

    if(pSub) pSub.textContent = money(totals?.subtotal||0);
    if(pTra) pTra.textContent = money(totals?.transporte||0);
    if(pIva) pIva.textContent = money(totals?.iva||0);
    if(pTot) pTot.textContent = money(totals?.total||0);
    if(pEstado) pEstado.textContent = factura?.estado || $('#estado')?.value || '';
    if(pMetodo) pMetodo.textContent = factura?.metodo || $('#metodoPago')?.value || '';
    if(pObs) pObs.textContent = factura?.obs || ($('#observaciones')?.value||'—');
  }

  /* ---------- Render all ---------- */
  function renderAll(){
    renderClientesSelect(); renderClientesLista();
    renderProductos(); renderFacturas(); drawResumen();
  }

  /* ---------- BOOT ---------- */
  document.addEventListener('DOMContentLoaded', ()=>{
    bindDOM();
    seedClientesIfEmpty();
    seedProductsIfEmpty();

    // 5 líneas por defecto
    if(lineasDiv && $$('.linea').length===0){ for(let i=0;i<5;i++) addLinea(); }

    // Eventos básicos
    selCliente?.addEventListener('change', ()=>{
      const i=selCliente.value; if(i==='') return; const c=clientes[+i]; if(!c) return;
      if(cli.nombre) cli.nombre.value=c.nombre||''; if(cli.nif) cli.nif.value=c.nif||''; if(cli.dir) cli.dir.value=c.dir||''; if(cli.tel) cli.tel.value=c.tel||''; if(cli.email) cli.email.value=c.email||'';
    });

    $('#btnNuevoCliente')?.addEventListener('click', ()=>switchTab('clientes'));
    buscarCliente?.addEventListener('input', renderClientesLista);

    // Recalcular totales al cambiar opciones
    [chkTransporte, chkIvaIncluido, estado, pagadoInp].forEach(el=>el?.addEventListener('input', recalc));

    // Pintar todo
    renderAll(); recalc();

    // 🔁 Seguridad extra: forzar pintado tras carga completa
    window.addEventListener('load', () => {
      setTimeout(() => {
        try {
          seedClientesIfEmpty();
          seedProductsIfEmpty();
          renderAll(); recalc();
          console.log('✅ Render forzado OK');
        } catch(e){ console.error('⚠️ Error render forzado:', e); }
      }, 800);
    });
  });

})();
