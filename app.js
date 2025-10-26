/* ARSLAN PRO V9 · Blanco & Negro · Logo KIW
   - Cantidades solo enteros
   - Transporte +10% opcional
   - IVA 4% mostrado (ya incluido si está marcado)
   - Estados: pendiente / parcial / pagado
   - Guardado en localStorage (clientes y facturas)
   - Imprime solo el documento de factura (print CSS)
*/

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = n => (isNaN(n)?0:n).toFixed(2).replace('.', ',') + " €";
const parseNum = v => {
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

// Storage keys
const K_CLIENTES = 'apv9_clientes';
const K_FACTURAS = 'apv9_facturas';

// Estado en memoria
let clientes = JSON.parse(localStorage.getItem(K_CLIENTES) || '[]');
let facturas = JSON.parse(localStorage.getItem(K_FACTURAS) || '[]');

// ELEMENTOS
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

// Proveedor & Cliente inputs
const prov = {
  nombre: $('#provNombre'),
  nif: $('#provNif'),
  dir: $('#provDir'),
  tel: $('#provTel'),
  email: $('#provEmail'),
};
const cli = {
  nombre: $('#cliNombre'),
  nif: $('#cliNif'),
  dir: $('#cliDir'),
  tel: $('#cliTel'),
  email: $('#cliEmail'),
};

// PRINT refs
const pNum = $('#p-num'), pFecha = $('#p-fecha');
const pProv = $('#p-prov'), pCli = $('#p-cli');
const pTabla = $('#p-tabla tbody');
const pSub = $('#p-sub'), pTra = $('#p-tra'), pIva = $('#p-iva'), pTot = $('#p-tot');
const pEstado = $('#p-estado'), pMetodo = $('#p-metodo'), pObs = $('#p-obs');

// ---------- UI BASICA
function switchTab(id){
  $$('.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  $$('.panel').forEach(p=>p.classList.toggle('active', p.dataset.tabPanel===id));
}
$$('.tab').forEach(b=>b.addEventListener('click', ()=>switchTab(b.dataset.tab)));

// ---------- CLIENTES
function renderClientesSelect(){
  // Asegurar opción inicial
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
        // editar
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
btnNuevoCliente.addEventListener('click', ()=>{
  switchTab('clientes');
});
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

// ---------- LINEAS
function lineaHTML(name='', mode='', qty=1, price=0){
  const wrap = document.createElement('div');
  wrap.className = 'linea';
  wrap.innerHTML = `
    <input class="name" placeholder="Producto" value="${name}">
    <input class="mode" placeholder="Modo (kg/unidad/caja)" value="${mode}">
    <input class="qty" type="number" inputmode="numeric" min="0" step="1" placeholder="Cant." value="${qty}">
    <input class="price" type="number" min="0" step="0.01" placeholder="€/unidad" value="${price}">
    <button class="del">Eliminar</button>
  `;
  wrap.querySelector('.del').addEventListener('click', ()=>{ wrap.remove(); recalc(); });
  wrap.querySelectorAll('input').forEach(i=>i.addEventListener('input', e=>{
    // Forzar enteros en Cantidad
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
btnVaciarLineas.addEventListener('click', ()=>{
  if(confirm('¿Vaciar todas las líneas?')){ lineasDiv.innerHTML=''; recalc(); }
});

// ---------- CALCULO
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

  // IVA mostrado
  const iva = baseMasTrans * 0.04; // solo informativo
  const total = baseMasTrans; // TOTAL final
  const pagado = parseNum(pagadoInp.value);
  const pendiente = Math.max(0, total - pagado);

  subtotalEl.textContent = money(subtotal);
  transpEl.textContent = money(transporte);
  ivaEl.textContent = money(iva);
  totalEl.textContent = money(total);
  mostPagadoEl.textContent = money(pagado);
  pendienteEl.textContent = money(pendiente);

  // Rellenar área de impresión
  fillPrint(ls, {subtotal, transporte, iva, total});
}
[chkTransporte, chkIvaIncluido, estado, pagadoInp].forEach(el=>el.addEventListener('input', recalc));

// ---------- GUARDAR FACTURA
function genNumFactura(){
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `FA-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

btnGuardar.addEventListener('click', ()=>{
  const ls = getLineas();
  if(ls.length===0){ alert('Añade al menos una línea.'); return; }
  const numero = genNumFactura();
  const now = new Date().toISOString();

  const subtotal = unMoney(subtotalEl.textContent);
  const transporte = unMoney(transpEl.textContent);
  const iva = unMoney(ivaEl.textContent);
  const total = unMoney(totalEl.textContent);
  const pagado = unMoney(mostPagadoEl.textContent);
  const pendiente = unMoney(pendienteEl.textContent);

  const factura = {
    numero, fecha: now,
    proveedor: {
      nombre: prov.nombre.value, nif: prov.nif.value, dir: prov.dir.value, tel: prov.tel.value, email: prov.email.value
    },
    cliente: {
      nombre: cli.nombre.value, nif: cli.nif.value, dir: cli.dir.value, tel: cli.tel.value, email: cli.email.value
    },
    lineas: ls, transporte: chkTransporte.checked,
    ivaIncluido: chkIvaIncluido.checked,
    estado: estado.value, metodo: metodoPago.value,
    obs: observaciones.value,
    totals: {subtotal, transporte, iva, total, pagado, pendiente}
  };

  facturas.unshift(factura);
  localStorage.setItem(K_FACTURAS, JSON.stringify(facturas));
  alert(`Factura ${numero} guardada.`);
  renderFacturas();
  renderResumen();
  fillPrint(ls, {subtotal, transporte, iva, total}, factura);
});

function unMoney(s){
  // "1.234,56 €" o "123,45 €"
  return parseFloat(String(s).replace(/\./g,'').replace(',','.').replace(/[^\d.]/g,'')) || 0;
}

// ---------- NUEVA FACTURA
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

// ---------- IMPRIMIR
btnImprimir.addEventListener('click', ()=> window.print());

// ---------- FACTURAS LISTA
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

  arr.forEach(f=>{
    const div = document.createElement('div');
    div.className = 'item';
    const fecha = new Date(f.fecha).toLocaleString();
    div.innerHTML = `
      <div>
        <strong>${f.numero}</strong>
        <div class="meta">${fecha} · ${f.cliente?.nombre||''} · Estado: ${f.estado}</div>
      </div>
      <div>
        <strong>${money(f.totals.total)}</strong>
      </div>
    `;
    listaFacturas.appendChild(div);
  });
}
[filtroEstado, buscaCliente].forEach(el=>el?.addEventListener('input', renderFacturas));

$('#btnExportJSON')?.addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(facturas,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'facturas-arslan-pro-v9.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

// ---------- RESUMEN
function renderResumen(){
  // Total global pendiente
  const totalPend = facturas.reduce((acc,f)=>acc + (f.totals?.pendiente||0), 0);
  resGlobal.textContent = money(totalPend);

  // Pendiente por cliente
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

// ---------- RELLENAR DOCUMENTO IMPRESION
function fillPrint(lines, totals, factura=null){
  // numero y fecha
  pNum.textContent = factura?.numero || '(Sin guardar)';
  const d = factura ? new Date(factura.fecha) : new Date();
  pFecha.textContent = d.toLocaleString();

  // proveedor
  pProv.innerHTML = `
    <div><strong>${prov.nombre.value||''}</strong></div>
    <div>${prov.nif.value||''}</div>
    <div>${prov.dir.value||''}</div>
    <div>${prov.tel.value||''} · ${prov.email.value||''}</div>
  `;

  // cliente
  pCli.innerHTML = `
    <div><strong>${cli.nombre.value||''}</strong></div>
    <div>${cli.nif.value||''}</div>
    <div>${cli.dir.value||''}</div>
    <div>${cli.tel.value||''} · ${cli.email.value||''}</div>
  `;

  // tabla
  pTabla.innerHTML = '';
  lines.forEach(l=>{
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

  pSub.textContent = money(totals.subtotal||0);
  pTra.textContent = money(totals.transporte||0);
  pIva.textContent = money(totals.iva||0);
  pTot.textContent = money(totals.total||0);

  pEstado.textContent = factura?.estado || estado.value;
  pMetodo.textContent = factura?.metodo || metodoPago.value;
  pObs.textContent = factura?.obs || (observaciones.value||'—');
}

function escapeHTML(s=''){
  return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

// ---------- INICIO
function boot(){
  if(clientes.length===0){
    // cliente ejemplo
    clientes = [
      {nombre:'Riviera', nif:'B16794893', dir:'Paseo del Espolón, Burgos', tel:'', email:''},
      {nombre:'Alesal Pan y Café S.L', nif:'B09582420', dir:'C/ San Lesmes 1', tel:'', email:''}
    ];
    localStorage.setItem(K_CLIENTES, JSON.stringify(clientes));
  }
  renderClientesSelect();
  renderClientesLista();
  renderFacturas();
  renderResumen();
  if($$('.linea').length===0) addLinea();
  recalc();
}
boot();

