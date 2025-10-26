/* ARSLAN PRO V13 — Completo (patch 13.1)
   - Tabs por clic
   - Productos: mode, boxKg, price; sugerencias sin autocompletar; import/export
   - Clientes: alta/edita/borra; import/export
   - Factura: líneas; caja => qty*boxKg*price; transporte +10%; IVA 4% (incluido o añadido); estados
   - Historial de precios (últimos 10)
   - Facturas: lista con colores; ver/PDF; import/export
   - Resumen: total global, por cliente; reset deudas
   - localStorage: todo offline
   - Nuevo:
     * chkIvaIncluido afecta cálculos (incluido vs. añadido)
     * exportClientesFacturados()
     * cargarFacturaEnFormulario(numero)
*/

document.addEventListener('DOMContentLoaded', () => {
  /* ---------- HELPERS ---------- */
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const money = n => (isNaN(n)?0:n).toFixed(2).replace('.', ',') + " €";
  const parseNum = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
  const escapeHTML = s => String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const safeJSON = (k, def) => { try{ const raw=localStorage.getItem(k); return raw?JSON.parse(raw):def; }catch{ return def; } };

  // Keys
  const K_CLIENTES='apv13_clientes', K_PRODUCTOS='apv13_productos', K_FACTURAS='apv13_facturas', K_PRICEHIST='apv13_pricehist';

  // Estado
  let clientes = safeJSON(K_CLIENTES, []);
  let productos = safeJSON(K_PRODUCTOS, []); // {name, mode, boxKg, price}
  let facturas  = safeJSON(K_FACTURAS,  []);
  let priceHist = safeJSON(K_PRICEHIST, {}); // {name: [{price,date}, ...]}

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

  // DOM: listas
  const listaClientes = $('#listaClientes');
  const btnAddCliente = $('#btnAddCliente'); const btnExportClientes = $('#btnExportClientes'); const btnImportClientes = $('#btnImportClientes');

  const filtroEstado = $('#filtroEstado'); const buscaCliente = $('#buscaCliente'); const listaFacturas = $('#listaFacturas');
  const btnExportFacturas = $('#btnExportFacturas'); const btnImportFacturas = $('#btnImportFacturas');

  const resGlobal = $('#resGlobal'); const resPorCliente = $('#resPorCliente');
  const btnResetCliente = $('#btnResetCliente'); const btnResetGlobal = $('#btnResetGlobal');

  const listaProductos = $('#listaProductos'); const btnAddProducto = $('#btnAddProducto');
  const btnExportProductos = $('#btnExportProductos'); const btnImportProductos = $('#btnImportProductos');

  // PRINT refs
  const pNum=$('#p-num'), pFecha=$('#p-fecha'), pProv=$('#p-prov'), pCli=$('#p-cli'), pTabla=$('#p-tabla tbody');
  const pSub=$('#p-sub'), pTra=$('#p-tra'), pIva=$('#p-iva'), pTot=$('#p-tot'), pEstado=$('#p-estado'), pMetodo=$('#p-metodo'), pObs=$('#p-obs');

  // Historial panel
  const pricePanel = $('#pricePanel'), ppBody = $('#ppBody');

  /* ---------- NAVEGACIÓN ---------- */
  function switchTab(id){
    $$('button.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
    $$('section.panel').forEach(p=>p.classList.toggle('active', p.dataset.tabPanel===id));
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
          <button class="btn" data-e="edit" data-i="${idx}">Editar</button>
          <button class="btn ghost" data-e="del" data-i="${idx}">Borrar</button>
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
  btnExportClientes?.addEventListener('click', ()=>downloadJSON(clientes,'clientes-apv13.json'));
  btnImportClientes?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ clientes=arr; saveClientes(); renderClientesSelect(); renderClientesLista(); } }));

  selCliente?.addEventListener('change', ()=>{
    const i = selCliente.value; if(i==='') return;
    const c = clientes[+i]; if(!c) return;
    cli.nombre.value=c.nombre||''; cli.nif.value=c.nif||''; cli.dir.value=c.dir||''; cli.tel.value=c.tel||''; cli.email.value=c.email||'';
  });

  /* ---------- PRODUCTOS ---------- */
  function saveProductos(){ localStorage.setItem(K_PRODUCTOS, JSON.stringify(productos)); }
  function ensureProductos(){ if(!Array.isArray(productos)) productos=[]; saveProductos(); }
  function lastPrice(name){ const arr = priceHist[name]; return arr?.length ? arr[0].price : null; }
  function renderProductos(){
    listaProductos.innerHTML=''; if(productos.length===0){ listaProductos.innerHTML=`<div class="item">Sin productos. Usa “Añadir” o Importar JSON.</div>`; return; }
    productos.forEach((p,idx)=>{
      const last = lastPrice(p.name);
      const div = document.createElement('div');
      div.className='item';
      div.innerHTML = `
        <div>
          <strong>${escapeHTML(p.name)}</strong>
          <div class="meta">modo: ${escapeHTML(p.mode||'-')} · kg/caja: ${p.boxKg??'-'} · precio base: ${p.price!=null?money(p.price):'-'} ${last?`· último: ${money(last)}`:''}</div>
        </div>
        <div>
          <button class="btn" data-e="edit" data-i="${idx}">Editar</button>
          <button class="btn ghost" data-e="del" data-i="${idx}">Borrar</button>
        </div>`;
      listaProductos.appendChild(div);
    });
    listaProductos.querySelectorAll('button').forEach(b=>{
      const i=+b.dataset.i;
      b.addEventListener('click', ()=>{
        if(b.dataset.e==='del'){
          if(confirm('¿Eliminar producto?')){ productos.splice(i,1); saveProductos(); renderProductos(); }
        } else {
          const p = productos[i];
          const name = prompt('Nombre', p.name||'') ?? p.name;
          const mode = (prompt('Modo (kg/unidad/caja/manojo)', p.mode||'kg') ?? p.mode)||'kg';
          const boxKg = prompt('Kg por caja (si aplica, ej. 22)', p.boxKg??'');
          const boxKgNum = (boxKg===''||boxKg===null)?null:parseNum(boxKg);
          const price = prompt('Precio base (€ por unidad o €/kg si caja)', p.price!=null?p.price:'');
          const priceNum = (price===''||price===null)?null:parseNum(price);
          productos[i]={name,mode: String(mode).toLowerCase(),boxKg:boxKgNum,price:priceNum}; saveProductos(); renderProductos();
        }
      });
    });
  }
  btnAddProducto?.addEventListener('click', ()=>{
    const name = prompt('Nombre del producto:'); if(!name) return;
    const mode = (prompt('Modo (kg/unidad/caja/manojo)','kg')||'kg').toLowerCase();
    const boxKg = prompt('Kg por caja (si aplica, ej. 22)',''); const boxKgNum = boxKg?parseNum(boxKg):null;
    const price = prompt('Precio base (€ por unidad o €/kg si caja)',''); const priceNum = price?parseNum(price):null;
    productos.push({name,mode,boxKg:boxKgNum,price:priceNum}); saveProductos(); renderProductos();
  });
  btnExportProductos?.addEventListener('click', ()=>downloadJSON(productos,'productos-apv13.json'));
  btnImportProductos?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ productos=arr; saveProductos(); renderProductos(); } }));

  /* ---------- SUGERENCIAS & LÍNEAS ---------- */
  function lineaHTML(name='', mode='', qty=1, price=0){
    const wrap = document.createElement('div');
    wrap.className='linea';
    wrap.innerHTML = `
      <div class="suggest-box">
        <input class="name" placeholder="Producto" value="${escapeHTML(name)}">
        <div class="suggest-list" hidden></div>
      </div>
      <input class="mode" placeholder="Modo (kg/unidad/caja/manojo)" value="${escapeHTML(mode)}">
      <input class="qty" type="number" inputmode="numeric" min="0" step="1" placeholder="Cant." value="${qty}">
      <input class="price" type="number" min="0" step="0.01" placeholder="€/unidad o €/kg" value="${price||''}">
      <button class="del">Eliminar</button>
    `;
    const nameInp=wrap.querySelector('.name'), list=wrap.querySelector('.suggest-list'), modeInp=wrap.querySelector('.mode'), priceInp=wrap.querySelector('.price');

    nameInp.addEventListener('input', ()=>{
      const q = nameInp.value.trim().toLowerCase(); if(!q){ list.hidden=true; list.innerHTML=''; return; }
      const matches = productos.filter(p=>p.name.toLowerCase().includes(q)).slice(0,10);
      if(matches.length===0){ list.hidden=true; list.innerHTML=''; return; }
      list.innerHTML='';
      matches.forEach(p=>{
        const last=lastPrice(p.name);
        const btn=document.createElement('button');
        btn.type='button';
        btn.textContent = `${p.name} ${p.mode?`· ${p.mode}`:''} ${p.boxKg?`· ${p.boxKg}kg/caja`:''} ${p.price!=null?`· base ${money(p.price)}`:''} ${last?`· último ${money(last)}`:''}`;
        btn.addEventListener('click', ()=>{
          nameInp.value=p.name;
          if(!modeInp.value) modeInp.value=p.mode||'';
          if(p.price!=null && !priceInp.value) priceInp.value=String(p.price).replace('.',',');
          list.hidden=true; showPricePanel(p.name); recalc();
        });
        list.appendChild(btn);
      });
      list.hidden=false;
    });
    nameInp.addEventListener('focus', ()=>{ if(nameInp.value) nameInp.dispatchEvent(new Event('input')); });
    nameInp.addEventListener('blur', ()=> setTimeout(()=>list.hidden=true,150));
    nameInp.addEventListener('dblclick', ()=>{ if(nameInp.value.trim()) showPricePanel(nameInp.value.trim()); });

    wrap.querySelector('.del').addEventListener('click', ()=>{ wrap.remove(); recalc(); });
    wrap.querySelectorAll('input').forEach(i=>i.addEventListener('input', ()=>{
      if(i.classList.contains('qty')){ const v=Math.max(0,Math.floor(parseNum(i.value))); i.value=v; }
      recalc();
    }));
    return wrap;
  }
  function addLinea(name='', mode='', qty=1, price=0){ const el=lineaHTML(name,mode,qty,price); lineasDiv.appendChild(el); recalc(); }
  btnAddLinea?.addEventListener('click', ()=>addLinea());
  btnVaciarLineas?.addEventListener('click', ()=>{ if(confirm('¿Vaciar todas las líneas?')){ lineasDiv.innerHTML=''; recalc(); } });

  function getLineas(){
    return $$('.linea').map(r=>{
      return {
        name: r.querySelector('.name').value.trim(),
        mode: r.querySelector('.mode').value.trim().toLowerCase(),
        qty: Math.max(0, Math.floor(parseNum(r.querySelector('.qty').value))),
        price: parseNum(r.querySelector('.price').value)
      };
    }).filter(l=>l.name && l.qty>0);
  }

  function findProducto(name){ return productos.find(p=>(p.name||'').toLowerCase()===name.toLowerCase()); }
  function lineImporte(l){
    if(l.mode==='caja'){
      const p=findProducto(l.name); const kg=p?.boxKg||0; return l.qty*kg*l.price; // precio es €/kg
    }
    return l.qty*l.price; // kg/unidad/manojo: precio por unidad de modo
  }

  /* ---------- CÁLCULO ---------- */
  function recalc(){
    const ls = getLineas();
    let subtotal=0; ls.forEach(l=> subtotal+=lineImporte(l));

    const transporte = chkTransporte?.checked ? subtotal*0.10 : 0;
    const baseMasTrans = subtotal + transporte;

    // IVA 4% — si "incluido" => solo informativo; si NO incluido => se suma al total
    const ivaCalc = baseMasTrans * 0.04;
    const iva = chkIvaIncluido?.checked ? ivaCalc : ivaCalc; // mismo valor mostrado
    const total = chkIvaIncluido?.checked ? baseMasTrans : (baseMasTrans + ivaCalc);

    const pagado = parseNum(pagadoInp.value);
    const pendiente = Math.max(0, total - pagado);

    subtotalEl.textContent = money(subtotal);
    transpEl.textContent   = money(transporte);
    ivaEl.textContent      = money(iva);
    totalEl.textContent    = money(total);
    mostPagadoEl.textContent = money(pagado);
    pendienteEl.textContent  = money(pendiente);

    fillPrint(ls,{subtotal,transporte,iva,total});
  }
  [chkTransporte, chkIvaIncluido, estado, pagadoInp, metodoPago, observaciones].forEach(el=>el?.addEventListener('input', recalc));

  /* ---------- HISTORIAL PRECIOS ---------- */
  function savePriceHist(){ localStorage.setItem(K_PRICEHIST, JSON.stringify(priceHist)); }
  function pushPriceHistory(name, price){
    if(!name || !(price>0)) return;
    const arr = priceHist[name] || [];
    arr.unshift({price, date:new Date().toISOString()});
    priceHist[name] = arr.slice(0,10);
    savePriceHist();
  }
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
    const numero=genNumFactura(); const now=new Date().toISOString();

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
    lineasDiv.innerHTML=''; addLinea();
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
          <button class="btn" data-e="ver" data-i="${idx}">Ver</button>
          <button class="btn ghost" data-e="pdf" data-i="${idx}">PDF</button>
        </div>`;
      listaFacturas.appendChild(div);
    });

    listaFacturas.querySelectorAll('button').forEach(b=>{
      const i=+b.dataset.i;
      b.addEventListener('click', ()=>{
        const f=facturas[i]; fillPrint(f.lineas,f.totals,f); switchTab('factura');
        if(b.dataset.e==='pdf'){ window.print(); } else { $('#printArea').scrollIntoView({behavior:'smooth'}); }
      });
    });
  }
  [filtroEstado, buscaCliente].forEach(el=>el?.addEventListener('input', renderFacturas));
  btnExportFacturas?.addEventListener('click', ()=>downloadJSON(facturas,'facturas-apv13.json'));
  btnImportFacturas?.addEventListener('click', ()=>uploadJSON(arr=>{ if(Array.isArray(arr)){ facturas=arr; saveFacturas(); renderFacturas(); renderResumen(); } }));

  /* ---------- RESUMEN ---------- */
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
    saveFacturas(); renderFacturas(); renderResumen();
  });
  btnResetGlobal?.addEventListener('click', ()=>{
    if(!confirm('¿Resetear TODAS las deudas?')) return;
    facturas=facturas.map(f=>{ const n={...f, totals:{...f.totals}}; const tot=n.totals.total||0; n.totals.pagado=tot; n.totals.pendiente=0; n.estado='pagado'; return n; });
    saveFacturas(); renderFacturas(); renderResumen();
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
        <td>${l.qty}</td>
        <td>${money(l.price)}</td>
        <td>${money(lineImporte(l))}</td>`;
      pTabla.appendChild(tr);
    });

    pSub.textContent = money(totals?.subtotal||0);
    pTra.textContent = money(totals?.transporte||0);
    pIva.textContent = money(totals?.iva||0);
    pTot.textContent = money(totals?.total||0);

    const ivaIncl = (factura?.ivaIncluido ?? chkIvaIncluido.checked);
    pEstado.textContent = (factura?.estado || estado.value) + (ivaIncl ? ' · IVA incluido' : ' · IVA añadido');
    pMetodo.textContent = factura?.metodo || metodoPago.value;
    pObs.textContent = factura?.obs || (observaciones.value||'—');
  }

  /* ---------- UTIL EXTRA ---------- */
  // Exporta clientes con al menos 1 factura
  function exportClientesFacturados(){
    const set = new Set(facturas.map(f=>(f.cliente?.nombre||'').trim()).filter(Boolean));
    const lista = clientes.filter(c=>set.has((c.nombre||'').trim()));
    downloadJSON(lista, 'clientes-facturados-apv13.json');
  }
  // Cargar una factura existente al formulario (por número exacto)
  function cargarFacturaEnFormulario(num){
    const f = facturas.find(x=>x.numero===num);
    if(!f){ alert('Factura no encontrada'); return; }
    // Proveedor y cliente
    ['nombre','nif','dir','tel','email'].forEach(k=>{
      if(prov[k]) prov[k].value = f.proveedor?.[k]||'';
      if(cli[k])  cli[k].value  = f.cliente?.[k]||'';
    });
    // Flags
    chkTransporte.checked = !!f.transporte;
    chkIvaIncluido.checked = !!f.ivaIncluido;
    estado.value = f.estado || 'pendiente';
    metodoPago.value = f.metodo || 'Efectivo';
    observaciones.value = f.obs || '';
    pagadoInp.value = (f.totals?.pagado ?? 0).toString().replace('.',',');

    // Líneas
    lineasDiv.innerHTML='';
    (f.lineas||[]).forEach(l=> addLinea(l.name, l.mode, l.qty, l.price));
    switchTab('factura'); recalc();
    $('#formArea')?.scrollIntoView({behavior:'smooth'});
  }

  // Exponer helpers opcionales (útiles mientras no haya botones en HTML)
  window.ARSLAN_PRO = {
    exportClientesFacturados,
    cargarFacturaEnFormulario
  };

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
    localStorage.setItem(K_CLIENTES, JSON.stringify(clientes));
  }
  ensureProductos();

  renderClientesSelect(); renderClientesLista();
  renderProductos(); renderFacturas(); renderResumen();

  if($$('.linea').length===0) addLinea();
  recalc();
});
