/* =======================================================
   ARSLAN PRO V10 — app.js
   =======================================================
   - PDF A4 con logo
   - Historial de precios global (10 últimos)
   - Estados Pagado/Parcial/Pendiente
   - Buscadores, gráficos, backup/restore
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
const fmtDateDMY = d => `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
const unMoney = s => parseFloat(String(s).replace(/\./g,'').replace(',','.').replace(/[^\d.]/g,'')) || 0;

/* ---------- KEYS ---------- */
const K_CLIENTES='arslan_v10_clientes';
const K_PRODUCTOS='arslan_v10_productos';
const K_FACTURAS='arslan_v10_facturas';
const K_PRICEHIST='arslan_v10_pricehist';

/* ---------- ESTADO ---------- */
let clientes  = load(K_CLIENTES, []);
let productos = load(K_PRODUCTOS, []);
let facturas  = load(K_FACTURAS, []);
let priceHist = load(K_PRICEHIST, {});

function load(k, fallback){ try{ const v = JSON.parse(localStorage.getItem(k)||''); return v ?? fallback; } catch{ return fallback; } }
function save(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

/* ---------- SPLASH & TABS ---------- */
window.addEventListener('load', ()=>{
  setTimeout(()=>{ $('#splash')?.classList.add('fade'); document.querySelector('[data-tab="factura"]')?.click(); }, 1200);
});
function switchTab(id){
  $$('button.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  $$('section.panel').forEach(p=>p.classList.toggle('active', p.dataset.tabPanel===id));
  if(id==='resumen'){ drawResumen(); drawCharts(); }
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
function seedProductsIfEmpty(){ if(productos.length) return; productos = PRODUCT_NAMES.map(n=>({name:n})); save(K_PRODUCTOS, productos); }

/* ---------- HISTORIAL DE PRECIOS ---------- */
function lastPrice(name){ const arr = priceHist[name]; return arr?.length ? arr[0].price : null; }
function pushPriceHistory(name, price){
  if(!name || !(price>0)) return;
  const arr = priceHist[name] || [];
  arr.unshift({price, date: todayISO()});
  priceHist[name] = arr.slice(0,10);
  save(K_PRICEHIST, priceHist);
}
function showPricePanel(){ const pp=$('#pricePanel'); if(pp?.hasAttribute('hidden')) pp.removeAttribute('hidden'); }
function hidePricePanelSoon(){ const pp=$('#pricePanel'); if(!pp) return; clearTimeout(hidePricePanelSoon.t); hidePricePanelSoon.t=setTimeout(()=>pp.setAttribute('hidden',''),4500); }
function renderPriceHistory(name){
  const panelBody = $('#ppBody'); if(!panelBody) return;
  showPricePanel();
  const hist = priceHist[name] || [];
  if(hist.length===0){ panelBody.innerHTML = `<div class="pp-row"><span>${escapeHTML(name)}</span><strong>Sin datos</strong></div>`; hidePricePanelSoon(); return; }
  panelBody.innerHTML = `<div class="pp-row" style="justify-content:center"><strong>${escapeHTML(name)}</strong></div>` +
    hist.map(h=>`<div class="pp-row"><span>${fmtDateDMY(new Date(h.date))}</span><strong>${money(h.price)}</strong></div>`).join('');
  hidePricePanelSoon();
}

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
        <div class="muted">${escapeHTML(c.tel||'')} ${c.email?('· '+escapeHTML(c.email)) : ''}</div>
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
function renderProductos(){
  const cont = $('#listaProductos'); if(!cont) return;
  cont.innerHTML='';
  const q = ($('#buscarProducto')?.value||'').toLowerCase();
  const view = q ? productos.filter(p=>(p.name||'').toLowerCase().includes(q)) : productos;
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
        if(confirm('¿Eliminar producto?')){ productos.splice(i,1); saveProductos(); renderProductos(); }
      }else{
        const row=b.closest('.product-row');
        const get=f=>row.querySelector(`[data-f="${f}"]`).value.trim();
        const name=get('name'); const mode=(get('mode')||null);
        const boxKgStr=get('boxKg'); const boxKg=boxKgStr===''?null:parseNum(boxKgStr);
        const priceStr=get('price'); const price=priceStr===''?null:parseNum(priceStr);
        const origin=get('origin')||null;
        productos[i]={name,mode,boxKg,price,origin}; saveProductos(); renderProductos();
      }
    });
  });
}
$('#buscarProducto')?.addEventListener('input', renderProductos);

/* ---------- FACTURA: LÍNEAS ---------- */
function findProducto(name){ return productos.find(p=>(p.name||'').toLowerCase()===String(name).toLowerCase()); }
function lineaHTML(){
  const el=document.createElement('div'); el.className='linea';
  el.innerHTML=`
    <input class="name" placeholder="Producto" />
    <select class="mode"><option value="">—</option><option value="kg">kg</option><option value="unidad">unidad</option><option value="caja">caja</option></select>
    <input class="qty" type="number" step="1" placeholder="Cant." />
    <input class="gross" type="number" step="0.01" placeholder="Bruto kg" />
    <input class="tare" type="number" step="0.01" placeholder="Tara kg" />
    <input class="net" type="number" step="0.01" placeholder="Neto kg" disabled />
    <input class="price" type="number" step="0.01" placeholder="Precio" />
    <input class="origin" placeholder="Origen" />
    <input class="amount" placeholder="Importe" disabled />
    <button class="del">✕</button>
  `;
  const nameInp=el.querySelector('.name'), modeInp=el.querySelector('.mode'), qtyInp=el.querySelector('.qty');
  const grossInp=el.querySelector('.gross'), tareInp=el.querySelector('.tare'), netInp=el.querySelector('.net');
  const priceInp=el.querySelector('.price'), originInp=el.querySelector('.origin'), amountInp=el.querySelector('.amount');

  const showHist=()=>{ const n=nameInp.value.trim(); if(n) renderPriceHistory(n); };
  nameInp.addEventListener('focus', showHist);
  priceInp.addEventListener('focus', showHist);

  nameInp.addEventListener('change', ()=>{
    const p=findProducto(nameInp.value.trim());
    if(p){
      if(p.mode) modeInp.value=p.mode;
      if(p.price!=null) priceInp.value=p.price;
      if(p.origin) originInp.value=p.origin;
      const lp=lastPrice(p.name); if(lp!=null && !p.price) priceInp.value=lp;
      renderPriceHistory(p.name);
    }
    recalcLine();
  });

  [modeInp, qtyInp, grossInp, tareInp, priceInp].forEach(i=>i.addEventListener('input', recalcLine));
  el.querySelector('.del').addEventListener('click', ()=>{ el.remove(); recalc(); });

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
    amountInp.value = amount>0 ? amount.toFixed(2) : '';
    recalc();
  }

  return el;
}
function addLinea(){ $('#lineas')?.appendChild(lineaHTML()); }
function captureLineas(){
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

/* ---------- RECALC & PRINT ---------- */
function recalc(){
  const ls=captureLineas();
  let subtotal=0; ls.forEach(l=> subtotal+=lineImporte(l));
  const transporte = $('#chkTransporte')?.checked ? subtotal*0.10 : 0;
  const baseMasTrans = subtotal + transporte;
  const iva = baseMasTrans * 0.04; // informativo
  const total = baseMasTrans;
  const pagado = parseNum($('#pagado')?.value||0);
  const pendiente = Math.max(0, total - pagado);

  $('#subtotal').textContent = money(subtotal);
  $('#transp').textContent = money(transporte);
  $('#iva').textContent = money(iva);
  $('#total').textContent = money(total);
  $('#pendiente').textContent = money(pendiente);

  fillPrint(ls,{subtotal,transporte,iva,total});
  drawResumen();
}
;['chkTransporte','chkIvaIncluido','estado','pagado'].forEach(id=>$('#'+id)?.addEventListener('input', recalc));

function fillPrint(lines, totals, f=null){
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
  $('#p-estado').textContent = f?.estado || $('#estado')?.value || 'pendiente';
  $('#p-metodo').textContent = f?.metodo || $('#metodoPago')?.value || 'Efectivo';
  $('#p-obs').textContent = f?.obs || ($('#observaciones')?.value||'—');
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
  const pagado=parseNum($('#pagado').value||0);
  const pendiente=Math.max(0,total-pagado);

  const f={
    numero, fecha:now,
    proveedor:{nombre:$('#provNombre').value,nif:$('#provNif').value,dir:$('#provDir').value,tel:$('#provTel').value,email:$('#provEmail').value},
    cliente:{nombre:$('#cliNombre').value,nif:$('#cliNif').value,dir:$('#cliDir').value,tel:$('#cliTel').value,email:$('#cliEmail').value},
    lineas:ls, transporte:$('#chkTransporte').checked, ivaIncluido:$('#chkIvaIncluido').checked,
    estado:$('#estado').value, metodo:$('#metodoPago').value, obs:$('#observaciones').value,
    totals:{subtotal,transporte,iva,total,pagado,pendiente}
  };
  facturas.unshift(f); saveFacturas();
  alert(`Factura ${numero} guardada.`);
  renderFacturas(); drawResumen(); fillPrint(ls,{subtotal,transporte,iva,total},f);
});

$('#btnNueva')?.addEventListener('click', ()=>{
  const cont=$('#lineas'); cont.innerHTML=''; for(let i=0;i<5;i++) addLinea();
  $('#chkTransporte').checked=false; $('#chkIvaIncluido').checked=true; $('#estado').value='pendiente';
  $('#pagado').value=''; $('#metodoPago').value='Efectivo'; $('#observaciones').value='';
  recalc();
});

$('#btnImprimir')?.addEventListener('click', ()=>{
  // A4 vertical con márgenes suaves y logo incorporado (ya en el HTML)
  const element = document.getElementById('printArea');
  const d=new Date(); const file=`Factura-${($('#cliNombre').value||'Cliente').replace(/\s+/g,'')}-${fmtDateDMY(d)}.pdf`;
  const opt = {
    margin:       [10,10,10,10],
    filename:     file,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS:true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  window.html2pdf().set(opt).from(element).save();
});

/* ---------- LISTA DE FACTURAS ---------- */
function badgeEstado(f){
  if(f.estado==='pagado') return `<span class="badge ok">Pagada</span>`;
  if(f.estado==='parcial'){
    const resta=Math.max(0,(f.totals?.total||0)-(f.totals?.pagado||0));
    return `<span class="badge warn">Parcial · resta ${money(resta)}</span>`;
  }
  return `<span class="badge bad">Pendiente</span>`;
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
        <button data-e="cobrar" data-i="${idx}">💶 Cobrado</button>
        <button class="ghost" data-e="pdf" data-i="${idx}">PDF</button>
      </div>`;
    cont.appendChild(div);
  });

  cont.querySelectorAll('button').forEach(b=>{
    const i=+b.dataset.i;
    b.addEventListener('click', ()=>{
      const f=facturas[i]; if(!f) return;
      if(b.dataset.e==='ver'){
        fillPrint(f.lineas,f.totals,f); switchTab('factura'); document.getElementById('printArea')?.scrollIntoView({behavior:'smooth'});
      }else if(b.dataset.e==='cobrar'){
        const tot=f.totals.total||0;
        f.totals.pagado=tot; f.totals.pendiente=0; f.estado='pagado';
        saveFacturas(); renderFacturas(); drawResumen();
      }else if(b.dataset.e==='pdf'){
        fillPrint(f.lineas,f.totals,f);
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

/* ---------- RESUMEN Y GRÁFICOS ---------- */
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
  $('#rHoy').textContent=money(hoy);
  $('#rSemana').textContent=money(semana);
  $('#rMes').textContent=money(mes);
  $('#rTotal').textContent=money(total);
  $('#resGlobal').textContent=money(pendiente);

  // Deudas por cliente
  const map=new Map();
  facturas.forEach(f=>{
    const nom=f.cliente?.nombre||'(s/cliente)'; const pend=f.totals?.pendiente||0;
    map.set(nom,(map.get(nom)||0)+pend);
  });
  const cont=$('#resPorCliente'); cont.innerHTML='';
  if(map.size===0){ cont.innerHTML='<div class="item">No hay deudas registradas.</div>'; return; }
  [...map.entries()].sort((a,b)=>b[1]-a[1]).forEach(([nom,pend])=>{
    const div=document.createElement('div'); div.className='item';
    div.innerHTML=`<div><strong>${escapeHTML(nom)}</strong></div><div><strong>${money(pend)}</strong></div>`;
    cont.appendChild(div);
  });
}
let chart1, chart2;
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

/* ---------- BACKUP ---------- */
$('#btnBackup')?.addEventListener('click', ()=>{
  const payload={clientes, productos, facturas, priceHist, fecha: todayISO(), version:'ARSLAN PRO V10'};
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

/* ---------- EVENTOS GENERALES ---------- */
$('#btnAddLinea')?.addEventListener('click', addLinea);
$('#btnVaciarLineas')?.addEventListener('click', ()=>{ if(confirm('¿Vaciar líneas?')){ const c=$('#lineas'); c.innerHTML=''; for(let i=0;i<5;i++) addLinea(); recalc(); }});
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
$('#btnExportClientes')?.addEventListener('click', ()=>downloadJSON(clientes,'clientes-arslan-v10.json'));
$('#btnImportClientes')?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ clientes=uniqueByName(arr); saveClientes(); renderClientesSelect(); renderClientesLista(); } }));
$('#btnAddProducto')?.addEventListener('click', ()=>{
  const name=prompt('Nombre del producto:'); if(!name) return;
  productos.push({name}); saveProductos(); renderProductos();
});
$('#btnExportProductos')?.addEventListener('click', ()=>downloadJSON(productos,'productos-arslan-v10.json'));
$('#btnImportProductos')?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ productos=arr; saveProductos(); renderProductos(); } }));
$('#btnExportFacturas')?.addEventListener('click', ()=>downloadJSON(facturas,'facturas-arslan-v10.json'));
$('#btnImportFacturas')?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ facturas=arr; saveFacturas(); renderFacturas(); drawResumen(); } }));
$('#buscarCliente')?.addEventListener('input', renderClientesLista);

/* ---------- UTILES ---------- */
function downloadJSON(obj, filename){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function uploadJSON(cb){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ cb(JSON.parse(r.result)); }catch{ alert('JSON inválido'); } }; r.readAsText(f); };
  inp.click();
}

/* ---------- RENDER ALL ---------- */
function renderAll(){
  renderClientesSelect(); renderClientesLista();
  renderProductos(); renderFacturas(); drawResumen();
}

/* ---------- BOOT ---------- */
(function boot(){
  seedClientesIfEmpty();
  seedProductsIfEmpty();
  if($$('.linea').length===0){ for(let i=0;i<5;i++) addLinea(); }
  renderAll(); recalc();

  // seguridad extra: re-render tras carga
  window.addEventListener('load', ()=>setTimeout(()=>{ renderAll(); recalc(); }, 600));
})();
})();
