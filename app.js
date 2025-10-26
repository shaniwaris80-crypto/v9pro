/* ARSLAN PRO V15
   - Factura avanzada: tipo, cantidad, peso bruto, tara, peso neto, precio, origen, importe
   - 5 líneas por defecto (las vacías no imprimen)
   - Productos Pro: tipo, kg/caja, precio base, origen
   - Facturas: marcar como pagada, cobro parcial, PDF, filtro por estado
   - Deudas: global y por cliente + reset global y por cliente
   - Estadísticas: ventas diarias/semanales/mensuales + gráfico Canvas simple
   - Semilla de productos (solo nombres) si no existieran
*/

document.addEventListener('DOMContentLoaded', () => {
  /* ---------- HELPERS ---------- */
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const money = n => (isNaN(n)?0:n).toFixed(2).replace('.', ',') + " €";
  const parseNum = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
  const escapeHTML = s => String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const todayISO = () => new Date().toISOString();

  // Keys
  const K_CLIENTES='apv15_clientes', K_PRODUCTOS='apv15_productos', K_FACTURAS='apv15_facturas', K_PRICEHIST='apv15_pricehist';

  // Estado
  let clientes = JSON.parse(localStorage.getItem(K_CLIENTES) || '[]');
  let productos = JSON.parse(localStorage.getItem(K_PRODUCTOS) || '[]'); // {name, mode?, boxKg?, price?, origin?}
  let facturas  = JSON.parse(localStorage.getItem(K_FACTURAS)  || '[]');
  let priceHist = JSON.parse(localStorage.getItem(K_PRICEHIST) || '{}'); // {name: [{price,date}, ...]}

  // DOM: factura
  const lineasDiv = $('#lineas');
  const btnAddLinea = $('#btnAddLinea');
  const btnVaciarLineas = $('#btnVaciarLineas');

  const prov = { nombre: $('#provNombre'), nif: $('#provNif'), dir: $('#provDir'), tel: $('#provTel'), email: $('#provEmail') };
  const cli  = { nombre: $('#cliNombre'), nif: $('#cliNif'), dir: $('#cliDir'), tel: $('#cliTel'), email: $('#cliEmail') };
  const selCliente = $('#selCliente'); const btnNuevoCliente = $('#btnNuevoCliente');

  const chkTransporte = $('#chkTransporte'); const chkIvaIncluido = $('#chkIvaIncluido');
  const estado = $('#estado'); const pagadoInp = $('#pagado'); const metodoPago = $('#metodoPago'); const observaciones = $('#observaciones');

  const subtotalEl = $('#subtotal'); const transpEl = $('#transp'); const ivaEl = $('#iva'); const totalEl = $('#total');
  const mostPagadoEl = $('#mostPagado'); const pendienteEl = $('#pendiente');

  const btnGuardar = $('#btnGuardar'); const btnImprimir = $('#btnImprimir'); const btnNueva = $('#btnNueva');

  // DOM: clientes
  const listaClientes = $('#listaClientes');
  const btnAddCliente = $('#btnAddCliente'); const btnExportClientes = $('#btnExportClientes'); const btnImportClientes = $('#btnImportClientes');

  // DOM: facturas
  const filtroEstado = $('#filtroEstado'); const buscaCliente = $('#buscaCliente'); const listaFacturas = $('#listaFacturas');
  const btnExportFacturas = $('#btnExportFacturas'); const btnImportFacturas = $('#btnImportFacturas');

  // DOM: resumen
  const resGlobal = $('#resGlobal'); const resPorCliente = $('#resPorCliente');
  const btnResetCliente = $('#btnResetCliente'); const btnResetGlobal = $('#btnResetGlobal');

  // DOM: productos
  const listaProductos = $('#listaProductos'); const btnAddProducto = $('#btnAddProducto');
  const btnExportProductos = $('#btnExportProductos'); const btnImportProductos = $('#btnImportProductos');

  // DOM: stats
  const rangeSel = $('#range'); const statTotal = $('#statTotal'); const chartCanvas = $('#chart');

  // PRINT refs
  const pNum=$('#p-num'), pFecha=$('#p-fecha'), pProv=$('#p-prov'), pCli=$('#p-cli'), pTabla=$('#p-tabla tbody');
  const pSub=$('#p-sub'), pTra=$('#p-tra'), pIva=$('#p-iva'), pTot=$('#p-tot'), pEstado=$('#p-estado'), pMetodo=$('#p-metodo'), pObs=$('#p-obs');

  // Historial panel
  const pricePanel = $('#pricePanel'), ppBody = $('#ppBody');

  /* ---------- NAVEGACIÓN ---------- */
  function switchTab(id){
    $$('button.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
    $$('section.panel').forEach(p=>p.classList.toggle('active', p.dataset.tabPanel===id));
    if(id==='estadisticas'){ drawStats(); }
  }
  $$('button.tab').forEach(b=>b.addEventListener('click', ()=>switchTab(b.dataset.tab)));
  switchTab('factura');

  /* ---------- CLIENTES ---------- */
  function saveClientes(){ localStorage.setItem(K_CLIENTES, JSON.stringify(clientes)); }
  function renderClientesSelect(){
    selCliente.innerHTML = `<option value="">— Seleccionar cliente —</option>`;
    clientes.forEach((c,i)=>{
      const opt = document.createElement('option'); opt.value=i; opt.textContent = c.nombre || `Cliente ${i+1}`;
      selCliente.appendChild(opt);
    });
  }
  function renderClientesLista(){
    listaClientes.innerHTML = '';
    if(clientes.length===0){ listaClientes.innerHTML = `<div class="item">Sin clientes.</div>`; return; }
    clientes.forEach((c,idx)=>{
      const div = document.createElement('div');
      div.className='item';
      div.innerHTML = `
        <div>
          <strong>${escapeHTML(c.nombre||'(Sin nombre)')}</strong>
          <div class="meta">${escapeHTML(c.nif||'')} · ${escapeHTML(c.dir||'')} · ${escapeHTML(c.tel||'')} · ${escapeHTML(c.email||'')}</div>
        </div>
        <div>
          <button class="btn small" data-e="edit" data-i="${idx}">Editar</button>
          <button class="btn small ghost" data-e="del" data-i="${idx}">Borrar</button>
        </div>`;
      listaClientes.appendChild(div);
    });
    listaClientes.querySelectorAll('button').forEach(b=>{
      const i = +b.dataset.i;
      b.addEventListener('click', ()=>{
        if(b.dataset.e==='del'){
          if(confirm('¿Eliminar cliente?')){ clientes.splice(i,1); saveClientes(); renderClientesSelect(); renderClientesLista(); }
        } else {
          const c = clientes[i];
          const nombre = prompt('Nombre', c.nombre||'') ?? c.nombre;
          const nif = prompt('NIF/CIF', c.nif||'') ?? c.nif;
          const dir = prompt('Dirección', c.dir||'') ?? c.dir;
          const tel = prompt('Teléfono', c.tel||'') ?? c.tel;
          const email = prompt('Email', c.email||'') ?? c.email;
          clientes[i] = {nombre,nif,dir,tel,email};
          saveClientes(); renderClientesSelect(); renderClientesLista();
        }
      });
    });
  }
  btnNuevoCliente?.addEventListener('click', ()=>switchTab('clientes'));
  btnAddCliente?.addEventListener('click', ()=>{
    const nombre = prompt('Nombre del cliente:'); if(!nombre) return;
    const nif = prompt('NIF/CIF:')||''; const dir=prompt('Dirección:')||''; const tel=prompt('Teléfono:')||''; const email=prompt('Email:')||'';
    clientes.push({nombre,nif,dir,tel,email}); saveClientes(); renderClientesSelect(); renderClientesLista();
  });
  btnExportClientes?.addEventListener('click', ()=>downloadJSON(clientes,'clientes-apv15.json'));
  btnImportClientes?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ clientes=arr; saveClientes(); renderClientesSelect(); renderClientesLista(); } }));

  selCliente?.addEventListener('change', ()=>{
    const i = selCliente.value; if(i==='') return;
    const c = clientes[+i]; if(!c) return;
    cli.nombre.value=c.nombre||''; cli.nif.value=c.nif||''; cli.dir.value=c.dir||''; cli.tel.value=c.tel||''; cli.email.value=c.email||'';
  });

  /* ---------- PRODUCTOS ---------- */
  function saveProductos(){ localStorage.setItem(K_PRODUCTOS, JSON.stringify(productos)); }

  // Semilla de nombres (solo si vacío)
  const PRODUCT_NAMES = [
    "GRANNY FRANCIA","MANZANA PINK LADY","MANDARINA COLOMBE","KIWI ZESPRI GOLD","PARAGUAYO","KIWI TOMASIN PLANCHA","PERA RINCON DEL SOTO","MELOCOTON PRIMERA","AGUACATE GRANEL","MARACUYÁ","MANZANA GOLDEN 24","PLATANO CANARIO PRIMERA","MANDARINA HOJA","MANZANA GOLDEN 2O","NARANJA TOMASIN","NECTARINA","NUECES","SANDIA","LIMON SEGUNDA","MANZANA FUJI","NARANAJA MESA SONRISA","JENGIBRE","BATATA","AJO PRIMERA","CEBOLLA NORMAL","CALABAZA GRANDE","PATATA LAVADA","TOMATE CHERRY RAMA","TOMATE CHERRY PERA","TOMATE DANIELA","TOMATE ROSA PRIMERA","CEBOLLINO","TOMATE ASURCADO MARRON","TOMATE RAMA","PIMIENTO PADRON","ZANAHORIA","PEPINO","CEBOLLETA","PUERROS","BROCOLI","JUDIA VERDE","BERENJENA","PIMIENTO ITALIANO VERDE","PIMIENTO ITALIANO ROJO","CHAMPIÑON","UVA ROJA","UVA BLANCA","ALCACHOFA","CALABACIN","COLIFLOR","BATAVIA","ICEBERG","MANDARINA SEGUNDA","MANZANA GOLDEN 28","NARANJA ZUMO","KIWI SEGUNDA","MANZANA ROYAL GALA 24","PLATANO CANARIO SUELTO","CEREZA","FRESAS","ARANDANOS","ESPINACA","PEREJIL","CILANTRO","ACELGAS","PIMIENTO VERDE","PIMIENTO ROJO","MACHO VERDE","MACHO MADURO","YUCA","AVOCADO","CEBOLLA ROJA","CILANTRO","MENTA","HABANERO","RABANITOS","POMELO","PAPAYA","REINETA 28","NISPERO","ALBARICOQUE","TOMATE PERA","TOMATE BOLA","TOMATE PINK","VALVENOSTA GOLDEN","MELOCOTON ROJO","MELON GALIA","APIO","NARANJA SANHUJA","LIMON PRIMERA","MANGO","MELOCOTON AMARILLO","VALVENOSTA ROJA","PIÑA","NARANJA HOJA","PERA CONFERENCIA SEGUNDA","CEBOLLA DULCE","TOMATE ASURCADO AZUL","ESPARRAGOS BLANCOS","ESPARRAGOS TRIGUEROS","REINETA PRIMERA","AGUACATE PRIMERA","COCO","NECTARINA SEGUNDA","REINETA 24","NECTARINA CARNE BLANCA","GUINDILLA","REINETA VERDE","PATATA 25KG","PATATA 5 KG","TOMATE RAFF","REPOLLO","KIWI ZESPRI","PARAGUAYO SEGUNDA","MELON","REINETA 26","PLATANO CANARIO SUELTO","TOMATE ROSA","MANZANA CRIPS","ALOE VERA PIEZAS","TOMATE ENSALADA","PATATA 10KG","MELON BOLLO","CIRUELA ROJA","LIMA","GUINEO VERDE","SETAS","BANANA","BONIATO","FRAMBUESA","BREVAS","PERA AGUA","YAUTIA","YAME","OKRA","MANZANA MELASSI","CACAHUETE","SANDIA NEGRA","SANDIA RAYADA","HIGOS","KUMATO","KIWI CHILE","MELOCOTON AMARILLO SEGUNDA","HIERBABUENA","REMOLACHA","LECHUGA ROMANA","CEREZA","KAKI","CIRUELA CLAUDIA","PERA LIMONERA","CIRUELA AMARILLA","HIGOS BLANCOS","UVA ALVILLO","LIMON EXTRA","PITAHAYA ROJA","HIGO CHUMBO","CLEMENTINA","GRANADA","NECTARINA PRIMERA BIS","CHIRIMOYA","UVA CHELVA","PIMIENTO CALIFORNIA VERDE","KIWI TOMASIN","PIMIENTO CALIFORNIA ROJO","MANDARINA SATSUMA","CASTAÑA","CAKI","MANZANA KANZI","PERA ERCOLINA","NABO","UVA ALVILLO NEGRA","CHAYOTE","ROYAL GALA 28","MANDARINA PRIMERA","PIMIENTO PINTON","MELOCOTON AMARILLO DE CALANDA","HINOJOS","MANDARINA DE HOJA","UVA ROJA PRIMERA","UVA BLANCA PRIMERA"
  ];
  function seedProductsIfEmpty(){
    if(Array.isArray(productos) && productos.length>0) return;
    productos = PRODUCT_NAMES.map(n => ({ name: n })); // solo nombre
    saveProductos();
  }

  function savePriceHist(){ localStorage.setItem(K_PRICEHIST, JSON.stringify(priceHist)); }
  function pushPriceHistory(name, price){
    if(!name || !(price>0)) return;
    const arr = priceHist[name] || [];
    arr.unshift({price, date: todayISO()});
    priceHist[name] = arr.slice(0,10);
    savePriceHist();
  }
  function lastPrice(name){ const arr = priceHist[name]; return arr?.length ? arr[0].price : null; }

  function renderProductos(){
    listaProductos.innerHTML='';
    if(productos.length===0){ listaProductos.innerHTML=`<div class="item">Sin productos. Usa “Añadir” o Importar JSON.</div>`; return; }
    productos.forEach((p,idx)=>{
      const row = document.createElement('div');
      row.className='product-row';
      row.innerHTML = `
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
          const row = b.closest('.product-row');
          const get = f => row.querySelector(`[data-f="${f}"]`).value.trim();
          const name = get('name');
          const mode = get('mode') || null;
          const boxKgStr = get('boxKg'); const boxKg = boxKgStr===''?null:parseNum(boxKgStr);
          const priceStr = get('price'); const price = priceStr===''?null:parseNum(priceStr);
          const origin = get('origin') || null;
          productos[i] = {name, mode, boxKg, price, origin};
          saveProductos(); renderProductos();
        }
      });
    });
  }
  btnAddProducto?.addEventListener('click', ()=>{
    const name = prompt('Nombre del producto:'); if(!name) return;
    productos.push({name}); saveProductos(); renderProductos();
  });
  btnExportProductos?.addEventListener('click', ()=>downloadJSON(productos,'productos-apv15.json'));
  btnImportProductos?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ productos=arr; saveProductos(); renderProductos(); } }));

  /* ---------- FACTURA: LÍNEAS ---------- */
  function lineaHTML(){
    const wrap = document.createElement('div');
    wrap.className='linea';
    wrap.innerHTML = `
      <div class="suggest-box">
        <input class="name" placeholder="Producto">
        <div class="suggest-list" hidden></div>
      </div>
      <select class="mode">
        <option value="">—</option>
        <option value="kg">kg</option>
        <option value="unidad">unidad</option>
        <option value="caja">caja</option>
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

    const nameInp = wrap.querySelector('.name');
    const list = wrap.querySelector('.suggest-list');
    const modeInp = wrap.querySelector('.mode');
    const qtyInp = wrap.querySelector('.qty');
    const grossInp = wrap.querySelector('.gross');
    const tareInp = wrap.querySelector('.tare');
    const netInp = wrap.querySelector('.net');
    const priceInp = wrap.querySelector('.price');
    const originInp = wrap.querySelector('.origin');
    const amtInp = wrap.querySelector('.amount');

    // Sugerencias
    nameInp.addEventListener('input', ()=>{
      const q = nameInp.value.trim().toLowerCase(); if(!q){ list.hidden=true; list.innerHTML=''; return; }
      const matches = productos.filter(p=>p.name.toLowerCase().includes(q)).slice(0,12);
      if(matches.length===0){ list.hidden=true; list.innerHTML=''; return; }
      list.innerHTML='';
      matches.forEach(p=>{
        const last=lastPrice(p.name);
        const btn=document.createElement('button');
        btn.textContent = `${p.name}${p.mode?` · ${p.mode}`:''}${p.boxKg?` · ${p.boxKg}kg/caja`:''}${p.price!=null?` · base ${p.price}€`:''}${p.origin?` · ${p.origin}`:''}${last?` · último ${last}€`:''}`;
        btn.addEventListener('click', ()=>{
          nameInp.value=p.name;
          if(p.mode){ modeInp.value=p.mode; }
          if(p.price!=null){ priceInp.value=p.price; }
          if(p.origin){ originInp.value=p.origin; }
          list.hidden=true;
          showPricePanel(p.name);
          recalcLine();
        });
        list.appendChild(btn);
      });
      list.hidden=false;
    });
    nameInp.addEventListener('blur', ()=> setTimeout(()=>list.hidden=true,150));
    nameInp.addEventListener('dblclick', ()=>{ if(nameInp.value.trim()) showPricePanel(nameInp.value.trim()); });

    // Recalc por cambios
    [modeInp, qtyInp, grossInp, tareInp, priceInp].forEach(el=>el.addEventListener('input', recalcLine));

    wrap.querySelector('.del').addEventListener('click', ()=>{ wrap.remove(); recalc(); });

    function recalcLine(){
      const mode = (modeInp.value||'').toLowerCase();
      const qty = Math.max(0, Math.floor(parseNum(qtyInp.value||0)));
      const gross = Math.max(0, parseNum(grossInp.value||0));
      const tare = Math.max(0, parseNum(tareInp.value||0));
      const price = Math.max(0, parseNum(priceInp.value||0));
      let net = 0;

      if(gross>0){ net = Math.max(0, gross - tare); }
      else if(mode==='caja'){
        const p = findProducto(nameInp.value);
        const kg = p?.boxKg || 0;
        net = qty * kg;
      } else if(mode==='kg'){
        net = parseNum(qty) || 0; // cantidad como kg
      } else if(mode==='unidad'){
        net = qty; // neto interpretado como unidades
      }

      netInp.value = net ? net.toFixed(2) : '';
      let amount = 0;
      if(mode==='unidad'){ amount = qty * price; }
      else { amount = net * price; }
      amtInp.value = amount>0 ? amount.toFixed(2) : '';

      recalc();
    }

    return wrap;
  }

  function addLinea(){ lineasDiv.appendChild(lineaHTML()); }
  btnAddLinea?.addEventListener('click', addLinea);
  btnVaciarLineas?.addEventListener('click', ()=>{ if(confirm('¿Vaciar todas las líneas?')){ lineasDiv.innerHTML=''; for(let i=0;i<5;i++) addLinea(); recalc(); } });

  function getLineas(){
    // devolvemos solo las líneas con producto real
    return $$('.linea').map(r=>{
      const name  = r.querySelector('.name').value.trim();
      const mode  = r.querySelector('.mode').value.trim().toLowerCase();
      const qty   = Math.max(0, Math.floor(parseNum(r.querySelector('.qty').value||0)));
      const gross = Math.max(0, parseNum(r.querySelector('.gross').value||0));
      const tare  = Math.max(0, parseNum(r.querySelector('.tare').value||0));
      const net   = Math.max(0, parseNum(r.querySelector('.net').value||0));
      const price = Math.max(0, parseNum(r.querySelector('.price').value||0));
      const origin= r.querySelector('.origin').value.trim();
      return {name,mode,qty,gross,tare,net,price,origin};
    }).filter(l=>{
      if(!l.name) return false;
      // línea válida si tiene cantidad o neto/peso
      return (l.qty>0) || (l.net>0) || (l.gross>0);
    });
  }

  function findProducto(name){ return productos.find(p=>(p.name||'').toLowerCase()===String(name).toLowerCase()); }

  function lineImporte(l){
    if(l.mode==='unidad'){ return l.qty * l.price; }
    return l.net * l.price; // kg o caja usan neto
  }

  /* ---------- CÁLCULO ---------- */
  function recalc(){
    const ls = getLineas();
    let subtotal=0; ls.forEach(l=> subtotal+=lineImporte(l));
    const transporte = chkTransporte.checked ? subtotal*0.10 : 0;
    const baseMasTrans = subtotal + transporte;
    const iva = baseMasTrans * 0.04; // solo informativo
    const total = baseMasTrans;
    const pagado = parseNum($('#pagado').value);
    const pendiente = Math.max(0, total - pagado);

    subtotalEl.textContent = money(subtotal);
    transpEl.textContent   = money(transporte);
    ivaEl.textContent      = money(iva);
    totalEl.textContent    = money(total);
    mostPagadoEl.textContent = money(pagado);
    pendienteEl.textContent  = money(pendiente);

    fillPrint(ls,{subtotal,transporte,iva,total});
    drawStats(); // refresca totales mostrados si estás en estadísticas
  }
  ;[chkTransporte, chkIvaIncluido, estado, pagadoInp].forEach(el=>el?.addEventListener('input', recalc));

  /* ---------- HISTORIAL PRECIOS ---------- */
  function showPricePanel(name){
    const arr = (priceHist[name]||[]).slice(0,5);
    if(arr.length===0){
      ppBody.innerHTML = `<div class="pp-row"><span>${escapeHTML(name)}</span><span>Sin historial</span></div>`;
    } else {
      ppBody.innerHTML = `<div class="pp-row"><strong>${escapeHTML(name)}</strong><span>últimos</span></div>` +
        arr.map(x=> `<div class="pp-row"><span>${new Date(x.date).toLocaleString()}</span><strong>${money(x.price)}</strong></div>`).join('');
    }
    pricePanel.hidden=false;
  }
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') pricePanel.hidden=true; });

  /* ---------- GUARDAR / NUEVA / PDF ---------- */
  function genNumFactura(){
    const d=new Date(), pad=n=>String(n).padStart(2,'0');
    return `FA-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }
  function unMoney(s){ return parseFloat(String(s).replace(/\./g,'').replace(',','.').replace(/[^\d.]/g,'')) || 0; }

  function saveFacturas(){ localStorage.setItem(K_FACTURAS, JSON.stringify(facturas)); }

  btnGuardar?.addEventListener('click', ()=>{
    const ls=getLineas(); if(ls.length===0){ alert('Añade al menos una línea.'); return; }
    const numero=genNumFactura(); const now=todayISO();

    // guardar historial de precios actuales
    ls.forEach(l=> pushPriceHistory(l.name, l.price));

    const subtotal=unMoney(subtotalEl.textContent);
    const transporte=unMoney(transpEl.textContent);
    const iva=unMoney(ivaEl.textContent);
    const total=unMoney(totalEl.textContent);
    const pagado=parseNum(pagadoInp.value);
    const pendiente=Math.max(0,total-pagado);

    const factura={
      numero, fecha:now,
      proveedor: {...Object.fromEntries(Object.entries(prov).map(([k,el])=>[k,el.value]))},
      cliente:   {...Object.fromEntries(Object.entries(cli).map(([k,el])=>[k,el.value]))},
      lineas:ls, transporte:chkTransporte.checked, ivaIncluido:chkIvaIncluido.checked,
      estado:estado.value, metodo:metodoPago.value, obs:observaciones.value,
      totals:{subtotal,transporte,iva,total,pagado,pendiente}
    };
    facturas.unshift(factura); saveFacturas();
    alert(`Factura ${numero} guardada.`);
    renderFacturas(); renderResumen(); fillPrint(ls,{subtotal,transporte,iva,total},factura);
  });

  btnNueva?.addEventListener('click', ()=>{
    lineasDiv.innerHTML='';
    for(let i=0;i<5;i++) addLinea();
    chkTransporte.checked=false; chkIvaIncluido.checked=true; estado.value='pendiente';
    pagadoInp.value=''; metodoPago.value='Efectivo'; observaciones.value='';
    recalc();
  });

  btnImprimir?.addEventListener('click', ()=>window.print());

  /* ---------- FACTURAS LISTA ---------- */
  function badgeEstado(f){
    if(f.estado==='pagado') return `<span class="badge ok">Pagada</span>`;
    if(f.estado==='parcial'){
      const resta = Math.max(0,(f.totals?.total||0)-(f.totals?.pagado||0));
      return `<span class="badge warn">Parcial · resta ${money(resta)}</span>`;
    }
    return `<span class="badge bad">Impagada</span>`;
  }

  function renderFacturas(){
    listaFacturas.innerHTML='';
    const q=(buscaCliente.value||'').toLowerCase();
    const fe=filtroEstado.value;

    let arr=facturas.slice();
    if(fe!=='todas') arr=arr.filter(f=>f.estado===fe);
    if(q) arr=arr.filter(f=>(f.cliente?.nombre||'').toLowerCase().includes(q));

    if(arr.length===0){ listaFacturas.innerHTML='<div class="item">No hay facturas.</div>'; return; }

    arr.slice(0,300).forEach((f,idx)=>{
      const fecha=new Date(f.fecha).toLocaleString();
      const div=document.createElement('div');
      div.className='item';
      div.innerHTML = `
        <div>
          <strong>${escapeHTML(f.numero)}</strong> ${badgeEstado(f)}
          <div class="meta">${fecha} · ${escapeHTML(f.cliente?.nombre||'')}</div>
        </div>
        <div class="row-inline">
          <strong>${money(f.totals.total)}</strong>
          <button class="btn small" data-e="ver" data-i="${idx}">Ver</button>
          <button class="btn small" data-e="cobrar" data-i="${idx}">Cobrar</button>
          <button class="btn small ghost" data-e="pdf" data-i="${idx}">PDF</button>
        </div>`;
      listaFacturas.appendChild(div);
    });

    listaFacturas.querySelectorAll('button').forEach(b=>{
      const i=+b.dataset.i;
      b.addEventListener('click', ()=>{
        const f=facturas[i];
        if(b.dataset.e==='pdf'){ fillPrint(f.lineas,f.totals,f); window.print(); return; }
        if(b.dataset.e==='ver'){ fillPrint(f.lineas,f.totals,f); switchTab('factura'); $('#printArea').scrollIntoView({behavior:'smooth'}); return; }
        if(b.dataset.e==='cobrar'){
          const tot = f.totals.total||0;
          const pagado = parseNum(prompt('Importe cobrado (deja vacío para cobrar todo):', String(tot)));
          const nuevo = isNaN(pagado) ? tot : pagado;
          f.totals.pagado = Math.min(tot, (f.totals.pagado||0) + nuevo);
          f.totals.pendiente = Math.max(0, tot - f.totals.pagado);
          f.estado = f.totals.pendiente>0 ? 'parcial' : 'pagado';
          saveFacturas(); renderFacturas(); renderResumen(); drawStats();
          return;
        }
      });
    });
  }
  [filtroEstado, buscaCliente].forEach(el=>el?.addEventListener('input', renderFacturas));
  btnExportFacturas?.addEventListener('click', ()=>downloadJSON(facturas,'facturas-apv15.json'));
  btnImportFacturas?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ facturas=arr; saveFacturas(); renderFacturas(); renderResumen(); drawStats(); } }));

  /* ---------- RESUMEN (DEUDAS) ---------- */
  function renderResumen(){
    const totalPend = facturas.reduce((acc,f)=>acc+(f.totals?.pendiente||0),0);
    resGlobal.textContent = money(totalPend);

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
      div.innerHTML = `<div><strong>${escapeHTML(nom)}</strong></div><div><strong>${money(pend)}</strong></div>`;
      resPorCliente.appendChild(div);
    });
  }

  btnResetCliente?.addEventListener('click', ()=>{
    const i=selCliente.value; if(i===''){ alert('Selecciona un cliente en la pestaña Factura.'); return; }
    const nombre=clientes[+i]?.nombre||''; if(!nombre){ alert('Cliente sin nombre.'); return; }
    if(!confirm(`¿Resetear deudas del cliente "${nombre}"?`)) return;
    facturas=facturas.map(f=>{
      if((f.cliente?.nombre||'')===nombre){
        const n={...f, totals:{...f.totals}}; const tot=n.totals.total||0; n.totals.pagado=tot; n.totals.pendiente=0; n.estado='pagado'; return n;
      }
      return f;
    });
    saveFacturas(); renderFacturas(); renderResumen(); drawStats();
  });
  btnResetGlobal?.addEventListener('click', ()=>{
    if(!confirm('¿Resetear TODAS las deudas?')) return;
    facturas=facturas.map(f=>{ const n={...f, totals:{...f.totals}}; const tot=n.totals.total||0; n.totals.pagado=tot; n.totals.pendiente=0; n.estado='pagado'; return n; });
    saveFacturas(); renderFacturas(); renderResumen(); drawStats();
  });

  /* ---------- IMPRESIÓN ---------- */
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
        <td>${money(lineImporte(l))}</td>`;
      pTabla.appendChild(tr);
    });

    pSub.textContent = money(totals?.subtotal||0);
    pTra.textContent = money(totals?.transporte||0);
    pIva.textContent = money(totals?.iva||0);
    pTot.textContent = money(totals?.total||0);

    pEstado.textContent = factura?.estado || estado.value;
    pMetodo.textContent = factura?.metodo || metodoPago.value;
    pObs.textContent = factura?.obs || (observaciones.value||'—');
  }

  /* ---------- ESTADÍSTICAS ---------- */
  function groupByPeriod(period){ // 'daily' (14), 'weekly' (12), 'monthly' (12)
    const now = new Date();
    let buckets = [];
    if(period==='daily'){
      for(let i=13;i>=0;i--){
        const d = new Date(now); d.setDate(d.getDate()-i);
        const key = d.toISOString().slice(0,10);
        buckets.push({label:key.slice(5), key, sum:0});
      }
      facturas.forEach(f=>{
        const k = f.fecha.slice(0,10);
        const b = buckets.find(x=>x.key===k);
        if(b) b.sum += (f.totals?.total||0);
      });
    } else if(period==='weekly'){
      // semana ISO simple: YYYY-Www
      function isoWeek(d){ d=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const day=d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()+4-day); const year=d.getUTCFullYear(); const week=Math.ceil(((d - new Date(Date.UTC(year,0,1)))/86400000+1)/7); return `${year}-W${String(week).padStart(2,'0')}`; }
      const keys = [];
      for(let i=11;i>=0;i--){
        const d=new Date(now); d.setDate(d.getDate()-i*7);
        keys.push(isoWeek(d));
      }
      buckets = keys.map(k=>({label:k.slice(5), key:k, sum:0}));
      facturas.forEach(f=>{
        const k = isoWeek(new Date(f.fecha));
        const b = buckets.find(x=>x.key===k);
        if(b) b.sum += (f.totals?.total||0);
      });
    } else { // monthly
      const keys=[];
      for(let i=11;i>=0;i--){
        const d=new Date(now); d.setMonth(d.getMonth()-i);
        const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        keys.push(k);
      }
      buckets = keys.map(k=>({label:k.slice(5), key:k, sum:0}));
      facturas.forEach(f=>{
        const d=new Date(f.fecha);
        const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const b=buckets.find(x=>x.key===k);
        if(b) b.sum += (f.totals?.total||0);
      });
    }
    return buckets;
  }

  function drawChart(canvas, data){
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const W = canvas.width, H = canvas.height, pad=40;

    const labels = data.map(d=>d.label);
    const values = data.map(d=>d.sum);
    const max = Math.max(10, ...values)*1.1;

    // axes
    ctx.lineWidth=1;
    ctx.strokeStyle='#ccc';
    ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, H-pad); ctx.lineTo(W-pad, H-pad); ctx.stroke();

    // y ticks
    const steps = 5;
    ctx.fillStyle='#666';
    ctx.font='12px Poppins';
    for(let i=0;i<=steps;i++){
      const y = H-pad - (H-2*pad)*i/steps;
      const val = max*i/steps;
      ctx.fillText(money(val).replace(' €',''), 4, y+4);
      ctx.strokeStyle='#eee'; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W-pad, y); ctx.stroke();
    }

    // bars
    const n = values.length;
    const bw = (W-2*pad)/n*0.7;
    const gap = (W-2*pad)/n*0.3;
    let x = pad + gap/2;
    ctx.fillStyle='#22c55e';
    values.forEach((v,i)=>{
      const h = (H-2*pad)*v/max;
      ctx.fillRect(x, H-pad-h, bw, h);
      ctx.save(); ctx.translate(x+bw/2, H-pad+14); ctx.rotate(-Math.PI/6);
      ctx.fillStyle='#666'; ctx.fillText(labels[i], -16, 0);
      ctx.restore();
      x += bw+gap;
    });
  }

  function drawStats(){
    const period = rangeSel.value;
    const buckets = groupByPeriod(period);
    const total = buckets.reduce((a,b)=>a+b.sum,0);
    statTotal.textContent = money(total);
    drawChart(chartCanvas, buckets);
  }
  rangeSel?.addEventListener('change', drawStats);

  /* ---------- UTIL JSON ---------- */
  function downloadJSON(obj, filename){
    const blob = new Blob([JSON.stringify(obj,null,2)], {type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function uploadJSON(cb){
    const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
    inp.onchange=e=>{
      const f=e.target.files[0]; if(!f) return;
      const reader=new FileReader(); reader.onload=()=>{ try{ const data=JSON.parse(reader.result); cb(data); }catch{ alert('JSON inválido'); } };
      reader.readAsText(f);
    };
    inp.click();
  }

  /* ---------- BOOT ---------- */
  if(clientes.length===0){
    clientes=[
      {nombre:'Riviera', nif:'B16794893', dir:'Paseo del Espolón, Burgos', tel:'', email:''},
      {nombre:'Alesal Pan y Café S.L', nif:'B09582420', dir:'C/ San Lesmes 1', tel:'', email:''}
    ];
    saveClientes();
  }
  seedProductsIfEmpty();

  renderClientesSelect(); renderClientesLista();
  renderProductos(); renderFacturas(); renderResumen();

  // 5 líneas por defecto
  if($$('.linea').length===0){ for(let i=0;i<5;i++) addLinea(); }
  recalc();
});
