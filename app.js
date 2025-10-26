/* =========================================================
   ARSLAN PRO V10 FINAL — GESTIÓN DE FACTURAS SIN SPLASH
   ---------------------------------------------------------
   - Módulos: Factura | Clientes | Facturas | Productos | Resumen
   - Funciones: IVA 4%, transporte 10%, tara, peso neto
   - Historial global de precios
   - PDF con nombre + fecha + estado de pago
   - Gráficos diarios/mensuales (Chart.js)
   - Backup / restaurar JSON
   - Tema oscuro, diseño blanco/verde/negro
========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- UTILIDADES ---------- */
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const money = n => (isNaN(n)?0:n).toFixed(2).replace('.', ',') + " €";
  const parseNum = v => { const n=parseFloat(String(v).replace(',', '.')); return isNaN(n)?0:n; };
  const todayISO = () => new Date().toISOString();
  const fmtDate = d => {
    const day=String(d.getDate()).padStart(2,'0');
    const mon=String(d.getMonth()+1).padStart(2,'0');
    const y=d.getFullYear();
    return `${day}-${mon}-${y}`;
  };
  const escapeHTML = s => String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  /* ---------- CLAVES ---------- */
  const K_CLIENTES='arslan_v10_clientes';
  const K_PRODUCTOS='arslan_v10_productos';
  const K_FACTURAS='arslan_v10_facturas';
  const K_PRECIOS='arslan_v10_pricehist';

  /* ---------- DATOS ---------- */
  let clientes = JSON.parse(localStorage.getItem(K_CLIENTES)||'[]');
  let productos = JSON.parse(localStorage.getItem(K_PRODUCTOS)||'[]');
  let facturas  = JSON.parse(localStorage.getItem(K_FACTURAS)||'[]');
  let priceHist = JSON.parse(localStorage.getItem(K_PRECIOS)||'{}');

  /* ---------- NAVEGACIÓN ---------- */
  function switchTab(id){
    $$('button.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
    $$('section.panel').forEach(p=>p.classList.toggle('active',p.dataset.tabPanel===id));
    if(id==='resumen'){ drawResumen(); drawCharts(); }
  }
  $$('button.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
  switchTab('factura');

  /* ---------- TEMA OSCURO ---------- */
  const themeToggle=$('#themeToggle');
  if(localStorage.theme==='dark'){document.documentElement.classList.add('dark');themeToggle.checked=true;}
  themeToggle.addEventListener('change',()=>{
    document.documentElement.classList.toggle('dark');
    localStorage.theme=document.documentElement.classList.contains('dark')?'dark':'light';
  });

  /* ---------- SEMILLAS DE CLIENTES ---------- */
  function seedClientes(){
    if(clientes.length>0)return;
    clientes=[
      {nombre:'Riviera — CONOR ESY SLU',nif:'B16794893',dir:'Paseo del Espolón 09003 Burgos'},
      {nombre:'Alesal Pan / Café de San Lesmes',nif:'B09582420',dir:'C/ San Lesmes 1 Burgos'},
      {nombre:'Al Pan Pan Burgos S.L.',nif:'B09569344',dir:'C/ Miranda 17 Bajo 09002 Burgos'},
      {nombre:'Cuevas Palacios Restauración S.L. (Con/sentidos)',nif:'B10694792',dir:'C/ San Lesmes 1 09004 Burgos'},
      {nombre:'Café Bar Nuovo (Einy Mercedes Olivo Jiménez)',nif:'120221393',dir:'C/ San Juan de Ortega 14 09007 Burgos'},
      {nombre:'Hotel Cordon'},{nombre:'Vaivén Hostelería'},{nombre:'Grupo Resicare'},
      {nombre:'Carlos Alameda Peralta & Seis Más'},{nombre:'Tabalou Development SLU',nif:'ES B09567769'},
      {nombre:'Golden Garden — David Herrera Estalayo',nif:'71281665L',dir:'Trinidad 12 09003 Burgos'},
      {nombre:'Romina — Premier',dir:'C/ Madrid 42 Burgos'},
      {nombre:'Abbas — Locutorio Gamonal',dir:'C/ Derechos Humanos 45 Burgos'},
      {nombre:'Nadeem Bhai — RIA Locutorio',dir:'C/ Vitoria 137 Burgos'},
      {nombre:'Mehmood — Mohsin Telecom',dir:'C/ Vitoria 245 Burgos'},
      {nombre:'Adnan Asif',nif:'X7128589S',dir:'C/ Padre Flórez 3 Burgos'},
      {nombre:'Imran Khan — Estambul',dir:'Avda. Cid Burgos'},
      {nombre:'Waqas Sohail',dir:'C/ Vitoria Burgos'},
      {nombre:'Malik — Locutorio Malik',dir:'C/ Progreso Burgos'},
      {nombre:'Angela',dir:'C/ Madrid Burgos'},
      {nombre:'Aslam — Locutorio Aslam',dir:'Avda. Cid Burgos'},
      {nombre:'Victor Pelu — Tienda Centro',dir:'Centro Burgos'},
      {nombre:'Domingo'},{nombre:'Bar Tropical'},{nombre:'Bar Punta Cana',dir:'C/ Los Titos Burgos'},
      {nombre:'Jose — Alimentación Patxi',dir:'C/ Casa la Vega 33 Burgos'},
      {nombre:'Ideal — Supermercado',dir:'Avda. Cid Burgos'}
    ];
    saveClientes();
  }
  function saveClientes(){localStorage.setItem(K_CLIENTES,JSON.stringify(clientes));}

  /* ---------- SEMILLAS DE PRODUCTOS ---------- */
  const PRODUCT_NAMES=[ // solo muestro las primeras, se completa en parte 2
    "GRANNY FRANCIA","MANZANA PINK LADY","MANDARINA COLOMBE","KIWI ZESPRI GOLD",
    "PARAGUAYO","KIWI TOMASIN PLANCHA","PERA RINCÓN DEL SOTO","MELOCOTÓN PRIMERA",
    "AGUACATE GRANEL","MARACUYÁ","MANZANA GOLDEN 24","PLÁTANO CANARIO PRIMERA"
  ];
  function seedProductos(){
    if(productos.length>0)return;
    productos=PRODUCT_NAMES.map(n=>({name:n}));
    saveProductos();
  }
  function saveProductos(){localStorage.setItem(K_PRODUCTOS,JSON.stringify(productos));}

  /* ---------- HISTORIAL DE PRECIOS ---------- */
  function pushPrice(name,price){
    if(!name||!(price>0))return;
    const arr=priceHist[name]||[];
    arr.unshift({price,date:todayISO()});
    priceHist[name]=arr.slice(0,10);
    localStorage.setItem(K_PRECIOS,JSON.stringify(priceHist));
  }
  /* ---------- COMPLETAR LISTA DE PRODUCTOS (más de 200) ---------- */
  const EXTRA_PRODUCTS = [
"MANDARINA HOJA","MANZANA GOLDEN 20","NARANJA TOMASIN","NECTARINA","NUECES","SANDÍA","LIMÓN SEGUNDA","MANZANA FUJI",
"NARANJA MESA SONRISA","JENGIBRE","BATATA","AJO PRIMERA","CEBOLLA NORMAL","CALABAZA GRANDE","PATATA LAVADA",
"TOMATE CHERRY RAMA","TOMATE CHERRY PERA","TOMATE DANIELA","TOMATE ROSA PRIMERA","CEBOLLINO","TOMATE ASURCADO MARRÓN",
"TOMATE RAMA","PIMIENTO PADRÓN","ZANAHORIA","PEPINO","CEBOLLETA","PUERROS","BRÓCOLI","JUDÍA VERDE","BERENJENA",
"PIMIENTO ITALIANO VERDE","PIMIENTO ITALIANO ROJO","CHAMPIÑÓN","UVA ROJA","UVA BLANCA","ALCACHOFA","CALABACÍN","COLIFLOR",
"BATAVIA","ICEBERG","MANDARINA SEGUNDA","MANZANA GOLDEN 28","NARANJA ZUMO","KIWI SEGUNDA","MANZANA ROYAL GALA 24",
"PLÁTANO CANARIO SUELTO","CEREZA","FRESAS","ARÁNDANOS","ESPINACA","PEREJIL","CILANTRO","ACELGAS","PIMIENTO VERDE",
"PIMIENTO ROJO","MACHO VERDE","MACHO MADURO","YUCA","AVOCADO","CEBOLLA ROJA","MENTA","HABANERO","RABANITOS","POMELO",
"PAPAYA","REINETA 28","NÍSPERO","ALBARICOQUE","TOMATE PERA","TOMATE BOLA","TOMATE PINK","VALVENOSTA GOLDEN","MELOCOTÓN ROJO",
"MELÓN GALIA","APIO","NARANJA SANHUJA","LIMÓN PRIMERA","MANGO","MELOCOTÓN AMARILLO","VALVENOSTA ROJA","PIÑA","NARANJA HOJA",
"PERA CONFERENCIA SEGUNDA","CEBOLLA DULCE","TOMATE ASURCADO AZUL","ESPÁRRAGOS BLANCOS","ESPÁRRAGOS TRIGUEROS",
"REINETA PRIMERA","AGUACATE PRIMERA","COCO","NECTARINA SEGUNDA","REINETA 24","NECTARINA CARNE BLANCA","GUINDILLA",
"REINETA VERDE","PATATA 25KG","PATATA 5 KG","TOMATE RAFF","REPOLLO","KIWI ZESPRI","PARAGUAYO SEGUNDA","MELÓN","REINETA 26",
"TOMATE ROSA","MANZANA CRIPS","ALOE VERA PIEZAS","TOMATE ENSALADA","PATATA 10KG","MELÓN BOLLO","CIRUELA ROJA","LIMA",
"GUINEO VERDE","SETAS","BANANA","BONIATO","FRAMBUESA","BREVAS","PERA AGUA","YAUTÍA","YAME","OKRA","MANZANA MELASSI",
"CACAHUETE","SANDÍA NEGRA","SANDÍA RAYADA","HIGOS","KUMATO","KIWI CHILE","MELOCOTÓN AMARILLO SEGUNDA","HIERBABUENA",
"REMOLACHA","LECHUGA ROMANA","KAKI","CIRUELA CLAUDIA","PERA LIMONERA","CIRUELA AMARILLA","HIGOS BLANCOS","UVA ALVILLO",
"LIMÓN EXTRA","PITAHAYA ROJA","HIGO CHUMBO","CLEMENTINA","GRANADA","NECTARINA PRIMERA BIS","CHIRIMOYA","UVA CHELVA",
"PIMIENTO CALIFORNIA VERDE","KIWI TOMASIN","PIMIENTO CALIFORNIA ROJO","MANDARINA SATSUMA","CASTAÑA","CAKI","MANZANA KANZI",
"PERA ERCOLINA","NABO","UVA ALVILLO NEGRA","CHAYOTE","ROYAL GALA 28","MANDARINA PRIMERA","PIMIENTO PINTÓN",
"MELOCOTÓN AMARILLO DE CALANDA","HINOJOS","MANDARINA DE HOJA","UVA ROJA PRIMERA","UVA BLANCA PRIMERA"
  ];
  // unir sin duplicados
  PRODUCT_NAMES.push(...EXTRA_PRODUCTS.filter(n => !PRODUCT_NAMES.some(x => x.toLowerCase()===n.toLowerCase())));

  /* ---------- RENDER CLIENTES ---------- */
  const selCliente = $('#selCliente');
  const clientesApp = $('#clientesApp');

  function renderClientesSelect(){
    if(!selCliente) return;
    selCliente.innerHTML = `<option value="">— Seleccionar cliente —</option>`;
    [...clientes].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'')).forEach((c,i)=>{
      const opt=document.createElement('option'); opt.value=i; opt.textContent=c.nombre||`Cliente ${i+1}`; selCliente.appendChild(opt);
    });
  }

  function renderClientes(){
    if(!clientesApp) return;
    clientesApp.innerHTML = `
      <div class="row" style="margin-bottom:10px">
        <input id="buscarCliente" placeholder="🔍 Buscar cliente..." style="flex:1">
        <button id="btnAddCliente" class="btn green">➕ Añadir</button>
        <button id="btnExportClientes" class="btn ghost">⬇️ Exportar</button>
        <button id="btnImportClientes" class="btn ghost">⬆️ Importar</button>
      </div>
      <div id="listaClientes" class="list"></div>
    `;
    const input = $('#buscarCliente');
    const list  = $('#listaClientes');
    const btnAdd = $('#btnAddCliente');
    const btnEx  = $('#btnExportClientes');
    const btnIm  = $('#btnImportClientes');

    function draw(){
      const q=(input.value||'').toLowerCase();
      const view = q ? clientes.filter(c=>(c.nombre||'').toLowerCase().includes(q) || (c.nif||'').toLowerCase().includes(q)) : clientes;
      list.innerHTML='';
      if(view.length===0){ list.innerHTML='<div class="item">Sin clientes.</div>'; return; }
      view.forEach((c,idx)=>{
        const div=document.createElement('div'); div.className='item';
        div.innerHTML=`
          <div>
            <strong>${escapeHTML(c.nombre||'(Sin nombre)')}</strong>
            <div class="meta">${escapeHTML(c.nif||'')} · ${escapeHTML(c.dir||'')}</div>
          </div>
          <div class="row">
            <button class="btn small" data-e="usar" data-i="${idx}">Usar</button>
            <button class="btn small" data-e="edit" data-i="${idx}">Editar</button>
            <button class="btn small ghost" data-e="del" data-i="${idx}">Borrar</button>
          </div>`;
        list.appendChild(div);
      });
      list.querySelectorAll('button').forEach(b=>{
        const i=+b.dataset.i;
        b.addEventListener('click', ()=>{
          if(b.dataset.e==='del'){
            if(confirm('¿Eliminar cliente?')){ clientes.splice(i,1); saveClientes(); renderClientesSelect(); draw(); }
          }else if(b.dataset.e==='usar'){
            const c=clientes[i];
            $('#cliNombre').value=c.nombre||''; $('#cliNif').value=c.nif||''; $('#cliDir').value=c.dir||''; $('#cliTel').value=c.tel||''; $('#cliEmail').value=c.email||'';
            switchTab('factura');
          }else{
            const c=clientes[i];
            const nombre = prompt('Nombre', c.nombre||'') ?? c.nombre;
            const nif    = prompt('NIF/CIF', c.nif||'') ?? c.nif;
            const dir    = prompt('Dirección', c.dir||'') ?? c.dir;
            const tel    = prompt('Teléfono', c.tel||'') ?? c.tel;
            const email  = prompt('Email', c.email||'') ?? c.email;
            clientes[i]={nombre,nif,dir,tel,email}; saveClientes(); renderClientesSelect(); draw();
          }
        });
      });
    }

    input.addEventListener('input', draw);
    btnAdd.addEventListener('click', ()=>{
      const nombre=prompt('Nombre del cliente:'); if(!nombre) return;
      const nif=prompt('NIF/CIF:')||''; const dir=prompt('Dirección:')||''; const tel=prompt('Teléfono:')||''; const email=prompt('Email:')||'';
      clientes.push({nombre,nif,dir,tel,email}); saveClientes(); renderClientesSelect(); draw();
    });
    btnEx.addEventListener('click', ()=>downloadJSON(clientes,'clientes-arslan-v10.json'));
    btnIm.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ clientes=arr; saveClientes(); renderClientesSelect(); draw(); } }));

    draw();
  }

  /* ---------- RENDER PRODUCTOS (3 columnas + búsqueda + edición) ---------- */
  const productosApp = $('#productosApp');

  function renderProductos(){
    if(!productosApp) return;
    productosApp.innerHTML = `
      <div class="row" style="margin-bottom:10px">
        <input id="buscarProducto" placeholder="🔍 Buscar producto..." style="flex:1">
        <button id="btnNuevoProd" class="btn green" title="Shift+Clic para varios">➕ Añadir</button>
        <button id="btnExportProductos" class="btn ghost">⬇️ Exportar</button>
        <button id="btnImportProductos" class="btn ghost">⬆️ Importar</button>
      </div>
    `;

    const buscar=$('#buscarProducto');
    const btnNuevo=$('#btnNuevoProd');
    const btnEx=$('#btnExportProductos'); const btnIm=$('#btnImportProductos');

    const grid=document.createElement('div'); grid.className='grid-productos'; productosApp.appendChild(grid);

    function draw(list){
      grid.innerHTML='';
      if(list.length===0){ grid.innerHTML='<div class="item" style="grid-column:1 / span 3;text-align:center;color:#777;">Sin resultados.</div>'; return; }
      list.forEach((p,idx)=>{
        const card=document.createElement('div'); card.className='prod-card';
        card.innerHTML=`
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
          </div>`;
        grid.appendChild(card);
      });
      grid.querySelectorAll('button').forEach(b=>{
        const i=+b.dataset.i;
        b.addEventListener('click', ()=>{
          if(b.dataset.e==='del'){
            if(confirm('¿Eliminar producto?')){ productos.splice(i,1); saveProductos(); filtrar(); }
          }else{
            const card=b.closest('.prod-card');
            const get=f=>card.querySelector(`[data-f="${f}"]`).value.trim();
            const mode=(get('mode')||null);
            const boxKgStr=get('boxKg'); const boxKg = boxKgStr===''?null:parseNum(boxKgStr);
            const priceStr=get('price'); const price = priceStr===''?null:parseNum(priceStr);
            const origin=get('origin')||null;
            productos[i]={...productos[i], mode, boxKg, price, origin}; saveProductos();
          }
        });
      });
    }

    function filtrar(){
      const q=(buscar.value||'').toLowerCase();
      const list = q ? productos.filter(p=>(p.name||'').toLowerCase().includes(q)) : productos;
      draw(list);
    }

    btnNuevo.addEventListener('click', (e)=>{
      if(e.shiftKey){
        const texto = prompt('Pega nombres (uno por línea):'); if(!texto) return;
        const nuevos = texto.split(/\n+/).map(t=>t.trim()).filter(Boolean)
          .filter(n=>!productos.some(p=>(p.name||'').toLowerCase()===n.toLowerCase()));
        nuevos.forEach(n=>productos.push({name:n}));
        saveProductos(); filtrar(); alert(`${nuevos.length} productos añadidos.`);
      }else{
        const nombre=prompt('Nombre del producto:'); if(!nombre) return;
        productos.push({name:nombre}); saveProductos(); filtrar();
      }
    });
    btnEx.addEventListener('click', ()=>downloadJSON(productos,'productos-arslan-v10.json'));
    btnIm.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ productos=arr; saveProductos(); filtrar(); } }));

    buscar.addEventListener('input', filtrar);
    filtrar();
  }

  /* ---------- INICIALIZACIÓN DE SEEDS Y RENDERS ---------- */
  function downloadJSON(obj, filename){
    const blob = new Blob([JSON.stringify(obj,null,2)], {type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function uploadJSON(cb){
    const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
    inp.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ cb(JSON.parse(r.result)); }catch{ alert('JSON inválido'); } }; r.readAsText(f); };
    inp.click();
  }

  // Semillas si están vacíos
  seedClientes();
  seedProductos();

  // Renders iniciales (Clientes/Productos; Factura/Facturas/Resumen se añaden en Parte 3)
  renderClientesSelect();
  renderClientes();
  renderProductos();
  /* ---------- FACTURA PRINCIPAL ---------- */
  const facturaApp = $('#facturaApp');

  facturaApp.innerHTML = `
    <div class="row">
      <div class="col">
        <h3>Cliente</h3>
        <input id="cliNombre" placeholder="Nombre del cliente">
        <input id="cliNif" placeholder="NIF / CIF">
        <input id="cliDir" placeholder="Dirección">
        <input id="cliTel" placeholder="Teléfono">
        <input id="cliEmail" placeholder="Email">
      </div>
      <div class="col">
        <h3>Proveedor</h3>
        <input id="provNombre" value="Mohammad Arslan Waris">
        <input id="provNif" value="X6389988J">
        <input id="provDir" value="Calle San Pablo 17, Burgos">
        <input id="provTel" value="631667893">
        <input id="provEmail" value="shaniwaris80@gmail.com">
      </div>
    </div>

    <div id="lineas"></div>
    <div style="margin:8px 0;">
      <button id="btnAddLinea" class="btn green">➕ Añadir línea</button>
      <button id="btnVaciarLineas" class="btn ghost">🗑️ Vaciar</button>
    </div>

    <div id="totales">
      <label><input type="checkbox" id="chkTransporte"> Transporte 10%</label>
      <label><input type="checkbox" id="chkIvaIncluido" checked> IVA 4%</label>
      <div>Subtotal: <span id="subtotal">0,00 €</span></div>
      <div>Transporte: <span id="transp">0,00 €</span></div>
      <div>IVA (4%): <span id="iva">0,00 €</span></div>
      <div><strong>Total: <span id="total">0,00 €</span></strong></div>
    </div>

    <div class="row" style="margin-top:10px;">
      <select id="estado">
        <option value="pendiente">Pendiente</option>
        <option value="parcial">Parcial</option>
        <option value="pagado">Pagada</option>
      </select>
      <input id="pagado" type="number" min="0" step="0.01" placeholder="Pagado €">
      <select id="metodoPago">
        <option>Efectivo</option>
        <option>Tarjeta</option>
        <option>Transferencia</option>
      </select>
    </div>

    <textarea id="observaciones" placeholder="Observaciones..." rows="2"></textarea>

    <div class="row" style="margin-top:10px;">
      <button id="btnGuardar" class="btn green">💾 Guardar factura</button>
      <button id="btnNueva" class="btn ghost">🆕 Nueva</button>
      <button id="btnImprimir" class="btn ghost">🖨️ PDF</button>
    </div>

    <h3 style="margin-top:20px;">Vista previa / PDF</h3>
    <div id="printArea" style="border:1px solid var(--border);padding:10px;border-radius:8px;background:#fff;color:#000;">
      <h2 style="text-align:center;">FACTURA</h2>
      <div style="display:flex;justify-content:space-between;font-size:14px;">
        <div><strong>Nº:</strong> <span id="p-num"></span><br><strong>Fecha:</strong> <span id="p-fecha"></span></div>
        <div style="text-align:right;">
          <strong>Proveedor:</strong><br><span id="p-prov"></span>
        </div>
      </div><hr>
      <div style="font-size:14px;"><strong>Cliente:</strong><br><span id="p-cli"></span></div><hr>
      <table style="width:100%;border-collapse:collapse;font-size:13px;" id="p-tabla">
        <thead><tr style="background:#eee;">
          <th>Producto</th><th>Modo</th><th>Cant.</th><th>Neto</th><th>Precio</th><th>Origen</th><th>Importe</th>
        </tr></thead><tbody></tbody>
      </table><hr>
      <div style="text-align:right;font-size:14px;">
        Subtotal: <span id="p-sub"></span><br>
        Transporte: <span id="p-tra"></span><br>
        IVA (4%): <span id="p-iva"></span><br>
        <strong>Total: <span id="p-tot"></span></strong><br>
        Estado: <span id="p-estado"></span><br>
        Pago: <span id="p-metodo"></span><br>
        Obs: <span id="p-obs"></span>
      </div>
    </div>
  `;

  const lineasDiv = $('#lineas');
  const btnAddLinea = $('#btnAddLinea');
  const btnVaciarLineas = $('#btnVaciarLineas');
  const subtotalEl=$('#subtotal'),transpEl=$('#transp'),ivaEl=$('#iva'),totalEl=$('#total');
  const btnGuardar=$('#btnGuardar'),btnNueva=$('#btnNueva'),btnImprimir=$('#btnImprimir');

  /* ---------- LÍNEAS DE FACTURA ---------- */
  function lineaHTML(){
    const wrap=document.createElement('div');
    wrap.className='linea';
    wrap.innerHTML=`
      <div class="suggest-box">
        <input class="name" placeholder="Producto">
      </div>
      <select class="mode"><option value="">—</option><option value="kg">kg</option><option value="unidad">unidad</option><option value="caja">caja</option></select>
      <input class="qty" type="number" min="0" step="1" placeholder="Cant.">
      <input class="gross" type="number" step="0.01" placeholder="Bruto kg">
      <input class="tare" type="number" step="0.01" placeholder="Tara kg">
      <input class="net" type="number" step="0.01" placeholder="Neto" disabled>
      <input class="price" type="number" step="0.01" placeholder="Precio €">
      <input class="origin" placeholder="Origen">
      <input class="amount" disabled placeholder="Importe €">
      <button class="del">✕</button>
    `;
    const name=wrap.querySelector('.name'),mode=wrap.querySelector('.mode'),qty=wrap.querySelector('.qty'),
      gross=wrap.querySelector('.gross'),tare=wrap.querySelector('.tare'),net=wrap.querySelector('.net'),
      price=wrap.querySelector('.price'),origin=wrap.querySelector('.origin'),amount=wrap.querySelector('.amount');
    const del=wrap.querySelector('.del');

    // autocompletar productos
    name.addEventListener('input',()=>{
      const q=name.value.toLowerCase();
      const match=productos.find(p=>(p.name||'').toLowerCase()===q);
      if(match){
        if(match.mode)mode.value=match.mode;
        if(match.price)price.value=match.price;
        if(match.origin)origin.value=match.origin;
      }
    });

    [mode,qty,gross,tare,price].forEach(i=>i.addEventListener('input',recalcLine));
    del.addEventListener('click',()=>{wrap.remove();recalc();});

    function recalcLine(){
      const m=mode.value, q=parseNum(qty.value), g=parseNum(gross.value), t=parseNum(tare.value), p=parseNum(price.value);
      let n=0; if(g>0)n=g-t; else if(m==='caja'){ const pr=productos.find(x=>x.name===name.value); n=pr?.boxKg?q*(pr.boxKg||0):0; } else n=q;
      net.value=n>0?n.toFixed(2):'';
      const imp=(m==='unidad'?q:p*n); amount.value=imp>0?imp.toFixed(2):'';
      recalc();
    }
    return wrap;
  }

  function addLinea(){ lineasDiv.appendChild(lineaHTML()); }
  btnAddLinea.addEventListener('click',addLinea);
  btnVaciarLineas.addEventListener('click',()=>{ if(confirm('Vaciar líneas?')){lineasDiv.innerHTML='';for(let i=0;i<5;i++)addLinea();recalc();}});

  function getLineas(){
    return $$('.linea').map(l=>{
      return {
        name:l.querySelector('.name').value.trim(),
        mode:l.querySelector('.mode').value.trim(),
        qty:parseNum(l.querySelector('.qty').value),
        gross:parseNum(l.querySelector('.gross').value),
        tare:parseNum(l.querySelector('.tare').value),
        net:parseNum(l.querySelector('.net').value),
        price:parseNum(l.querySelector('.price').value),
        origin:l.querySelector('.origin').value.trim()
      };
    }).filter(x=>x.name);
  }

  /* ---------- CÁLCULOS ---------- */
  function recalc(){
    const ls=getLineas();
    let subtotal=0;
    ls.forEach(l=>{
      const imp=(l.mode==='unidad'?l.qty*l.price:l.net*l.price);
      subtotal+=imp;
    });
    const transporte=$('#chkTransporte').checked?subtotal*0.1:0;
    const iva=subtotal*0.04;
    const total=subtotal+transporte;
    subtotalEl.textContent=money(subtotal); transpEl.textContent=money(transporte); ivaEl.textContent=money(iva); totalEl.textContent=money(total);
  }

  /* ---------- GUARDAR ---------- */
  function genNum(){ const d=new Date(); return `FA-${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}-${d.getHours()}${d.getMinutes()}${d.getSeconds()}`; }

  btnGuardar.addEventListener('click',()=>{
    const lines=getLineas(); if(!lines.length){alert('Agrega productos');return;}
    const subtotal=parseNum(subtotalEl.textContent),trans=parseNum(transpEl.textContent),iva=parseNum(ivaEl.textContent),total=parseNum(totalEl.textContent);
    const pagado=parseNum($('#pagado').value); const pendiente=Math.max(0,total-pagado);
    const factura={
      num:genNum(),
      fecha:todayISO(),
      cliente:{nombre:$('#cliNombre').value,nif:$('#cliNif').value,dir:$('#cliDir').value,tel:$('#cliTel').value,email:$('#cliEmail').value},
      proveedor:{nombre:$('#provNombre').value,nif:$('#provNif').value,dir:$('#provDir').value,tel:$('#provTel').value,email:$('#provEmail').value},
      lines, totals:{subtotal,transporte:trans,iva,total,pagado,pendiente},
      estado:$('#estado').value,metodo:$('#metodoPago').value,obs:$('#observaciones').value
    };
    lines.forEach(l=>pushPrice(l.name,l.price));
    facturas.unshift(factura);
    localStorage.setItem(K_FACTURAS,JSON.stringify(facturas));
    alert(`Factura ${factura.num} guardada`);
    renderFacturas();
  });

  btnNueva.addEventListener('click',()=>{
    lineasDiv.innerHTML='';for(let i=0;i<5;i++)addLinea();
    $('#cliNombre').value='';$('#cliNif').value='';$('#cliDir').value='';$('#cliTel').value='';$('#cliEmail').value='';
    $('#observaciones').value='';$('#pagado').value='';
    recalc();
  });

  btnImprimir.addEventListener('click',()=>window.print());
  /* ---------- LISTA DE FACTURAS (con filtros y acciones) ---------- */
  const facturasApp = $('#facturasApp');

  function renderFacturas(){
    if(!facturasApp) return;

    // Controles + contenedor
    facturasApp.innerHTML = `
      <div class="row" style="margin-bottom:10px;flex-wrap:wrap;gap:8px;">
        <input id="filtraCliente" placeholder="🔍 Cliente..." style="min-width:220px;">
        <select id="filtraEstado">
          <option value="todas">Todas</option>
          <option value="pendiente">Pendiente</option>
          <option value="parcial">Parcial</option>
          <option value="pagado">Pagado</option>
        </select>
        <input type="date" id="fechaDesde">
        <input type="date" id="fechaHasta">
        <button id="btnExportFacturas" class="btn ghost">⬇️ Exportar</button>
        <button id="btnImportFacturas" class="btn ghost">⬆️ Importar</button>
      </div>
      <div id="listaFacturas" class="list"></div>
      <div id="facturasTotales" class="list-total"></div>
    `;

    const busca=$('#filtraCliente'), estadoSel=$('#filtraEstado');
    const d1=$('#fechaDesde'), d2=$('#fechaHasta');
    const list=$('#listaFacturas'); const totalBox=$('#facturasTotales');
    const btnEx=$('#btnExportFacturas'), btnIm=$('#btnImportFacturas');

    function fechaDentro(f, from, to){
      const d=new Date(f.fecha);
      if(from && d < new Date(from)) return false;
      if(to && d > new Date(to+'T23:59:59')) return false;
      return true;
    }

    function draw(){
      list.innerHTML='';
      const q=(busca.value||'').toLowerCase();
      const fe=(estadoSel.value||'todas');
      const from=d1.value||null, to=d2.value||null;

      let arr=facturas.slice();
      if(fe!=='todas') arr=arr.filter(f=> (f.estado||'pendiente')===fe);
      if(q) arr=arr.filter(f=> (f.cliente?.nombre||'').toLowerCase().includes(q));
      if(from||to) arr=arr.filter(f=>fechaDentro(f,from,to));

      if(arr.length===0){ list.innerHTML='<div class="item">No hay facturas.</div>'; totalBox.innerHTML=''; return; }

      let sumTotal=0, sumPend=0;
      arr.forEach((f,idx)=>{
        sumTotal += (f.totals?.total||0);
        sumPend  += (f.totals?.pendiente||0);

        const badge = f.estado==='pagado'
          ? '<span class="badge ok">Pagada</span>'
          : f.estado==='parcial'
            ? `<span class="badge warn">Parcial · resta ${(f.totals?.pendiente||0).toFixed(2)} €</span>`
            : '<span class="badge bad">Pendiente</span>';

        const div=document.createElement('div'); div.className='item';
        div.innerHTML=`
          <div>
            <strong>${escapeHTML(f.num||'(sin nº)')}</strong> ${badge}
            <div class="meta">${new Date(f.fecha).toLocaleString()} · ${escapeHTML(f.cliente?.nombre||'')}</div>
          </div>
          <div class="row">
            <strong>${money(f.totals?.total||0)}</strong>
            <button class="btn small" data-e="ver" data-i="${idx}">Ver</button>
            <button class="btn small" data-e="pdf" data-i="${idx}">PDF</button>
            <button class="btn small" data-e="cobrar" data-i="${idx}">💶 Cobrar</button>
            <button class="btn small ghost" data-e="dup" data-i="${idx}">📋 Duplicar</button>
          </div>
        `;
        list.appendChild(div);
      });

      totalBox.innerHTML = `
        <div><strong>Total facturado:</strong> ${money(sumTotal)}</div>
        <div><strong>Total pendiente:</strong> ${money(sumPend)}</div>
      `;

      // Acciones
      list.querySelectorAll('button').forEach(b=>{
        const i=+b.dataset.i; const f=facturas[i];
        b.addEventListener('click', ()=>{
          if(b.dataset.e==='ver'){
            // Llenar vista previa
            fillPrint(f);
            switchTab('factura');
            document.getElementById('printArea')?.scrollIntoView({behavior:'smooth'});
            return;
          }
          if(b.dataset.e==='pdf'){
            fillPrint(f);
            const dt=new Date(f.fecha);
            const nombreCliente=(f.cliente?.nombre||'Cliente').replace(/\s+/g,'');
            const filename=`Factura-${nombreCliente}-${fmtDate(dt)}.pdf`;
            const opt={ margin:10, filename, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} };
            html2pdf().set(opt).from(document.getElementById('printArea')).save();
            return;
          }
          if(b.dataset.e==='cobrar'){
            const tot=f.totals?.total||0;
            f.totals.pagado=tot; f.totals.pendiente=0; f.estado='pagado';
            localStorage.setItem(K_FACTURAS,JSON.stringify(facturas));
            draw(); drawResumen();
            return;
          }
          if(b.dataset.e==='dup'){
            // Cargar datos de factura en el editor actual (como si fuera nueva)
            $('#cliNombre').value=f.cliente?.nombre||'';
            $('#cliNif').value=f.cliente?.nif||'';
            $('#cliDir').value=f.cliente?.dir||'';
            $('#cliTel').value=f.cliente?.tel||'';
            $('#cliEmail').value=f.cliente?.email||'';

            // Reconstruir líneas
            lineasDiv.innerHTML='';
            f.lines.forEach(l=>{
              const w=document.createElement('div');
              w.className='linea';
              w.innerHTML=`
                <div class="suggest-box"><input class="name" value="${escapeHTML(l.name)}"></div>
                <select class="mode">
                  <option value="" ${!l.mode?'selected':''}>—</option>
                  <option value="kg" ${l.mode==='kg'?'selected':''}>kg</option>
                  <option value="unidad" ${l.mode==='unidad'?'selected':''}>unidad</option>
                  <option value="caja" ${l.mode==='caja'?'selected':''}>caja</option>
                </select>
                <input class="qty" type="number" value="${l.qty||''}">
                <input class="gross" type="number" step="0.01" value="${l.gross||''}">
                <input class="tare" type="number" step="0.01" value="${l.tare||''}">
                <input class="net"  type="number" step="0.01" value="${l.net||''}" disabled>
                <input class="price" type="number" step="0.01" value="${l.price||''}">
                <input class="origin" value="${escapeHTML(l.origin||'')}">
                <input class="amount" disabled value="">
                <button class="del">✕</button>
              `;
              // recalcular importes de cada línea
              const m=w.querySelector('.mode').value;
              const q=parseNum(w.querySelector('.qty').value);
              const n=parseNum(w.querySelector('.net').value);
              const p=parseNum(w.querySelector('.price').value);
              const imp=(m==='unidad'?q*p:n*p);
              w.querySelector('.amount').value = imp>0 ? imp.toFixed(2) : '';
              lineasDiv.appendChild(w);
            });
            switchTab('factura');
            recalc();
          }
        });
      });

      // eventos filtros
      [busca,estadoSel,d1,d2].forEach(el=>el?.addEventListener('input', draw));

      // export/import
      btnEx.addEventListener('click', ()=>downloadJSON(facturas,'facturas-arslan-v10.json'));
      btnIm.addEventListener('click', ()=>uploadJSON(arr=>{
        if(Array.isArray(arr)){ facturas=arr; localStorage.setItem(K_FACTURAS,JSON.stringify(facturas)); draw(); drawResumen(); }
      }));
    }

    draw();
  }

  /* ---------- VISTA PREVIA / IMPRESIÓN ---------- */
  const pNum=$('#p-num'), pFecha=$('#p-fecha'), pProv=$('#p-prov'), pCli=$('#p-cli'),
        pSub=$('#p-sub'), pTra=$('#p-tra'), pIva=$('#p-iva'), pTot=$('#p-tot'), pEstado=$('#p-estado'), pMetodo=$('#p-metodo'), pObs=$('#p-obs');

  function fillPrint(factura){
    // Si viene un objeto completo (desde lista) lo usamos, si no usamos lo actual de la pantalla
    let f = factura;
    if(!f){
      const lines = getLineas();
      const subtotal=parseNum(subtotalEl.textContent),trans=parseNum(transpEl.textContent),iva=parseNum(ivaEl.textContent),total=parseNum(totalEl.textContent);
      f = {
        num:'(Borrador '+fmtDate(new Date())+')',
        fecha: todayISO(),
        cliente:{nombre:$('#cliNombre').value,nif:$('#cliNif').value,dir:$('#cliDir').value,tel:$('#cliTel').value,email:$('#cliEmail').value},
        proveedor:{nombre:$('#provNombre').value,nif:$('#provNif').value,dir:$('#provDir').value,tel:$('#provTel').value,email:$('#provEmail').value},
        lines, totals:{subtotal,transporte:trans,iva,total,pagado:parseNum($('#pagado').value||0),pendiente:Math.max(0,total-parseNum($('#pagado').value||0))},
        estado:$('#estado').value,metodo:$('#metodoPago').value,obs:$('#observaciones').value
      };
    }

    // Cabecera
    pNum.textContent = f.num || '';
    pFecha.textContent = new Date(f.fecha).toLocaleString();

    pProv.innerHTML = `
      ${escapeHTML(f.proveedor?.nombre||'')}<br>
      ${escapeHTML(f.proveedor?.nif||'')}<br>
      ${escapeHTML(f.proveedor?.dir||'')}<br>
      ${escapeHTML(f.proveedor?.tel||'')} ${f.proveedor?.email?('· '+escapeHTML(f.proveedor.email)) : ''}
    `;
    pCli.innerHTML = `
      ${escapeHTML(f.cliente?.nombre||'')}<br>
      ${escapeHTML(f.cliente?.nif||'')}<br>
      ${escapeHTML(f.cliente?.dir||'')}<br>
      ${escapeHTML(f.cliente?.tel||'')} ${f.cliente?.email?('· '+escapeHTML(f.cliente.email)) : ''}
    `;

    // Tabla
    const tbody = document.querySelector('#p-tabla tbody');
    tbody.innerHTML='';
    (f.lines||[]).forEach(l=>{
      const tr=document.createElement('tr');
      const imp = (l.mode==='unidad' ? l.qty*l.price : l.net*l.price) || 0;
      tr.innerHTML = `
        <td>${escapeHTML(l.name||'')}</td>
        <td>${escapeHTML(l.mode||'')}</td>
        <td>${l.qty||''}</td>
        <td>${(l.net||0).toFixed ? (l.net||0).toFixed(2) : (l.net||'')}</td>
        <td>${(l.price||0).toFixed ? (l.price||0).toFixed(2) : (l.price||'')}</td>
        <td>${escapeHTML(l.origin||'')}</td>
        <td>${imp.toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    });

    pSub.textContent = money(f.totals?.subtotal||0);
    pTra.textContent = money(f.totals?.transporte||0);
    pIva.textContent = money(f.totals?.iva||0);
    pTot.textContent = money(f.totals?.total||0);
    pEstado.textContent = f.estado||'pendiente';
    pMetodo.textContent = f.metodo||'';
    pObs.textContent = f.obs||'—';
  }

  /* ---------- RESUMEN + GRÁFICOS + BACKUP ---------- */
  const resumenApp = $('#resumenApp');

  function renderResumen(){
    if(!resumenApp) return;
    resumenApp.innerHTML = `
      <div class="cards4" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:12px">
        <div class="kpi"><div>Hoy</div><strong id="rHoy">0,00 €</strong></div>
        <div class="kpi"><div>Semana</div><strong id="rSemana">0,00 €</strong></div>
        <div class="kpi"><div>Mes</div><strong id="rMes">0,00 €</strong></div>
        <div class="kpi"><div>Total</div><strong id="rTotal">0,00 €</strong></div>
      </div>

      <div class="row" style="gap:10px;flex-wrap:wrap">
        <div class="card w50" style="flex:1;min-width:320px;border:1px solid var(--border);border-radius:12px;padding:12px;">
          <h3>Deuda por cliente</h3>
          <div id="resPorCliente" class="list"></div>
        </div>
        <div class="card w50" style="flex:1;min-width:320px;border:1px solid var(--border);border-radius:12px;padding:12px;">
          <h3>Ventas diarias (7d)</h3>
          <canvas id="chartDiario" height="140"></canvas>
        </div>
      </div>

      <div class="card" style="margin-top:12px;border:1px solid var(--border);border-radius:12px;padding:12px;">
        <h3>Ventas mensuales (12m)</h3>
        <canvas id="chartMensual" height="180"></canvas>
      </div>

      <div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap">
        <button id="btnBackup" class="btn">💾 Backup JSON</button>
        <button id="btnRestore" class="btn">⤴️ Restaurar JSON</button>
      </div>
    `;

    // calcular KPIs y deudas
    drawResumen();
    // gráficos
    drawCharts();

    // backup / restore
    const btnB=$('#btnBackup'), btnR=$('#btnRestore');
    btnB.addEventListener('click', ()=>{
      const payload={clientes,productos,facturas,priceHist,fecha:todayISO(),version:'ARSLAN PRO V10'};
      downloadJSON(payload, `backup-${fmtDate(new Date())}.json`);
    });
    btnR.addEventListener('click', ()=>{
      uploadJSON(obj=>{
        if(!obj||typeof obj!=='object'){alert('Copia inválida');return;}
        if(Array.isArray(obj.clientes)) clientes=obj.clientes;
        if(Array.isArray(obj.productos)) productos=obj.productos;
        if(Array.isArray(obj.facturas)) facturas=obj.facturas;
        if(obj.priceHist && typeof obj.priceHist==='object') priceHist=obj.priceHist;
        localStorage.setItem(K_CLIENTES,JSON.stringify(clientes));
        localStorage.setItem(K_PRODUCTOS,JSON.stringify(productos));
        localStorage.setItem(K_FACTURAS,JSON.stringify(facturas));
        localStorage.setItem(K_PRECIOS,JSON.stringify(priceHist));
        renderClientesSelect(); renderClientes(); renderProductos(); renderFacturas(); drawResumen(); drawCharts();
        alert('Backup restaurado');
      });
    });
  }

  function drawResumen(){
    const rHoyEl=$('#rHoy'), rSemEl=$('#rSemana'), rMesEl=$('#rMes'), rTotEl=$('#rTotal'), porClienteEl=$('#resPorCliente');
    if(!rHoyEl) return;

    const now=new Date(); const todayKey=now.toISOString().slice(0,10);
    const startOfWeek=(()=>{ const d=new Date(now); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); d.setHours(0,0,0,0); return d; })();
    const startOfMonth=new Date(now.getFullYear(), now.getMonth(), 1);

    let hoy=0, semana=0, mes=0, total=0, pendiente=0;
    facturas.forEach(f=>{
      const d=new Date(f.fecha);
      const t=f.totals?.total||0;
      total += t;
      if(f.fecha.slice(0,10)===todayKey) hoy += t;
      if(d>=startOfWeek) semana += t;
      if(d>=startOfMonth) mes += t;
      pendiente += (f.totals?.pendiente||0);
    });

    rHoyEl.textContent=money(hoy);
    rSemEl.textContent=money(semana);
    rMesEl.textContent=money(mes);
    rTotEl.textContent=money(total);

    // Deudas por cliente
    const map=new Map();
    facturas.forEach(f=>{
      const nom=f.cliente?.nombre||'(s/cliente)';
      const pend=f.totals?.pendiente||0;
      map.set(nom,(map.get(nom)||0)+pend);
    });
    porClienteEl.innerHTML='';
    if(map.size===0){ porClienteEl.innerHTML='<div class="item">No hay deudas registradas.</div>'; return; }
    [...map.entries()].sort((a,b)=>b[1]-a[1]).forEach(([nom,pend])=>{
      const div=document.createElement('div'); div.className='item';
      div.innerHTML=`<div><strong>${escapeHTML(nom)}</strong></div><div><strong>${money(pend)}</strong></div>`;
      porClienteEl.appendChild(div);
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
    const c1=$('#chartDiario'), c2=$('#chartMensual');
    if(!c1 || !c2 || typeof Chart==='undefined') return;
    const daily=groupDaily(7); const monthly=groupMonthly(12);
    if(chart1) chart1.destroy(); if(chart2) chart2.destroy();
    chart1=new Chart(c1.getContext('2d'), {type:'bar', data:{labels:daily.map(d=>d.label), datasets:[{label:'Ventas diarias', data:daily.map(d=>d.sum)}]}, options:{responsive:true, plugins:{legend:{display:false}}}});
    chart2=new Chart(c2.getContext('2d'), {type:'line', data:{labels:monthly.map(d=>d.label), datasets:[{label:'Ventas mensuales', data:monthly.map(d=>d.sum)}]}, options:{responsive:true, plugins:{legend:{display:false}}}});
  }

  /* ---------- ARRANQUE FINAL ---------- */
  renderFacturas();
  renderResumen();

  // Asegurar 5 líneas por defecto al entrar por primera vez
  if(!lineasDiv.querySelector('.linea')){ for(let i=0;i<5;i++) (function(){const n=lineaHTML(); lineasDiv.appendChild(n);})(); }
  recalc();

}); // DOMContentLoaded
