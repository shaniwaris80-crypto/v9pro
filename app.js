/* ARSLAN PRO V10
   - Logo kiwi (imagen)
   - Sugerencias de productos (no autocompletar; solo si haces clic)
   - Estados con colores: pagado (verde), parcial (ámbar, muestra resta), pendiente (rojo)
   - Listado de facturas: ver estado, pendiente y reimprimir/ PDF
   - Productos gestionables (sugerencias), recuerda último precio
   - Cantidades enteras, transporte +10%, IVA 4% mostrado
   - localStorage: clientes, facturas, productos
*/

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = n => (isNaN(n)?0:n).toFixed(2).replace('.', ',') + " €";
const parseNum = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };

// Storage keys
const K_CLIENTES = 'apv10_clientes';
const K_FACTURAS = 'apv10_facturas';
const K_PRODUCTOS = 'apv10_productos';
const K_PRICEHIST = 'apv10_pricehist'; // { "Producto": lastPrice }

// Estado
let clientes = JSON.parse(localStorage.getItem(K_CLIENTES) || '[]');
let facturas = JSON.parse(localStorage.getItem(K_FACTURAS) || '[]');
let productos = JSON.parse(localStorage.getItem(K_PRODUCTOS) || '[]');
let priceHist = JSON.parse(localStorage.getItem(K_PRICEHIST) || '{}');

// Elementos UI (idénticos a V9 más productos)
const selCliente = $('#selCliente');
const btnNuevoCliente = $('#btnNuevoCliente');
const btnAddCliente = $('#btnAddCliente');
const listaClientes = $('#listaClientes');

const lineasDiv = $('#lineas');
const btnAddLinea = $('#btnAddLinea');
const btnVaciarLineas = $('#btnVaciarLineas');

const chkTransporte = $('#chkTransporte');
const chkIvaIncluido = $('#chkIvaIncluido');
const estado = $('#estado');
const pagadoInp = $('#pagado');
const metodoPago = $('#metodoPago');
const observaciones = $('#observaciones');

const subtotalEl = $('#subtotal');
const transpEl = $('#transp');
const ivaEl = $('#iva');
const totalEl = $('#total');
const mostPagadoEl = $('#mostPagado');
const pendienteEl = $('#pendiente');

const btnGuardar = $('#btnGuardar');
const btnImprimir = $('#btnImprimir');
const btnNueva = $('#btnNueva');

const filtroEstado = $('#filtroEstado');
const buscaCliente = $('#buscaCliente');
const listaFacturas = $('#listaFacturas');

const resGlobal = $('#resGlobal');
const resPorCliente = $('#resPorCliente');
const btnResetCliente = $('#btnResetCliente');
const btnResetGlobal = $('#btnResetGlobal');

// Productos panel
const btnAddProducto = $('#btnAddProducto');
const btnExportProductos = $('#btnExportProductos');
const btnImportProductos = $('#btnImportProductos');
const listaProductos = $('#listaProductos');

// Proveedor & Cliente inputs
const prov = { nombre: $('#provNombre'), nif: $('#provNif'), dir: $('#provDir'), tel: $('#provTel'), email: $('#provEmail') };
const cli = { nombre: $('#cliNombre'), nif: $('#cliNif'), dir: $('#cliDir'), tel: $('#cliTel'), email: $('#cliEmail') };

// PRINT refs
const pNum = $('#p-num'), pFecha = $('#p-fecha');
const pProv = $('#p-prov'), pCli = $('#p-cli');
const pTabla = $('#p-tabla tbody');
const pSub = $('#p-sub'), pTra = $('#p-tra'), pIva = $('#p-iva'), pTot = $('#p-tot');
const pEstado = $('#p-estado'), pMetodo = $('#p-metodo'), pObs = $('#p-obs');

// Tabs
function switchTab(id){
  $$('.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  $$('.panel').forEach(p=>p.classList.toggle('active', p.dataset.tabPanel===id));
}
$$('.tab').forEach(b=>b.addEventListener('click', ()=>switchTab(b.dataset.tab)));

// ---------- CLIENTES ----------
function renderClientesSelect(){
  selCliente.innerHTML = `<option value="">— Seleccionar cliente —</option>`;
  clientes.forEach((c, i)=>{
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = c.nombre || `Cliente ${i+1}`;
    selCliente.appendChild(opt);
  });
}
function renderClientesLista(){
  listaClientes.innerHTML = '';
  if(clientes.length===0){
    listaClientes.innerHTML = `<div class="item"><span>No hay clientes.</span></div>`;
    return;
  }
  clientes.forEach((c, idx)=>{
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div>
        <strong>${c.nombre || '(Sin nombre)'}</strong>
        <div class="meta">${c.nif||''} · ${c.dir||''} · ${c.tel||''} · ${c.email||''}</div>
      </div>
      <div>
        <button class="btn" data-e="editar" data-i="${idx}">Editar</button>
        <button class="btn ghost" data-e="borrar" data-i="${idx}">Borrar</button>
      </div>
    `;
    listaClientes.appendChild(div);
  });

  listaClientes.querySelectorAll('button').forEach(b=>{
    const i = +b.dataset.i;
    b.addEventListener('click', ()=>{
      if(b.dataset.e==='borrar'){
        if(confirm('¿Eliminar este cliente?')) {
          clientes.splice(i,1);
          localStorage.setItem(K_CLIENTES, JSON.stringify(clientes));
          renderClientesSelect(); renderClientesLista();
        }
      } else {
        const c = clientes[i];
        const nombre = prompt('Nombre', c.nombre||'') ?? c.nombre;
        const nif = prompt('NIF/CIF', c.nif||'') ?? c.nif;
        const dir = prompt('Dirección', c.dir||'') ?? c.dir;
        const tel = prompt('Teléfono', c.tel||'') ?? c.tel;
        const email = prompt('Email', c.email||'') ?? c.email;
        clientes[i] = {nombre, nif, dir, tel, email};
        localStorage.setItem(K_CLIENTES, JSON.stringify(clientes));
        renderClientesSelect(); renderClientesLista();
      }
    });
  });
}
btnNuevoCliente.addEventListener('click', ()=>switchTab('clientes'));
btnAddCliente?.addEventListener('click', ()=>{
  const nombre = prompt('Nombre del cliente');
  if(!nombre) return;
  const nif = prompt('NIF/CIF') || '';
  const dir = prompt('Dirección') || '';
  const tel = prompt('Teléfono') || '';
  const email = prompt('Email') || '';
  clientes.push({nombre,nif,dir,tel,email});
  localStorage.setItem(K_CLIENTES, JSON.stringify(clientes));
  renderClientesSelect(); renderClientesLista();
});
selCliente.addEventListener('change', ()=>{
  const i = selCliente.value;
  if(i==='') return;
  const c = clientes[+i];
  cli.nombre.value = c.nombre||'';
  cli.nif.value = c.nif||'';
  cli.dir.value = c.dir||'';
  cli.tel.value = c.tel||'';
  cli.email.value = c.email||'';
});

// ---------- PRODUCTOS (SUGERENCIAS) ----------
function baseProductosDefault(){
  return [
    {name:'Plátano macho maduro', mode:'caja'},
    {name:'Plátano macho verde', mode:'caja'},
    {name:'Guineo', mode:'caja'},
    {name:'Aguacate granel', mode:'kg'},
    {name:'Aguacate Hass caja', mode:'caja'},
    {name:'Mango', mode:'kg'},
    {name:'Cilantro', mode:'manojo'},
    {name:'Perejil', mode:'manojo'},
    {name:'Apio', mode:'manojo'},
    {name:'Yuca', mode:'kg'},
    {name:'Ñame', mode:'kg'},
    {name:'Eddo', mode:'kg'},
    {name:'Jengibre', mode:'kg'},
    {name:'Lima caja', mode:'caja'},
    {name:'Limón', mode:'kg'},
    {name:'Naranja zumo', mode:'kg'},
    {name:'Naranja mesa', mode:'kg'},
    {name:'Manzana Pink Lady', mode:'kg'},
    {name:'Manzana Golden', mode:'kg'},
    {name:'Manzana Royal Gala', mode:'kg'},
    {name:'Pera Rincón del Soto', mode:'kg'},
    {name:'Pera Conferencia', mode:'kg'},
    {name:'Tomate Daniela', mode:'kg'},
    {name:'Tomate Rama', mode:'kg'},
    {name:'Tomate Pera', mode:'kg'},
    {name:'Cebolla normal', mode:'kg'},
    {name:'Cebolla dulce', mode:'kg'},
    {name:'Boniato', mode:'kg'},
    {name:'Auyama', mode:'kg'},
    {name:'Brócoli', mode:'kg'}
  ];
}
function ensureProductos(){
  if(!Array.isArray(productos) || productos.length===0){
    productos = baseProductosDefault();
    localStorage.setItem(K_PRODUCTOS, JSON.stringify(productos));
  }
}
function renderProductos(){
  listaProductos.innerHTML = '';
  if(productos.length===0){
    listaProductos.innerHTML = `<div class="item"><span>No hay productos.</span></div>`;
    return;
  }
  productos.forEach((p, idx)=>{
    const last = priceHist[p.name] ?? null;
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div>
        <strong>${p.name}</strong> <span class="meta">· modo: ${p.mode||'-'} ${last?`· último precio: ${money(last)}`:''}</span>
      </div>
      <div>
        <button class="btn" data-e="edit" data-i="${idx}">Editar</button>
        <button class="btn ghost" data-e="del" data-i="${idx}">Borrar</button>
      </div>
    `;
    listaProductos.appendChild(div);
  });
  listaProductos.querySelectorAll('button').forEach(b=>{
    const i = +b.dataset.i;
    b.addEventListener('click', ()=>{
      if(b.dataset.e==='del'){
        if(confirm('¿Eliminar producto?')){
          productos.splice(i,1);
          localStorage.setItem(K_PRODUCTOS, JSON.stringify(productos));
          renderProductos();
        }
      } else {
        const p = productos[i];
        const name = prompt('Nombre del producto', p.name||'') ?? p.name;
        const mode = prompt('Modo por defecto (kg/unidad/caja/manojo)', p.mode||'') ?? p.mode;
        productos[i] = {name, mode};
        localStorage.setItem(K_PRODUCTOS, JSON.stringify(productos));
        renderProductos();
      }
    });
  });
}
btnAddProducto?.addEventListener('click', ()=>{
  const name = prompt('Nombre del producto');
  if(!name) return;
  const mode = prompt('Modo por defecto (kg/unidad/caja/manojo)','kg') || 'kg';
  productos.push({name, mode});
  localStorage.setItem(K_PRODUCTOS, JSON.stringify(productos));
  renderProductos();
});
btnExportProductos?.addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(productos,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'productos-arslan-pro-v10.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});
btnImportProductos?.addEventListener('click', ()=>{
  const inp = document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange = e=>{
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result);
        if(Array.isArray(data)){ productos = data; localStorage.setItem(K_PRODUCTOS, JSON.stringify(productos)); renderProductos(); }
        else alert('JSON inválido');
      }catch(err){ alert('No se pudo leer el JSON'); }
    };
    reader.readAsText(f);
  };
  inp.click();
});

// ---------- LÍNEAS + SUGERENCIAS ----------
function lineaHTML(name='', mode='', qty=1, price=0){
  const wrap = document.createElement('div');
  wrap.className = 'linea';
  wrap.innerHTML = `
    <div class="suggest-box">
      <input class="name" placeholder="Producto" value="${name}">
      <div class="suggest-list" hidden></div>
    </div>
    <input class="mode" placeholder="Modo (kg/unidad/caja/manojo)" value="${mode}">
    <input class="qty" type="number" inputmode="numeric" min="0" step="1" placeholder="Cant." value="${qty}">
    <input class="price" type="number" min="0" step="0.01" placeholder="€/unidad" value="${price}">
    <button class="del">Eliminar</button>
  `;

  const nameInp = wrap.querySelector('.name');
  const list = wrap.querySelector('.suggest-list');
  const modeInp = wrap.querySelector('.mode');
  const priceInp = wrap.querySelector('.price');

  // Sugerencias: mostrar al teclear, sin autocompletar; aplica solo si clicas
  nameInp.addEventListener('input', ()=>{
    const q = nameInp.value.trim().toLowerCase();
    if(!q){ list.hidden = true; list.innerHTML = ''; return; }
    const matches = productos.filter(p=>p.name.toLowerCase().includes(q)).slice(0,8);
    if(matches.length===0){ list.hidden=true; list.innerHTML=''; return; }
    list.innerHTML = '';
    matches.forEach(p=>{
      const btn = document.createElement('button');
      const last = priceHist[p.name];
      btn.textContent = p.name + (last ? `  · último: ${money(last)}` : '');
      btn.addEventListener('click', ()=>{
        nameInp.value = p.name; // eliges la sugerencia
        if(!modeInp.value) modeInp.value = p.mode || '';
        if(last!=null && !priceInp.value) priceInp.value = String(last).replace('.', ','); // sólo si vacío
        list.hidden = true;
        recalc();
      });
      list.appendChild(btn);
    });
    list.hidden = false;
  });
  nameInp.addEventListener('blur', ()=> setTimeout(()=>list.hidden=true, 150));

  wrap.querySelector('.del').addEventListener('click', ()=>{ wrap.remove(); recalc(); });
  wrap.querySelectorAll('input').forEach(i=>i.addEventListener('input', ()=>{
    if(i.classList.contains('qty')){
      const v = Math.max(0, Math.floor(parseNum(i.value)));
      i.value = v;
    }
    recalc();
  }));
  return wrap;
}
function addLinea(name='', mode='', qty=1, price=0){
  const el = lineaHTML(name, mode, qty, price);
  lineasDiv.appendChild(el);
  recalc();
}
btnAddLinea.addEventListener('click', ()=>addLinea());
btnVaciarLineas.addEventListener('click', ()=>{ if(confirm('¿Vaciar todas las líneas?')){ lineasDiv.innerHTML=''; recalc(); } });

// ---------- CÁLCULO ----------
function getLineas(){
  return $$('.linea').map(r=>{
    return {
      name: r.querySelector('.name').value.trim(),
      mode: r.querySelector('.mode').value.trim(),
      qty: Math.max(0, Math.floor(parseNum(r.querySelector('.qty').value))),
      price: parseNum(r.querySelector('.price').value)
    };
  }).filter(l=>l.name && l.qty>0);
}
function recalc(){
  const ls = getLineas();
  let subtotal = 0;
  ls.forEach(l=> subtotal += l.qty * l.price);

  const transporte = chkTransporte.checked ? subtotal*0.10 : 0;
  const baseMasTrans = subtotal + transporte;

  const iva = baseMasTrans * 0.04; // informativo
  const total = baseMasTrans;
  const pagado = parseNum(pagadoInp.value);
  const pendiente = Math.max(0, total - pagado);

  subtotalEl.textContent = money(subtotal);
  transpEl.textContent = money(transporte);
  ivaEl.textContent = money(iva);
  totalEl.textContent = money(total);
  mostPagadoEl.textContent = money(pagado);
  pendienteEl.textContent = money(pendiente);

  fillPrint(ls, {subtotal, transporte, iva, total});
}
[chkTransporte, chkIvaIncluido, estado, pagadoInp].forEach(el=>el.addEventListener('input', recalc));

// ---------- GUARDAR / NUMERO ----------
function genNumFactura(){
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `FA-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function unMoney(s){ return parseFloat(String(s).replace(/\./g,'').replace(',','.').replace(/[^\d.]/g,'')) || 0; }

btnGuardar.addEventListener('click', ()=>{
  const ls = getLineas();
  if(ls.length===0){ alert('Añade al menos una línea.'); return; }
  const numero = genNumFactura();
  const now = new Date().toISOString();

  // recordar últimos precios por producto
  ls.forEach(l=>{
    if(l.name && l.price>0){ priceHist[l.name] = l.price; }
  });
  localStorage.setItem(K_PRICEHIST, JSON.stringify(priceHist));

  const subtotal = unMoney(subtotalEl.textContent);
  const transporte = unMoney(transpEl.textContent);
  const iva = unMoney(ivaEl.textContent);
  const total = unMoney(totalEl.textContent);
  const pagado = parseNum(pagadoInp.value);
  const pendiente = Math.max(0, total - pagado);

  const factura = {
    numero, fecha: now,
    proveedor: {...Object.fromEntries(Object.entries(prov).map(([k,el])=>[k,el.value]))},
    cliente: {...Object.fromEntries(Object.entries(cli).map(([k,el])=>[k,el.value]))},
    lineas: ls,
    transporte: chkTransporte.checked,
    ivaIncluido: chkIvaIncluido.checked,
    estado: estado.value,
    metodo: metodoPago.value,
    obs: observaciones.value,
    totals: {subtotal, transporte, iva, total, pagado, pendiente}
  };

  facturas.unshift(factura);
  localStorage.setItem(K_FACTURAS, JSON.stringify(facturas));
  alert(`Factura ${numero} guardada.`);
  renderFacturas(); renderResumen();
  fillPrint(ls, {subtotal, transporte, iva, total}, factura);
});

// ---------- NUEVA ----------
btnNueva.addEventListener('click', ()=>{
  lineasDiv.innerHTML = '';
  addLinea();
  chkTransporte.checked = false;
  chkIvaIncluido.checked = true;
  estado.value = 'pendiente';
  pagadoInp.value = '';
  metodoPago.value = 'Efectivo';
  observaciones.value = '';
  recalc();
});

// ---------- IMPRIMIR ----------
btnImprimir.addEventListener('click', ()=> window.print());

// ---------- FACTURAS LISTA (con colores y PDF) ----------
function badgeEstado(f){
  if(f.estado==='pagado') return `<span class="badge ok">Pagada</span>`;
  if(f.estado==='parcial'){
    const resta = Math.max(0,(f.totals?.total||0)-(f.totals?.pagado||0));
    return `<span class="badge warn">Parcial · resta ${money(resta)}</span>`;
  }
  return `<span class="badge bad">Impagada</span>`;
}
function renderFacturas(){
  listaFacturas.innerHTML = '';
  const q = (buscaCliente.value||'').toLowerCase();
  const fe = filtroEstado.value;

  let arr = facturas.slice();
  if(fe!=='todas') arr = arr.filter(f=>f.estado===fe);
  if(q) arr = arr.filter(f=>(f.cliente?.nombre||'').toLowerCase().includes(q));

  if(arr.length===0){
    listaFacturas.innerHTML = `<div class="item"><span>No hay facturas.</span></div>`;
    return;
  }

  arr.slice(0,100).forEach((f,idx)=>{
    const div = document.createElement('div');
    div.className = 'item';
    const fecha = new Date(f.fecha).toLocaleString();
    div.innerHTML = `
      <div>
        <strong>${f.numero}</strong> ${badgeEstado(f)}
        <div class="meta">${fecha} · ${f.cliente?.nombre||''}</div>
      </div>
      <div class="row-inline">
        <strong>${money(f.totals.total)}</strong>
        <button class="btn" data-e="ver" data-i="${idx}">Ver</button>
        <button class="btn ghost" data-e="pdf" data-i="${idx}">PDF</button>
      </div>
    `;
    listaFacturas.appendChild(div);
  });

  // Acciones ver/pdf
  listaFacturas.querySelectorAll('button').forEach(b=>{
    const i = +b.dataset.i;
    b.addEventListener('click', ()=>{
      const f = facturas[i];
      // Relleno el printArea con los datos guardados
      fillPrint(f.lineas, f.totals, f);
      if(b.dataset.e==='pdf'){
        window.print();
      }else{
        // Solo mostrar: hago scroll al documento
        switchTab('factura');
        document.getElementById('printArea').scrollIntoView({behavior:'smooth'});
      }
    });
  });
}
[filtroEstado, buscaCliente].forEach(el=>el?.addEventListener('input', renderFacturas));

// ---------- RESUMEN ----------
function renderResumen(){
  const totalPend = facturas.reduce((acc,f)=>acc + (f.totals?.pendiente||0), 0);
  resGlobal.textContent = money(totalPend);

  const map = new Map();
  facturas.forEach(f=>{
    const nom = f.cliente?.nombre || '(s/cliente)';
    const pend = f.totals?.pendiente || 0;
    map.set(nom, (map.get(nom)||0) + pend);
  });
  resPorCliente.innerHTML = '';
  if(map.size===0){
    resPorCliente.innerHTML = `<div class="item"><span>No hay deudas registradas.</span></div>`;
    return;
  }
  [...map.entries()].sort((a,b)=>b[1]-a[1]).forEach(([nom,pend])=>{
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `<div><strong>${nom}</strong></div><div><strong>${money(pend)}</strong></div>`;
    resPorCliente.appendChild(div);
  });
}

btnResetCliente.addEventListener('click', ()=>{
  const i = selCliente.value;
  if(i===''){ alert('Selecciona un cliente en la pestaña Factura.'); return; }
  const nombre = (clientes[+i]?.nombre)||'';
  if(!nombre){ alert('Cliente sin nombre.'); return; }
  if(!confirm(`¿Resetear deudas del cliente "${nombre}"?`)) return;

  facturas = facturas.map(f=>{
    if((f.cliente?.nombre||'')===nombre){
      const nuevo = JSON.parse(JSON.stringify(f));
      const total = nuevo.totals?.total || 0;
      nuevo.totals.pagado = total;
      nuevo.totals.pendiente = 0;
      nuevo.estado = 'pagado';
      return nuevo;
    }
    return f;
  });
  localStorage.setItem(K_FACTURAS, JSON.stringify(facturas));
  renderFacturas(); renderResumen();
});
btnResetGlobal.addEventListener('click', ()=>{
  if(!confirm('¿Resetear TODAS las deudas (marcar todas como pagadas)?')) return;
  facturas = facturas.map(f=>{
    const nuevo = JSON.parse(JSON.stringify(f));
    const total = nuevo.totals?.total || 0;
    nuevo.totals.pagado = total;
    nuevo.totals.pendiente = 0;
    nuevo.estado = 'pagado';
    return nuevo;
  });
  localStorage.setItem(K_FACTURAS, JSON.stringify(facturas));
  renderFacturas(); renderResumen();
});

// ---------- IMPRESIÓN ----------
function fillPrint(lines, totals, factura=null){
  pNum.textContent = factura?.numero || '(Sin guardar)';
  const d = factura ? new Date(factura.fecha) : new Date();
  pFecha.textContent = d.toLocaleString();

  pProv.innerHTML = `
    <div><strong>${(factura?.proveedor?.nombre)||prov.nombre.value||''}</strong></div>
    <div>${(factura?.proveedor?.nif)||prov.nif.value||''}</div>
    <div>${(factura?.proveedor?.dir)||prov.dir.value||''}</div>
    <div>${(factura?.proveedor?.tel)||prov.tel.value||''} · ${(factura?.proveedor?.email)||prov.email.value||''}</div>
  `;
  pCli.innerHTML = `
    <div><strong>${(factura?.cliente?.nombre)||cli.nombre.value||''}</strong></div>
    <div>${(factura?.cliente?.nif)||cli.nif.value||''}</div>
    <div>${(factura?.cliente?.dir)||cli.dir.value||''}</div>
    <div>${(factura?.cliente?.tel)||cli.tel.value||''} · ${(factura?.cliente?.email)||cli.email.value||''}</div>
  `;

  pTabla.innerHTML = '';
  (lines||[]).forEach(l=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(l.name)}</td>
      <td>${escapeHTML(l.mode||'')}</td>
      <td>${l.qty}</td>
      <td>${money(l.price)}</td>
      <td>${money(l.qty*l.price)}</td>
    `;
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
function escapeHTML(s=''){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

// ---------- INICIO ----------
function boot(){
  // Semillas
  if(clientes.length===0){
    clientes = [
      {nombre:'Riviera', nif:'B16794893', dir:'Paseo del Espolón, Burgos', tel:'', email:''},
      {nombre:'Alesal Pan y Café S.L', nif:'B09582420', dir:'C/ San Lesmes 1', tel:'', email:''}
    ];
    localStorage.setItem(K_CLIENTES, JSON.stringify(clientes));
  }
  ensureProductos();

  renderClientesSelect();
  renderClientesLista();
  renderProductos();
  renderFacturas();
  renderResumen();

  if($$('.linea').length===0) addLinea();
  recalc();
}
boot();
