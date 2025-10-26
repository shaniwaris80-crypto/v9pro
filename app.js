/* =======================================================
   ARSLAN PRO V10.4 — KIWI Edition (Full)
   - Mantiene TODAS las funciones (V10.3) y mejora UI/UX
   - Totales corregidos, autocompletado real, logo visible
   - PDF A4 con QR, pagos parciales, pendientes, ventas+top
======================================================= */
(function(){
"use strict";

/* ---------- HELPERS ---------- */
const $  = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
const money = n => (isNaN(n)?0:n).toFixed(2).replace('.', ',') + " €";
const parseNum = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
const escapeHTML = s => String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
const todayISO = () => new Date().toISOString();
const fmtDateDMY = d => `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
const unMoney = s => parseFloat(String(s).replace(/\./g,'').replace(',','.').replace(/[^\d.]/g,'')) || 0;

/* ---------- KEYS ---------- */
const K_CLIENTES='arslan_v104_clientes';
const K_PRODUCTOS='arslan_v104_productos';
const K_FACTURAS='arslan_v104_facturas';
const K_PRICEHIST='arslan_v104_pricehist';

/* ---------- ESTADO ---------- */
let clientes  = load(K_CLIENTES, []);
let productos = load(K_PRODUCTOS, []);
let facturas  = load(K_FACTURAS, []);
let priceHist = load(K_PRICEHIST, {});

function load(k, fallback){ try{ const v = JSON.parse(localStorage.getItem(k)||''); return v ?? fallback; } catch{ return fallback; } }
function save(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

/* ---------- SPLASH & TABS ---------- */
window.addEventListener('load', ()=>{
  setTimeout(()=>{ $('#splash')?.classList.add('fade'); document.querySelector('[data-tab="factura"]')?.click(); }, 900);
});
function switchTab(id){
  $$('button.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  $$('section.panel').forEach(p=>p.classList.toggle('active', p.dataset.tabPanel===id));
  if(id==='ventas'){ drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); }
  if(id==='pendientes'){ renderPendientes(); }
  if(id==='resumen'){ drawResumen(); }
}
$$('button.tab').forEach(b=>b.addEventListener('click', ()=>switchTab(b.dataset.tab)));

/* ---------- SEED DATA ---------- */
function uniqueByName(arr){
  const map=new Map();
  arr.forEach(c=>{ const k=(c.nombre||'').trim().toLowerCase(); if(k && !map.has(k)) map.set(k,c); });
  return [...map.values()];
}
function seedClientesIfEmpty(){
  if(clientes.length) return;
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
  save(K_CLIENTES, clientes);
}
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
function seedProductsIfEmpty(){
  if(productos.length) return;
  productos = PRODUCT_NAMES.map(n=>({name:n}));
  save(K_PRODUCTOS, productos);
}

/* ---------- PROVIDER DEFAULTS (tus datos) ---------- */
function setProviderDefaultsIfEmpty(){
  if(!$('#provNombre').value) $('#provNombre').value = 'Mohammad Arslan Waris';
  if(!$('#provNif').value)    $('#provNif').value    = 'X6389988J';
  if(!$('#provDir').value)    $('#provDir').value    = 'Calle San Pablo 17, 09003 Burgos';
  if(!$('#provTel').value)    $('#provTel').value    = '631 667 893';
  if(!$('#provEmail').value)  $('#provEmail').value  = 'shaniwaris80@gmail.com';
}

/* ---------- HISTORIAL DE PRECIOS ---------- */
function lastPrice(name){ const arr = priceHist[name]; return arr?.length ? arr[0].price : null; }
function pushPriceHistory(name, price){
  if(!name || !(price>0)) return;
  const arr = priceHist[name] || [];
  arr.unshift({price, date: todayISO()});
  priceHist[name] = arr.slice(0,10);
  save(K_PRICEHIST, priceHist);
}
function renderPriceHistory(name){
  const panel=$('#pricePanel'), body=$('#ppBody'); if(!panel||!body) return;
  panel.removeAttribute('hidden');
  const hist=priceHist[name]||[];
  if(hist.length===0){ body.innerHTML=`<div class="pp-row"><span>${escapeHTML(name)}</span><strong>Sin datos</strong></div>`; hidePanelSoon(); return; }
  body.innerHTML=`<div class="pp-row" style="justify-content:center"><strong>${escapeHTML(name)}</strong></div>` +
    hist.map(h=>`<div class="pp-row"><span>${fmtDateDMY(new Date(h.date))}</span><strong>${money(h.price)}</strong></div>`).join('');
  hidePanelSoon();
}
function hidePanelSoon(){ clearTimeout(hidePanelSoon.t); hidePanelSoon.t=setTimeout(()=>$('#pricePanel')?.setAttribute('hidden',''), 4800); }

/* ---------- CLIENTES UI ---------- */
function saveClientes(){ save(K_CLIENTES, clientes); }
function renderClientesSelect(){
  const sel = $('#selCliente'); if(!sel) return;
  sel.innerHTML = `<option value="">— Seleccionar cliente —</option>`;
  [...clientes].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'')).forEach((c,i)=>{
    const opt=document.createElement('option'); opt.value=i; opt.textContent=c.nombre||`Cliente ${i+1}`; sel.appendChild(opt);
  });
}
function renderClientesLista(){
  const cont = $('#listaClientes'); if(!cont) return;
  cont.innerHTML='';
  const q = ($('#buscarCliente')?.value||'').toLowerCase();
  const arr = [...clientes].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  const view = q ? arr.filter(c=>(c.nombre||'').toLowerCase().includes(q) || (c.nif||'').toLowerCase().includes(q) || (c.dir||'').toLowerCase().includes(q)) : arr;
  if(view.length===0){ cont.innerHTML='<div class="item">Sin clientes.</div>'; return; }
  view.forEach((c,idx)=>{
    const row=document.createElement('div'); row.className='item';
    row.innerHTML=`
      <div>
        <strong>${escapeHTML(c.nombre||'(Sin nombre)')}</strong>
        <div class="muted">${escapeHTML(c.nif||'')} · ${escapeHTML(c.dir||'')}</div>
      </div>
      <div class="row">
        <button class="ghost" data-e="use" data-i="${idx}">Usar</button>
        <button class="ghost" data-e="edit" data-i="${idx}">Editar</button>
        <button class="ghost" data-e="del" data-i="${idx}">Borrar</button>
      </div>
    `;
    cont.appendChild(row);
  });
  cont.querySelectorAll('button').forEach(b=>{
    const i=+b.dataset.i;
    b.addEventListener('click', ()=>{
      if(b.dataset.e==='use'){
        const c=clientes[i]; if(!c) return;
        $('#cliNombre').value=c.nombre||''; $('#cliNif').value=c.nif||''; $('#cliDir').value=c.dir||''; $('#cliTel').value=c.tel||''; $('#cliEmail').value=c.email||'';
        switchTab('factura');
      }else if(b.dataset.e==='edit'){
        const c=clientes[i];
        const nombre=prompt('Nombre',c.nombre||'')??c.nombre;
        const nif=prompt('NIF',c.nif||'')??c.nif;
        const dir=prompt('Dirección',c.dir||'')??c.dir;
        const tel=prompt('Tel',c.tel||'')??c.tel;
        const email=prompt('Email',c.email||'')??c.email;
        clientes[i]={nombre,nif,dir,tel,email}; saveClientes(); renderClientesSelect(); renderClientesLista();
      }else{
        if(confirm('¿Eliminar cliente?')){ clientes.splice(i,1); saveClientes(); renderClientesSelect(); renderClientesLista(); }
      }
    });
  });
}

/* ---------- PRODUCTOS UI ---------- */
function saveProductos(){ save(K_PRODUCTOS, productos); }
function populateProductDatalist(){
  const dl=$('#productNamesList'); if(!dl) return;
  dl.innerHTML='';
  productos.forEach(p=>{ const o=document.createElement('option'); o.value=p.name; dl.appendChild(o); });
}
function renderProductos(){
  const cont = $('#listaProductos'); if(!cont) return;
  const q = ($('#buscarProducto')?.value||'').toLowerCase();
  const view = q ? productos.filter(p=>(p.name||'').toLowerCase().includes(q)) : productos;
  cont.innerHTML='';
  if(view.length===0){ cont.innerHTML='<div class="item">Sin resultados.</div>'; return; }
  view.forEach((p,idx)=>{
    const row=document.createElement('div'); row.className='product-row';
    row.innerHTML=`
      <input value="${escapeHTML(p.name||'')}" data-f="name" />
      <select data-f="mode">
        <option value="">—</option><option value="kg"${p.mode==='kg'?' selected':''}>kg</option><option value="unidad"${p.mode==='unidad'?' selected':''}>unidad</option><option value="caja"${p.mode==='caja'?' selected':''}>caja</option>
      </select>
      <input type="number" step="0.01" data-f="boxKg" placeholder="Kg/caja" value="${p.boxKg??''}" />
      <input type="number" step="0.01" data-f="price" placeholder="€ base" value="${p.price??''}" />
      <input data-f="origin" placeholder="Origen" value="${escapeHTML(p.origin||'')}" />
      <button data-e="save" data-i="${idx}">💾 Guardar</button>
      <button class="ghost" data-e="del" data-i="${idx}">✖</button>
    `;
    cont.appendChild(row);
  });
  cont.querySelectorAll('button').forEach(b=>{
    const i=+b.dataset.i;
    b.addEventListener('click', ()=>{
      if(b.dataset.e==='del'){
        if(confirm('¿Eliminar producto?')){ productos.splice(i,1); saveProductos(); populateProductDatalist(); renderProductos(); }
      }else{
        const row=b.closest('.product-row');
        const get=f=>row.querySelector(`[data-f="${f}"]`).value.trim();
        const name=get('name'); const mode=(get('mode')||null);
        const boxKgStr=get('boxKg'); const boxKg=boxKgStr===''?null:parseNum(boxKgStr);
        const priceStr=get('price'); const price=priceStr===''?null:parseNum(priceStr);
        const origin=get('origin')||null;
        productos[i]={name,mode,boxKg,price,origin}; saveProductos(); populateProductDatalist(); renderProductos();
      }
    });
  });
}
$('#buscarProducto')?.addEventListener('input', renderProductos);

/* ---------- FACTURA: LÍNEAS ---------- */
function findProducto(name){ return productos.find(p=>(p.name||'').toLowerCase()===String(name).toLowerCase()); }
function addLinea(){
  const tb = $('#lineasBody'); if(!tb) return;
  const tr=document.createElement('tr');
  tr.innerHTML=`
    <td><input class="name" list="productNamesList" placeholder="Producto (↓ para ver lista)" /></td>
    <td>
      <select class="mode">
        <option value="">—</option><option value="kg">kg</option><option value="unidad">unidad</option><option value="caja">caja</option>
      </select>
    </td>
    <td><input class="qty" type="number" step="1"  placeholder="Cant." /></td>
    <td><input class="gross" type="number" step="0.01" placeholder="Bruto" /></td>
    <td><input class="tare"  type="number" step="0.01" placeholder="Tara" /></td>
    <td><input class="net"   type="number" step="0.01" placeholder="Neto" disabled /></td>
    <td><input class="price" type="number" step="0.01" placeholder="Precio" /></td>
    <td><input class="origin" placeholder="Origen (opcional)" /></td>
    <td><input class="amount" placeholder="Importe" disabled /></td>
    <td><button class="del">✕</button></td>
  `;
  tb.appendChild(tr);

  const name=tr.querySelector('.name');
  const mode=tr.querySelector('.mode');
  const qty=tr.querySelector('.qty');
  const gross=tr.querySelector('.gross');
  const tare=tr.querySelector('.tare');
  const net=tr.querySelector('.net');
  const price=tr.querySelector('.price');
  const origin=tr.querySelector('.origin');
  const amount=tr.querySelector('.amount');

  const showHist=()=>{ const n=name.value.trim(); if(n) renderPriceHistory(n); };
  name.addEventListener('focus', showHist);
  price.addEventListener('focus', showHist);

  name.addEventListener('change', ()=>{
    const p=findProducto(name.value.trim());
    if(p){
      if(p.mode) mode.value=p.mode;
      if(p.price!=null) price.value=p.price;
      if(p.origin) origin.value=p.origin;
      const lp=lastPrice(p.name); if(lp!=null && !p.price) price.value=lp;
      renderPriceHistory(p.name);
    }
    recalcLine();
  });

  [mode, qty, gross, tare, price].forEach(i=>i.addEventListener('input', recalcLine));
  tr.querySelector('.del').addEventListener('click', ()=>{ tr.remove(); recalc(); });

  function recalcLine(){
    const m=(mode.value||'').toLowerCase();
    const q=Math.max(0, Math.floor(parseNum(qty.value||0)));
    const g=Math.max(0, parseNum(gross.value||0));
    const t=Math.max(0, parseNum(tare.value||0));
    const pr=Math.max(0, parseNum(price.value||0));
    let n=0;

    if(g>0 || t>0){ n=Math.max(0,g-t); }
    else if(m==='caja'){ const p=findProducto(name.value); const kg=p?.boxKg||0; n=q*kg; }
    else if(m==='kg'){ n=q; }
    else if(m==='unidad'){ n=q; }

    net.value = n ? n.toFixed(2) : '';
    const amt = (m==='unidad') ? q*pr : n*pr;
    amount.value = amt>0 ? amt.toFixed(2) : '';
    recalc();
  }
}
function captureLineas(){
  return $$('#lineasBody tr').map(r=>{
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

/* ---------- PAGOS PARCIALES EN UI ---------- */
let pagosTemp = []; // {date, amount}
function renderPagosTemp(){
  const list=$('#listaPagos'); if(!list) return;
  list.innerHTML='';
  if(pagosTemp.length===0){ list.innerHTML='<div class="item">Sin pagos parciales.</div>'; return; }
  pagosTemp.forEach((p,i)=>{
    const div=document.createElement('div'); div.className='item';
    div.innerHTML=`<div>${fmtDateDMY(new Date(p.date))} · <strong>${money(p.amount)}</strong></div><button class="ghost" data-i="${i}">✖</button>`;
    list.appendChild(div);
  });
  list.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{ pagosTemp.splice(+b.dataset.i,1); renderPagosTemp(); recalc(); });
  });
}
$('#btnAddPago')?.addEventListener('click', ()=>{
  const amt=parseNum($('#inpPagoParcial').value||0); if(!(amt>0)) return;
  pagosTemp.unshift({date: todayISO(), amount: amt});
  $('#inpPagoParcial').value='';
  renderPagosTemp(); recalc();
});

/* ---------- RECÁLCULO + PDF FILL + ESTADO ---------- */
function recalc(){
  const ls=captureLineas();
  let subtotal=0; ls.forEach(l=> subtotal+=lineImporte(l));
  const transporte = $('#chkTransporte')?.checked ? subtotal*0.10 : 0;
  const baseMasTrans = subtotal + transporte;
  const iva = baseMasTrans * 0.04; // informativo
  const total = baseMasTrans;

  // pagado = pagosTemp + input manual
  const manual = parseNum($('#pagado')?.value||0);
  const parcial = pagosTemp.reduce((a,b)=>a+(b.amount||0),0);
  const pagadoTotal = manual + parcial;
  const pendiente = Math.max(0, total - pagadoTotal);

  $('#subtotal').textContent = money(subtotal);
  $('#transp').textContent = money(transporte);
  $('#iva').textContent = money(iva);
  $('#total').textContent = money(total);
  $('#pendiente').textContent = money(pendiente);

  // estado sugerido
  if(total<=0){ $('#estado').value='pendiente'; }
  else if(pagadoTotal<=0){ $('#estado').value='pendiente'; }
  else if(pagadoTotal<total){ $('#estado').value='parcial'; }
  else { $('#estado').value='pagado'; }

  // Pie de PDF
  const foot=$('#pdf-foot-note');
  if(foot){
    foot.textContent = $('#chkIvaIncluido')?.checked ? 'IVA incluido en los precios.' : 'IVA (4%) mostrado como informativo. Transporte 10% opcional.';
  }

  fillPrint(ls,{subtotal,transporte,iva,total},{pagado:pagadoTotal,pendiente});
  drawResumen(); // KPIs rápidos
}
;['chkTransporte','chkIvaIncluido','estado','pagado'].forEach(id=>$('#'+id)?.addEventListener('input', recalc));

function fillPrint(lines, totals, temp=null, f=null){
  $('#p-num').textContent = f?.numero || '(Sin guardar)';
  $('#p-fecha').textContent = (f?new Date(f.fecha):new Date()).toLocaleString();

  $('#p-prov').innerHTML = `
    <div><strong>${escapeHTML(f?.proveedor?.nombre || $('#provNombre').value || '')}</strong></div>
    <div>${escapeHTML(f?.proveedor?.nif || $('#provNif').value || '')}</div>
    <div>${escapeHTML(f?.proveedor?.dir || $('#provDir').value || '')}</div>
    <div>${escapeHTML(f?.proveedor?.tel || $('#provTel').value || '')} · ${escapeHTML(f?.proveedor?.email || $('#provEmail').value || '')}</div>
  `;
  $('#p-cli').innerHTML = `
    <div><strong>${escapeHTML(f?.cliente?.nombre || $('#cliNombre').value || '')}</strong></div>
    <div>${escapeHTML(f?.cliente?.nif || $('#cliNif').value || '')}</div>
    <div>${escapeHTML(f?.cliente?.dir || $('#cliDir').value || '')}</div>
    <div>${escapeHTML(f?.cliente?.tel || $('#cliTel').value || '')} · ${escapeHTML(f?.cliente?.email || $('#cliEmail').value || '')}</div>
  `;

  const tbody = $('#p-tabla tbody'); tbody.innerHTML='';
  (lines||[]).forEach(l=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(l.name)}</td>
      <td>${escapeHTML(l.mode||'')}</td>
      <td>${l.qty||''}</td>
      <td>${l.gross?l.gross.toFixed(2):''}</td>
      <td>${l.tare?l.tare.toFixed(2):''}</td>
      <td>${l.net?l.net.toFixed(2):''}</td>
      <td>${money(l.price)}</td>
      <td>${escapeHTML(l.origin||'')}</td>
      <td>${money((l.mode==='unidad') ? l.qty*l.price : l.net*l.price)}</td>
    `;
    tbody.appendChild(tr);
  });

  $('#p-sub').textContent = money(totals?.subtotal||0);
  $('#p-tra').textContent = money(totals?.transporte||0);
  $('#p-iva').textContent = money(totals?.iva||0);
  $('#p-tot').textContent = money(totals?.total||0);
  $('#p-estado').textContent = f?.estado || $('#estado')?.value || 'Impagada';
  $('#p-metodo').textContent = f?.metodo || $('#metodoPago')?.value || 'Efectivo';
  $('#p-obs').textContent = f?.obs || ($('#observaciones')?.value||'—');

  // QR con datos básicos
  try{
    const canvas = $('#p-qr');
    const numero = f?.numero || '(Sin guardar)';
    const cliente = f?.cliente?.nombre || $('#cliNombre').value || '';
    const payload = `ARSLAN-Factura|${numero}|${cliente}|${money(totals?.total||0)}|${$('#p-estado').textContent}`;
    window.QRCode.toCanvas(canvas, payload, {width:92, margin:0});
  }catch(e){}
}

/* ---------- GUARDAR / NUEVA / PDF ---------- */
function genNumFactura(){ const d=new Date(), pad=n=>String(n).padStart(2,'0'); return `FA-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; }
function saveFacturas(){ save(K_FACTURAS, facturas); }

$('#btnGuardar')?.addEventListener('click', ()=>{
  const ls=captureLineas(); if(ls.length===0){ alert('Añade al menos una línea.'); return; }
  const numero=genNumFactura(); const now=todayISO();
  ls.forEach(l=> pushPriceHistory(l.name, l.price));

  const subtotal=unMoney($('#subtotal').textContent);
  const transporte=unMoney($('#transp').textContent);
  const iva=unMoney($('#iva').textContent);
  const total=unMoney($('#total').textContent);

  const manual = parseNum($('#pagado').value||0);
  const pagos = [...pagosTemp]; // copiar
  const pagadoParcial = pagos.reduce((a,b)=>a+(b.amount||0),0);
  const pagadoTotal = manual + pagadoParcial;
  const pendiente=Math.max(0,total-pagadoTotal);

  const estado = (pagadoTotal<=0) ? 'pendiente' : (pagadoTotal<total ? 'parcial' : 'pagado');

  const f={
    numero, fecha:now,
    proveedor:{nombre:$('#provNombre').value,nif:$('#provNif').value,dir:$('#provDir').value,tel:$('#provTel').value,email:$('#provEmail').value},
    cliente:{nombre:$('#cliNombre').value,nif:$('#cliNif').value,dir:$('#cliDir').value,tel:$('#cliTel').value,email:$('#cliEmail').value},
    lineas:ls, transporte:$('#chkTransporte').checked, ivaIncluido:$('#chkIvaIncluido').checked,
    estado, metodo:$('#metodoPago').value, obs:$('#observaciones').value,
    totals:{subtotal,transporte,iva,total,pagado:pagadoTotal,pendiente},
    pagos // historial de pagos parciales
  };
  facturas.unshift(f); saveFacturas();
  pagosTemp = []; renderPagosTemp();
  alert(`Factura ${numero} guardada.`);
  renderFacturas(); renderPendientes(); drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen();
  fillPrint(ls,{subtotal,transporte,iva,total},null,f);
});

$('#btnNueva')?.addEventListener('click', ()=>{
  const tb=$('#lineasBody'); tb.innerHTML=''; for(let i=0;i<5;i++) addLinea();
  $('#chkTransporte').checked=false; $('#chkIvaIncluido').checked=true; $('#estado').value='pendiente';
  $('#pagado').value=''; $('#metodoPago').value='Efectivo'; $('#observaciones').value='';
  pagosTemp=[]; renderPagosTemp();
  recalc();
});

$('#btnImprimir')?.addEventListener('click', ()=>{
  const element = document.getElementById('printArea');
  const d=new Date(); const file=`Factura-${($('#cliNombre').value||'Cliente').replace(/\s+/g,'')}-${fmtDateDMY(d)}.pdf`;
  const opt = { margin:[10,10,10,10], filename:file, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} };
  window.html2pdf().set(opt).from(element).save();
});

/* ---------- LISTA DE FACTURAS ---------- */
function badgeEstado(f){
  const tot=f.totals?.total||0, pag=f.totals?.pagado||0;
  if(pag>=tot) return `<span class="state-badge state-green">Pagada</span>`;
  if(pag>0 && pag<tot) return `<span class="state-badge state-amber">Parcial (${money(pag)} / ${money(tot)})</span>`;
  return `<span class="state-badge state-red">Impagada</span>`;
}
function renderFacturas(){
  const cont=$('#listaFacturas'); if(!cont) return;
  cont.innerHTML='';
  const q=($('#buscaCliente')?.value||'').toLowerCase();
  const fe=$('#filtroEstado')?.value||'todas';
  let arr=facturas.slice();
  if(fe!=='todas') arr=arr.filter(f=>f.estado===fe);
  if(q) arr=arr.filter(f=>(f.cliente?.nombre||'').toLowerCase().includes(q));
  if(arr.length===0){ cont.innerHTML='<div class="item">No hay facturas.</div>'; return; }

  arr.slice(0,400).forEach((f,idx)=>{
    const fecha=new Date(f.fecha).toLocaleString();
    const div=document.createElement('div'); div.className='item';
    div.innerHTML=`
      <div>
        <strong>${escapeHTML(f.numero)}</strong> ${badgeEstado(f)}
        <div class="muted">${fecha} · ${escapeHTML(f.cliente?.nombre||'')}</div>
      </div>
      <div class="row">
        <strong>${money(f.totals.total)}</strong>
        <button class="ghost" data-e="ver" data-i="${idx}">Ver</button>
        <button data-e="cobrar" data-i="${idx}">💶 Cobrar</button>
        <button class="ghost" data-e="parcial" data-i="${idx}">+ Parcial</button>
        <button class="ghost" data-e="pdf" data-i="${idx}">PDF</button>
      </div>`;
    cont.appendChild(div);
  });

  cont.querySelectorAll('button').forEach(b=>{
    const i=+b.dataset.i;
    b.addEventListener('click', ()=>{
      const f=facturas[i]; if(!f) return;
      if(b.dataset.e==='ver'){
        fillPrint(f.lineas,f.totals,null,f); switchTab('factura'); document.getElementById('printArea')?.scrollIntoView({behavior:'smooth'});
      }else if(b.dataset.e==='cobrar'){
        const tot=f.totals.total||0;
        f.totals.pagado=tot; f.totals.pendiente=0; f.estado='pagado';
        (f.pagos??=[]).push({date:todayISO(), amount: tot});
        saveFacturas(); renderFacturas(); renderPendientes(); drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen();
      }else if(b.dataset.e==='parcial'){
        const max=f.totals.total-(f.totals.pagado||0);
        const val=parseNum(prompt(`Importe abonado (pendiente ${money(max)}):`)||0);
        if(val>0){
          f.pagos=f.pagos||[]; f.pagos.push({date:todayISO(), amount:val});
          f.totals.pagado=(f.totals.pagado||0)+val;
          f.totals.pendiente=Math.max(0,(f.totals.total||0)-f.totals.pagado);
          f.estado = f.totals.pendiente>0 ? (f.totals.pagado>0?'parcial':'pendiente') : 'pagado';
          saveFacturas(); renderFacturas(); renderPendientes(); drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen();
        }
      }else if(b.dataset.e==='pdf'){
        fillPrint(f.lineas,f.totals,null,f);
        const dt=new Date(f.fecha);
        const nombreCliente=(f.cliente?.nombre||'Cliente').replace(/\s+/g,'');
        const filename=`Factura-${nombreCliente}-${fmtDateDMY(dt)}.pdf`;
        const opt={ margin:[10,10,10,10], filename, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} };
        window.html2pdf().set(opt).from(document.getElementById('printArea')).save();
      }
    });
  });
}
$('#filtroEstado')?.addEventListener('input', renderFacturas);
$('#buscaCliente')?.addEventListener('input', renderFacturas);

/* ---------- PENDIENTES ---------- */
function renderPendientes(){
  const tb=$('#tblPendientes tbody'); if(!tb) return;
  tb.innerHTML='';
  const map=new Map(); // cliente -> {count, total, lastDate}
  facturas.forEach(f=>{
    const pend=f.totals?.pendiente||0; if(pend<=0) return;
    const nom=f.cliente?.nombre||'(s/cliente)';
    const cur=map.get(nom)||{count:0,total:0,lastDate:null};
    cur.count++; cur.total+=pend; cur.lastDate = !cur.lastDate || new Date(f.fecha)>new Date(cur.lastDate) ? f.fecha : cur.lastDate;
    map.set(nom,cur);
  });
  let global=0;
  const rows=[...map.entries()].sort((a,b)=>b[1].total-a[1].total);
  rows.forEach(([nom,info])=>{
    global+=info.total;
    const tr=document.createElement('tr');
    const color = info.total>500 ? 'state-red' : info.total>=100 ? 'state-amber' : 'state-green';
    tr.innerHTML=`
      <td>${escapeHTML(nom)}</td>
      <td>${info.count}</td>
      <td><span class="state-badge ${color}">${money(info.total)}</span></td>
      <td>${new Date(info.lastDate).toLocaleString()}</td>
      <td><button class="ghost" data-c="${escapeHTML(nom)}">Ver facturas</button></td>
    `;
    tb.appendChild(tr);
  });
  $('#resGlobal').textContent = money(global);

  tb.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{
      const nombre=b.dataset.c;
      $('#buscaCliente').value=nombre;
      switchTab('facturas');
      renderFacturas();
    });
  });
}

/* ---------- VENTAS (KPIs, gráficos, top, por cliente) ---------- */
function sumBetween(d1,d2,filterClient=null){
  let sum=0;
  facturas.forEach(f=>{
    const d=new Date(f.fecha);
    if(d>=d1 && d<d2 && (!filterClient || (f.cliente?.nombre||'')===filterClient)) sum+=(f.totals?.total||0);
  });
  return sum;
}
function startOfDay(d=new Date()){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d=new Date()){ const x=new Date(d); x.setHours(23,59,59,999); return x; }
function startOfWeek(d=new Date()){ const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }
function startOfMonth(d=new Date()){ return new Date(d.getFullYear(), d.getMonth(), 1); }

function drawKPIs(){
  const now=new Date();
  const hoy = sumBetween(startOfDay(now), endOfDay(now));
  const semana = sumBetween(startOfWeek(now), endOfDay(now));
  const mes = sumBetween(startOfMonth(now), endOfDay(now));
  const total = facturas.reduce((a,f)=>a+(f.totals?.total||0),0);
  $('#vHoy').textContent=money(hoy);
  $('#vSemana').textContent=money(semana);
  $('#vMes').textContent=money(mes);
  $('#vTotal').textContent=money(total);

  $('#rHoy').textContent=money(hoy);
  $('#rSemana').textContent=money(semana);
  $('#rMes').textContent=money(mes);
  $('#rTotal').textContent=money(total);
}

let chart1, chart2, chartTop;
function groupDaily(n=7){
  const now=new Date(); const buckets=[];
  for(let i=n-1;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i); const k=d.toISOString().slice(0,10); buckets.push({k,label:k.slice(5),sum:0}); }
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
  if(typeof Chart==='undefined') return;
  const daily=groupDaily(7); const monthly=groupMonthly(12);
  if(chart1) chart1.destroy(); if(chart2) chart2.destroy();
  chart1=new Chart(document.getElementById('chartDiario').getContext('2d'), {type:'bar', data:{labels:daily.map(d=>d.label), datasets:[{label:'Ventas diarias', data:daily.map(d=>d.sum)}]}, options:{responsive:true, plugins:{legend:{display:false}}}});
  chart2=new Chart(document.getElementById('chartMensual').getContext('2d'), {type:'line', data:{labels:monthly.map(d=>d.label), datasets:[{label:'Ventas mensuales', data:monthly.map(d=>d.sum)}]}, options:{responsive:true, plugins:{legend:{display:false}}}});
}
function drawTop(){
  if(typeof Chart==='undefined') return;
  const map=new Map(); // name -> total €
  facturas.forEach(f=>{
    (f.lineas||[]).forEach(l=>{
      const amt = (l.mode==='unidad') ? l.qty*l.price : l.net*l.price;
      map.set(l.name,(map.get(l.name)||0)+amt);
    });
  });
  const pairs=[...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
  const labels=pairs.map(p=>p[0]); const data=pairs.map(p=>p[1]);
  if(chartTop) chartTop.destroy();
  chartTop=new Chart(document.getElementById('chartTop').getContext('2d'), {type:'bar', data:{labels, datasets:[{label:'Top productos (€)', data} ]}, options:{responsive:true, plugins:{legend:{display:false}}}});
}

function renderVentasCliente(){
  const tb=$('#tblVentasCliente tbody'); if(!tb) return;
  tb.innerHTML='';
  const now=new Date();
  const sDay=startOfDay(now), eDay=endOfDay(now);
  const sWeek=startOfWeek(now), eWeek=endOfDay(now);
  const sMonth=startOfMonth(now), eMonth=endOfDay(now);

  const byClient=new Map(); // cliente -> {hoy,semana,mes,total}
  facturas.forEach(f=>{
    const nom=f.cliente?.nombre||'(s/cliente)';
    const d=new Date(f.fecha); const tot=f.totals?.total||0;
    const cur=byClient.get(nom)||{hoy:0,semana:0,mes:0,total:0};
    if(d>=sDay && d<=eDay) cur.hoy+=tot;
    if(d>=sWeek&&d<=eWeek) cur.semana+=tot;
    if(d>=sMonth&&d<=eMonth) cur.mes+=tot;
    cur.total+=tot;
    byClient.set(nom,cur);
  });

  [...byClient.entries()].sort((a,b)=>b[1].total-a[1].total).forEach(([nom,v])=>{
    const tr=document.createElement('tr');
    const highlight = v.hoy>0 ? 'state-green' : '';
    tr.innerHTML=`<td>${escapeHTML(nom)}</td><td class="${highlight}">${money(v.hoy)}</td><td>${money(v.semana)}</td><td>${money(v.mes)}</td><td><strong>${money(v.total)}</strong></td>`;
    tb.appendChild(tr);
  });
}

/* ---------- BACKUP/RESTORE + EXPORTS ---------- */
$('#btnBackup')?.addEventListener('click', ()=>{
  const payload={clientes, productos, facturas, priceHist, fecha: todayISO(), version:'ARSLAN PRO V10.4'};
  const filename=`backup-${fmtDateDMY(new Date())}.json`;
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});
$('#btnRestore')?.addEventListener('click', ()=>{
  const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const reader=new FileReader(); reader.onload=()=>{
      try{
        const obj=JSON.parse(reader.result);
        if(obj.clientes) clientes=obj.clientes;
        if(obj.productos) productos=obj.productos;
        if(obj.facturas) facturas=obj.facturas;
        if(obj.priceHist) priceHist=obj.priceHist;
        save(K_CLIENTES,clientes); save(K_PRODUCTOS,productos); save(K_FACTURAS,facturas); save(K_PRICEHIST,priceHist);
        renderAll(); alert('Copia restaurada ✔️');
      }catch{ alert('JSON inválido'); }
    }; reader.readAsText(f);
  };
  inp.click();
});
$('#btnExportClientes')?.addEventListener('click', ()=>downloadJSON(clientes,'clientes-arslan-v104.json'));
$('#btnImportClientes')?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ clientes=uniqueByName(arr); save(K_CLIENTES,clientes); renderClientesSelect(); renderClientesLista(); } }));
$('#btnExportProductos')?.addEventListener('click', ()=>downloadJSON(productos,'productos-arslan-v104.json'));
$('#btnImportProductos')?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ productos=arr; save(K_PRODUCTOS,productos); populateProductDatalist(); renderProductos(); } }));
$('#btnExportFacturas')?.addEventListener('click', ()=>downloadJSON(facturas,'facturas-arslan-v104.json'));
$('#btnImportFacturas')?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ facturas=arr; save(K_FACTURAS,facturas); renderFacturas(); renderPendientes(); drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen(); } }));
$('#btnExportVentas')?.addEventListener('click', exportVentasCSV);

function downloadJSON(obj, filename){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function uploadJSON(cb){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ cb(JSON.parse(r.result)); }catch{ alert('JSON inválido'); } }; r.readAsText(f); };
  inp.click();
}
function exportVentasCSV(){
  const rows=[['Cliente','Fecha','Nº','Total','Pagado','Pendiente','Estado']];
  facturas.forEach(f=>{
    rows.push([f.cliente?.nombre||'', new Date(f.fecha).toLocaleString(), f.numero, (f.totals?.total||0), (f.totals?.pagado||0), (f.totals?.pendiente||0), f.estado]);
  });
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='ventas.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/* ---------- EVENTOS GENERALES ---------- */
$('#btnAddLinea')?.addEventListener('click', addLinea);
$('#btnVaciarLineas')?.addEventListener('click', ()=>{ if(confirm('¿Vaciar líneas?')){ const tb=$('#lineasBody'); tb.innerHTML=''; for(let i=0;i<5;i++) addLinea(); recalc(); }});
$('#btnNuevoCliente')?.addEventListener('click', ()=>switchTab('clientes'));
$('#selCliente')?.addEventListener('change', ()=>{
  const i=$('#selCliente').value; if(i==='') return; const c=clientes[+i]; if(!c) return;
  $('#cliNombre').value=c.nombre||''; $('#cliNif').value=c.nif||''; $('#cliDir').value=c.dir||''; $('#cliTel').value=c.tel||''; $('#cliEmail').value=c.email||'';
});
$('#btnAddCliente')?.addEventListener('click', ()=>{
  const nombre=prompt('Nombre del cliente:'); if(!nombre) return;
  const nif=prompt('NIF/CIF:')||''; const dir=prompt('Dirección:')||''; const tel=prompt('Teléfono:')||''; const email=prompt('Email:')||'';
  clientes.push({nombre,nif,dir,tel,email}); saveClientes(); renderClientesSelect(); renderClientesLista();
});
$('#buscarCliente')?.addEventListener('input', renderClientesLista);

/* ---------- RESUMEN ---------- */
function renderAll(){
  renderClientesSelect(); renderClientesLista();
  populateProductDatalist(); renderProductos(); renderFacturas(); renderPendientes();
  drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); drawResumen();
}
function drawResumen(){ drawKPIs(); }

/* ---------- BOOT ---------- */
(function boot(){
  seedClientesIfEmpty();
  seedProductsIfEmpty();

  // proveedor por defecto (tus datos)
  setProviderDefaultsIfEmpty();

  // 5 líneas iniciales
  const tb=$('#lineasBody'); if(tb && tb.children.length===0){ for(let i=0;i<5;i++) addLinea(); }

  renderPagosTemp();
  renderAll(); recalc();

  // verificación inicial tras cargar assets
  window.addEventListener('load', ()=>setTimeout(()=>{ try{
    populateProductDatalist(); renderProductos(); renderClientesSelect(); renderClientesLista(); renderFacturas(); renderPendientes(); drawKPIs(); drawCharts(); drawTop(); renderVentasCliente(); recalc();
  }catch(e){ console.error('Init error',e); } }, 600));
})();
})();
/* === Envío simple por WhatsApp al guardar factura === */
const WHATSAPP_NUMBER = "+34631667893";

function enviarWhatsAppSimple(){
  const mensaje = encodeURIComponent("✅ Factura emitida correctamente por ARSLAN PRO KIWI Edition.");
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${mensaje}`;
  window.open(url, "_blank");
}

/* Vincular al botón Guardar factura */
document.addEventListener("DOMContentLoaded", () => {
  const btnGuardar = document.querySelector("#btnGuardar");
  if (btnGuardar) {
    btnGuardar.addEventListener("click", () => {
      setTimeout(enviarWhatsAppSimple, 1500); // espera 1,5s y abre WhatsApp
    });
  }
});
/* === 🎨 Paleta de colores + Botón flotante (modo visual) =================== */
/* Paleta: Verde Kiwi, Azul, Naranja, Gris oscuro */
const PALETA = [
  { name: 'Kiwi', color: '#1f9d55' },
  { name: 'Azul', color: '#2563eb' },
  { name: 'Naranja', color: '#f59e0b' },
  { name: 'Gris', color: '#1d2939' }
];

/* Crear botón flotante */
const btnColor = document.createElement('div');
btnColor.id = 'btnColor';
btnColor.innerHTML = '🎨';
btnColor.style.cssText = `
  position:fixed;bottom:15px;right:15px;z-index:9999;
  width:48px;height:48px;border-radius:50%;
  background:#1f9d55;color:#fff;font-size:22px;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25);
  transition:background .3s ease;
`;
document.body.appendChild(btnColor);

/* Crear menú desplegable */
const menu = document.createElement('div');
menu.id = 'colorMenu';
menu.style.cssText = `
  position:fixed;bottom:70px;right:20px;z-index:9998;
  display:none;flex-direction:column;gap:8px;
`;
document.body.appendChild(menu);

/* Añadir botones de colores */
PALETA.forEach(p=>{
  const c=document.createElement('button');
  c.textContent=p.name;
  c.style.cssText=`background:${p.color};border:none;padding:6px 10px;color:white;border-radius:6px;font-family:Poppins;cursor:pointer;`;
  c.addEventListener('click',()=>{
    document.documentElement.style.setProperty('--accent',p.color);
    document.body.style.setProperty('border-color',p.color);
    localStorage.setItem('arslan_color',p.color);
    menu.style.display='none';
  });
  menu.appendChild(c);
});

/* Mostrar / ocultar menú */
btnColor.addEventListener('click',()=>{
  menu.style.display = menu.style.display==='flex' ? 'none' : 'flex';
});

/* Recordar color guardado */
const guardado = localStorage.getItem('arslan_color');
if(guardado){
  document.documentElement.style.setProperty('--accent',guardado);
}

/* Estilo general: aplica color dinámico a botones y enlaces */
const style = document.createElement('style');
style.textContent = `
  :root{ --accent: #1f9d55; }
  button, .btn, .tab.active{
    background: var(--accent)!important;
    border-color: var(--accent)!important;
  }
  a, strong, .badge.ok{ color: var(--accent)!important; }
  @media print{
    body *{ color:#000!important; background:#fff!important; box-shadow:none!important; }
    #btnColor,#colorMenu{ display:none!important; }
  }
`;
document.head.appendChild(style);
/* ========================================================================== */
/* ============================================================
 🥝  ARSLAN PRO V10.4 – Add-ons Pack (bloque final opcional)
     Mejora visual, accesos rápidos y utilidad en móvil.
     Todo sin modificar el código base.
============================================================ */

/* 1️⃣ Botón volver arriba */
const btnUp = document.createElement('button');
btnUp.textContent = '⬆️';
btnUp.id = 'btnUp';
btnUp.style.cssText = `
 position:fixed;bottom:70px;right:15px;z-index:9998;
 background:#000;color:#fff;border:none;padding:10px;
 border-radius:50%;cursor:pointer;display:none;
`;
document.body.appendChild(btnUp);
window.addEventListener('scroll',()=>{btnUp.style.display=(window.scrollY>400)?'block':'none';});
btnUp.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

/* 2️⃣ Auto modo oscuro según sistema */
if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){
  document.documentElement.style.background='#111';
  document.body.style.color='#eee';
}

/* 3️⃣ Aviso visual toast al guardar factura */
function toast(msg){
  const t=document.createElement('div');
  t.textContent=msg;
  t.style.cssText='position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#1f9d55;color:#fff;padding:10px 20px;border-radius:8px;font-family:Poppins;z-index:9999;animation:fade 2.8s ease;';
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2800);
}
const css=document.createElement('style');
css.textContent='@keyframes fade{0%{opacity:0;}10%,90%{opacity:1;}100%{opacity:0;}}';
document.head.appendChild(css);
document.querySelector('#btnGuardar')?.addEventListener('click',()=>setTimeout(()=>toast('✅ Factura guardada correctamente'),1000));

/* 4️⃣ Atajo Ctrl+N para nueva factura */
document.addEventListener('keydown',e=>{
  if(e.ctrlKey && e.key.toLowerCase()==='n'){
    e.preventDefault();
    document.querySelector('#btnNueva')?.click();
  }
});

/* 5️⃣ Mini reloj digital */
const reloj=document.createElement('div');
reloj.id='reloj';
reloj.style.cssText='position:fixed;top:10px;right:10px;font-family:Poppins;color:#1f9d55;font-size:14px;z-index:9999;';
document.body.appendChild(reloj);
setInterval(()=>{
  const d=new Date();reloj.textContent=d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
},1000);

/* 6️⃣ Cambiar a pestaña Facturas tras guardar */
document.querySelector('#btnGuardar')?.addEventListener('click',()=>{
  setTimeout(()=>document.querySelector('[data-tab="facturas"]')?.click(),1200);
});

/* 7️⃣ Aviso antes de cerrar la página */
window.addEventListener('beforeunload', e => {
  e.preventDefault();
  e.returnValue = '¿Seguro que quieres salir? Los cambios no guardados se perderán.';
});

/* 8️⃣ Modo compacto en móvil */
if(window.innerWidth < 600){
  document.body.style.fontSize='14px';
}

/* 9️⃣ Indicador de facturas pendientes */
function checkPendientes(){
  const data=JSON.parse(localStorage.getItem('arslan_v9_facturas')||'[]');
  const pendientes=data.filter(f=>f.estado!=='pagado').length;
  const tab=document.querySelector('[data-tab="facturas"]');
  if(!tab)return;
  if(pendientes>0){ tab.textContent=`Facturas 🔴(${pendientes})`; }
  else{ tab.textContent='Facturas'; }
}
checkPendientes();
setInterval(checkPendientes,5000);

/* 🔟 Pulso verde en botón de color 🎨 si existe */
const pulse=document.createElement('style');
pulse.textContent='@keyframes pulseKiwi{0%{box-shadow:0 0 0 0 rgba(31,157,85,0.5);}70%{box-shadow:0 0 0 10px rgba(31,157,85,0);}100%{box-shadow:0 0 0 0 rgba(31,157,85,0);}}#btnColor{animation:pulseKiwi 2s infinite;}';
document.head.appendChild(pulse);

/* ✅ Compatibilidad con impresión PDF: sin color */
const styleBW = document.createElement('style');
styleBW.textContent = `
 @media print {
   body * { color:#000!important; background:#fff!important; box-shadow:none!important; }
   #btnColor,#colorMenu,#btnUp,#reloj { display:none!important; }
 }
`;
document.head.appendChild(styleBW);

/* ============================================================
  Fin del bloque de mejoras simples 🍃
============================================================ */
/* ============================================================
🥝  ARSLAN PRO – Add-ons Pack 2 (funciones inteligentes)
============================================================ */

/* 1️⃣  Recordatorio automático de cobros pendientes (una vez al día) */
function recordarPendientes(){
  const data=JSON.parse(localStorage.getItem('arslan_v9_facturas')||'[]');
  const impagos=data.filter(f=>f.estado!=='pagado');
  if(impagos.length>0){
    const totalImpagos=impagos.reduce((a,b)=>a+(b.totals?.pendiente||0),0);
    const msg=`📢 Tienes ${impagos.length} facturas pendientes por ${totalImpagos.toFixed(2)} €`;
    toast(msg);
  }
}
// 1 recordatorio cada 24 h
if(!localStorage.getItem('arslan_last_reminder') ||
   Date.now()-localStorage.getItem('arslan_last_reminder')>24*60*60*1000){
  recordarPendientes();
  localStorage.setItem('arslan_last_reminder',Date.now());
}

/* 2️⃣  Búsqueda rápida de facturas por cliente o número */
const buscadorGlobal=document.createElement('input');
buscadorGlobal.placeholder='🔍 Buscar factura o cliente...';
buscadorGlobal.style.cssText='position:fixed;top:10px;left:10px;width:200px;padding:6px;border-radius:6px;border:1px solid #ccc;z-index:9999;font-family:Poppins;';
document.body.appendChild(buscadorGlobal);
buscadorGlobal.addEventListener('input',()=>{
  const q=buscadorGlobal.value.toLowerCase();
  const data=JSON.parse(localStorage.getItem("arslan_v9_facturas")||"[]");
  if(!q){buscadorGlobal.style.background="white";return;}
  const res=data.filter(f=>(f.cliente?.nombre||"").toLowerCase().includes(q)|| (f.numero||"").toLowerCase().includes(q));
  buscadorGlobal.style.background=res.length>0?'#e8f7ee':'#fde2e2';
});

/* 3️⃣  Copia de seguridad automática semanal */
function backupSemanal(){
  const hoy=new Date(); const dia=hoy.getDay(); // 0=domingo
  if(dia===0){ // domingo
    const payload={
      clientes:JSON.parse(localStorage.getItem('arslan_v9_clientes')||'[]'),
      productos:JSON.parse(localStorage.getItem('arslan_v9_productos')||'[]'),
      facturas:JSON.parse(localStorage.getItem('arslan_v9_facturas')||'[]'),
      fecha:hoy.toISOString()
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=`backup-semanal-${hoy.toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('💾 Copia de seguridad semanal descargada');
  }
}
backupSemanal();

/* 4️⃣  Sonido corto al guardar factura */
function sonidoGuardar(){
  const audio=new Audio("https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg");
  audio.volume=0.2; audio.play().catch(()=>{});
}
document.querySelector('#btnGuardar')?.addEventListener('click',()=>setTimeout(sonidoGuardar,800));

/* 5️⃣  Color dinámico de totales según estado */
function colorTotales(){
  const totalEl=document.querySelector('#total');
  if(!totalEl)return;
  const texto=totalEl.textContent.replace(',','.').replace('€','').trim();
  const val=parseFloat(texto)||0;
  totalEl.style.color = val>1000 ? '#dc2626' : (val>300?'#f59e0b':'#1f9d55');
}
setInterval(colorTotales,1500);

/* 6️⃣  Lector de voz (opcional) para notificaciones */
function hablar(msg){
  try{
    const s=new SpeechSynthesisUtterance(msg);
    s.lang='es-ES';
    s.rate=1.1;
    speechSynthesis.speak(s);
  }catch{}
}
document.querySelector('#btnGuardar')?.addEventListener('click',()=>setTimeout(()=>hablar('Factura guardada correctamente'),1200));

/* 7️⃣  Bloqueo de pantalla al estar inactivos más de 10 min */
let inactivo;
function resetInactividad(){
  clearTimeout(inactivo);
  inactivo=setTimeout(()=>{
    toast('🔒 Bloqueo por inactividad — toca para continuar');
    document.body.style.filter='blur(3px)';
    const cover=document.createElement('div');
    cover.id='lockCover';
    cover.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;color:#fff;font-family:Poppins;cursor:pointer;';
    cover.innerHTML='<div>🔓 Tocar para desbloquear</div>';
    cover.addEventListener('click',()=>{document.body.style.filter='none';cover.remove();});
    document.body.appendChild(cover);
  },600000); // 10 min
}
['click','mousemove','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,resetInactividad));
resetInactividad();

/* 8️⃣  Indicador de conexión (offline/online) */
const indicador=document.createElement('div');
indicador.id='net';
indicador.style.cssText='position:fixed;bottom:15px;left:15px;padding:5px 10px;font-size:12px;border-radius:6px;font-family:Poppins;z-index:9999;background:#2563eb;color:#fff;';
document.body.appendChild(indicador);
function actualizarNet(){indicador.textContent=navigator.onLine?'🟢 Online':'🔴 Sin conexión';indicador.style.background=navigator.onLine?'#1f9d55':'#dc2626';}
window.addEventListener('online',actualizarNet);
window.addEventListener('offline',actualizarNet);
actualizarNet();

/* 9️⃣  Pulsación larga sobre total = mostrar desglose rápido */
const totalBox=document.querySelector('#total');
if(totalBox){
  totalBox.addEventListener('mousedown',()=>{totalBox.style.transform='scale(1.1)';});
  totalBox.addEventListener('mouseup',()=>{
    totalBox.style.transform='scale(1)';
    const sub=document.querySelector('#subtotal')?.textContent||'';
    const iva=document.querySelector('#iva')?.textContent||'';
    const tra=document.querySelector('#transp')?.textContent||'';
    toast(`Subtotal ${sub} · Transp ${tra} · IVA ${iva}`);
  });
}

/* 🔟  Ocultar automáticamente notificaciones tras PDF */
window.addEventListener('beforeprint',()=>{document.querySelectorAll('#btnColor,#btnUp,#reloj,#net').forEach(el=>el&&(el.style.display='none'));});
window.addEventListener('afterprint',()=>{document.querySelectorAll('#btnColor,#btnUp,#reloj,#net').forEach(el=>el&&(el.style.display=''));});

/* ============================================================
Fin Add-ons Pack 2 🍃 Funciones inteligentes
============================================================ */
