/* =======================================================
   ARSLAN PRO V10.5 — KIWI LITE (FULL)
   app.js — Parte 1/4
   - Helpers y estado
   - Semillas (clientes y productos)
   - Diseño: blanco y negro, sin azules
   - Corrección selector de clientes (por clave única, no índice)
   - Datalist de productos (autocompletado real)
======================================================= */
(() => {
  "use strict";

  /* =============== HELPERS =============== */
  const $  = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const money = (n) => (isNaN(n) ? 0 : n).toFixed(2).replace(".", ",") + " €";
  const parseNum = (v) => {
    const n = parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? 0 : n;
  };
  const fmtDateDMY = (d) =>
    `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  const todayISO = () => new Date().toISOString();
  const escapeHTML = (s) =>
    String(s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  // Genera una clave estable para cada cliente (evita errores por índices)
  const slug = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const clientKey = (c) => {
    // nombre + nif si existe, para evitar colisiones
    return slug(`${c?.nombre || ""}__${c?.nif || ""}`);
  };

  /* =============== STORAGE KEYS =============== */
  const K = {
    CLIENTES: "arslan_v105_clientes",
    PRODUCTOS: "arslan_v105_productos",
    FACTURAS: "arslan_v105_facturas",
    PRICEHIST: "arslan_v105_pricehist",
  };

  const load = (k, fb) => {
    try {
      const v = JSON.parse(localStorage.getItem(k) || "");
      return v ?? fb;
    } catch {
      return fb;
    }
  };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  /* =============== ESTADO GLOBAL =============== */
  let clientes = load(K.CLIENTES, []);   // [{nombre,nif,dir,tel,email,_key}]
  let productos = load(K.PRODUCTOS, []); // [{name,mode,boxKg,price,origin}]
  let facturas  = load(K.FACTURAS, []);  // [{...}]
  let priceHist = load(K.PRICEHIST, {}); // { [productName]: [{price,date}, ...] }

  /* =============== SPLASH Y TABS =============== */
  window.addEventListener("load", () => {
    setTimeout(() => { $("#splash")?.classList.add("fade"); }, 900);
  });

  function switchTab(id) {
    $$("header .tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
    $$("section.panel").forEach((p) => p.classList.toggle("active", p.dataset.tabPanel === id));
    // Los renders específicos de pestaña irán en Parte 4
  }
  $$("header .tab").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

  /* =============== SEMILLAS CLIENTES =============== */
  function uniqueByKey(arr) {
    const map = new Map();
    arr.forEach((c) => {
      const _key = clientKey(c);
      if (_key && !map.has(_key)) map.set(_key, { ...c, _key });
    });
    return [...map.values()];
  }

  function seedClientesIfEmpty() {
    if (clientes?.length) return;
    const seed = [
      { nombre: "Riviera — CONOR ESY SLU", nif: "B16794893", dir: "Paseo del Espolón, 09003 Burgos" },
      { nombre: "Alesal Pan / Café de Calle San Lesmes — Alesal Pan y Café S.L.", nif: "B09582420", dir: "C/ San Lesmes 1, Burgos" },
      { nombre: "Al Pan Pan Burgos, S.L.", nif: "B09569344", dir: "C/ Miranda 17, Bajo, 09002 Burgos", tel: "947 277 977", email: "bertiz.miranda@gmail.com" },
      { nombre: "Cuevas Palacios Restauración S.L. (Con/sentidos)", nif: "B10694792", dir: "C/ San Lesmes, 1 – 09004 Burgos", tel: "947 20 35 51" },
      { nombre: "Café Bar Nuovo (Einy Mercedes Olivo Jiménez)", nif: "120221393", dir: "C/ San Juan de Ortega 14, 09007 Burgos" },
      { nombre: "Hotel Cordon" },
      { nombre: "Vaivén Hostelería" },
      { nombre: "Grupo Resicare" },
      { nombre: "Carlos Alameda Peralta & Seis Más" },
      { nombre: "Tabalou Development SLU", nif: "ES B09567769" },
      { nombre: "Golden Garden — David Herrera Estalayo", nif: "71281665L", dir: "Trinidad, 12, 09003 Burgos" },
      { nombre: "Romina — PREMIER", dir: "C/ Madrid 42, Burgos" },
      { nombre: "Abbas — Locutorio Gamonal", dir: "C/ Derechos Humanos 45, Burgos" },
      { nombre: "Nadeem Bhai — RIA Locutorio", dir: "C/ Vitoria 137, Burgos" },
      { nombre: "Mehmood — Mohsin Telecom", dir: "C/ Vitoria 245, Burgos" },
      { nombre: "Adnan Asif", nif: "X7128589S", dir: "C/ Padre Flórez 3, Burgos" },
      { nombre: "Imran Khan — Estambul", dir: "Avda. del Cid, Burgos" },
      { nombre: "Waqas Sohail", dir: "C/ Vitoria, Burgos" },
      { nombre: "Malik — Locutorio Malik", dir: "C/ Progreso, Burgos" },
      { nombre: "Angela", dir: "C/ Madrid, Burgos" },
      { nombre: "Aslam — Locutorio Aslam", dir: "Avda. del Cid, Burgos" },
      { nombre: "Victor Pelu — Tienda Centro", dir: "Burgos Centro" },
      { nombre: "Domingo" },
      { nombre: "Bar Tropical" },
      { nombre: "Bar Punta Cana — PUNTA CANA", dir: "C/ Los Titos, Burgos" },
      { nombre: "Jose — Alimentación Patxi", dir: "C/ Camino Casa la Vega 33, Burgos" },
      { nombre: "Ideal — Ideal Supermercado", dir: "Avda. del Cid, Burgos" }
    ];
    clientes = uniqueByKey(seed);
    save(K.CLIENTES, clientes);
  }

  /* =============== SEMILLAS PRODUCTOS =============== */
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

  function seedProductsIfEmpty() {
    if (productos?.length) return;
    productos = PRODUCT_NAMES.map((n) => ({ name: n }));
    save(K.PRODUCTOS, productos);
  }

  /* =============== PROVEEDOR POR DEFECTO =============== */
  function setProviderDefaultsIfEmpty() {
    if (!$("#provNombre")?.value) $("#provNombre").value = "Mohammad Arslan Waris";
    if (!$("#provNif")?.value) $("#provNif").value = "X6389988J";
    if (!$("#provDir")?.value) $("#provDir").value = "Calle San Pablo 17 – Burgos";
    if (!$("#provTel")?.value) $("#provTel").value = "631 667 893";
    if (!$("#provEmail")?.value) $("#provEmail").value = "shaniwaris80@gmail.com";
  }

  /* =============== DATALIST PRODUCTOS =============== */
  function populateProductDatalist() {
    const dl = $("#productNamesList");
    if (!dl) return;
    dl.innerHTML = "";
    productos.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.name;
      dl.appendChild(opt);
    });
  }

  /* =============== BOOT PARTE 1 =============== */
  function bootPart1() {
    seedClientesIfEmpty();
    seedProductsIfEmpty();
    setProviderDefaultsIfEmpty();
    populateProductDatalist();
  }

  // Exponemos algunas funciones para siguientes partes
  window.__ARSLAN__ = {
    K, save, load,
    clientKey, uniqueByKey,
    clientes, productos, facturas, priceHist,
    setClientes: (v)=>{ clientes=v; save(K.CLIENTES, clientes); window.__ARSLAN__.clientes = clientes; },
    setProductos: (v)=>{ productos=v; save(K.PRODUCTOS, productos); window.__ARSLAN__.productos = productos; },
    setFacturas: (v)=>{ facturas=v; save(K.FACTURAS, facturas); window.__ARSLAN__.facturas = facturas; },
    setPriceHist: (v)=>{ priceHist=v; save(K.PRICEHIST, priceHist); window.__ARSLAN__.priceHist = priceHist; },
    populateProductDatalist,
    helpers: { $, $$, money, parseNum, fmtDateDMY, todayISO, escapeHTML, slug }
  };

  bootPart1();
})();
/* =======================================================
   ARSLAN PRO V10.5 — KIWI LITE (FULL)
   app.js — Parte 2/4
   - Clientes: render + select por clave segura
   - Productos: listado editable + búsqueda
   - Factura: líneas (cuadrícula) + datalist/autocompletar
======================================================= */
(() => {
  "use strict";

  const A = window.__ARSLAN__;
  const { $, $$, money, parseNum, escapeHTML } = A.helpers;
  const { K, save } = A;

  /* =============== UTIL: asegurar <datalist> de productos =============== */
  function ensureProductDatalist() {
    let dl = document.getElementById("productNamesList");
    if (!dl) {
      dl = document.createElement("datalist");
      dl.id = "productNamesList";
      document.body.appendChild(dl);
    }
    dl.innerHTML = "";
    (A.productos || []).forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.name;
      dl.appendChild(opt);
    });
  }

  /* =======================================================
     CLIENTES
  ======================================================= */
  function saveClientes() {
    save(K.CLIENTES, A.clientes);
  }

  function renderClientesSelect() {
    const sel = $("#selCliente");
    if (!sel) return;
    sel.innerHTML = `<option value="">— Seleccionar cliente —</option>`;
    // Ordenar por nombre visible
    const arr = [...(A.clientes || [])].sort((a, b) =>
      (a.nombre || "").localeCompare(b.nombre || "")
    );
    arr.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c._key; // <- clave estable
      opt.textContent = c.nombre || "(Sin nombre)";
      sel.appendChild(opt);
    });
  }

  function renderClientesLista() {
    const cont = $("#listaClientes");
    if (!cont) return;
    cont.innerHTML = "";
    const q = ($("#buscarCliente")?.value || "").toLowerCase();

    const arr = [...(A.clientes || [])].sort((a, b) =>
      (a.nombre || "").localeCompare(b.nombre || "")
    );

    const view = q
      ? arr.filter(
          (c) =>
            (c.nombre || "").toLowerCase().includes(q) ||
            (c.nif || "").toLowerCase().includes(q) ||
            (c.dir || "").toLowerCase().includes(q)
        )
      : arr;

    if (view.length === 0) {
      cont.innerHTML = '<div class="item">Sin clientes.</div>';
      return;
    }

    view.forEach((c) => {
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `
        <div>
          <strong>${escapeHTML(c.nombre || "(Sin nombre)")}</strong>
          <div class="muted">${escapeHTML(c.nif || "")} ${
        c.dir ? " · " + escapeHTML(c.dir) : ""
      }</div>
        </div>
        <div>
          <button class="small" data-e="use" data-k="${c._key}">Usar</button>
          <button class="small" data-e="edit" data-k="${c._key}">Editar</button>
          <button class="small" data-e="del" data-k="${c._key}">Borrar</button>
        </div>
      `;
      cont.appendChild(row);
    });

    cont.querySelectorAll("button").forEach((b) => {
      const key = b.dataset.k;
      b.addEventListener("click", () => {
        const idx = (A.clientes || []).findIndex((x) => x._key === key);
        if (idx < 0) return;
        if (b.dataset.e === "use") {
          const c = A.clientes[idx];
          $("#cliNombre").value = c.nombre || "";
          $("#cliNif").value = c.nif || "";
          $("#cliDir").value = c.dir || "";
          $("#cliTel").value = c.tel || "";
          $("#cliEmail").value = c.email || "";
          // seleccionar en el <select> por _key
          const sel = $("#selCliente");
          if (sel) sel.value = c._key;
          // cambiar a pestaña Factura
          $$("header .tab").find((t) => t.dataset.tab === "factura")?.click();
        } else if (b.dataset.e === "edit") {
          const c = A.clientes[idx];
          const nombre = prompt("Nombre", c.nombre || "") ?? c.nombre;
          const nif = prompt("NIF/CIF", c.nif || "") ?? c.nif;
          const dir = prompt("Dirección", c.dir || "") ?? c.dir;
          const tel = prompt("Teléfono", c.tel || "") ?? c.tel;
          const email = prompt("Email", c.email || "") ?? c.email;
          // Mantener la misma _key
          A.clientes[idx] = { ...c, nombre, nif, dir, tel, email };
          saveClientes();
          renderClientesSelect();
          renderClientesLista();
        } else if (b.dataset.e === "del") {
          if (!confirm("¿Eliminar cliente?")) return;
          A.clientes.splice(idx, 1);
          saveClientes();
          renderClientesSelect();
          renderClientesLista();
        }
      });
    });
  }

  // Eventos Clientes
  $("#selCliente")?.addEventListener("change", () => {
    const key = $("#selCliente").value;
    if (!key) return;
    const c = (A.clientes || []).find((x) => x._key === key);
    if (!c) return;
    $("#cliNombre").value = c.nombre || "";
    $("#cliNif").value = c.nif || "";
    $("#cliDir").value = c.dir || "";
    $("#cliTel").value = c.tel || "";
    $("#cliEmail").value = c.email || "";
  });

  $("#btnNuevoCliente")?.addEventListener("click", () => {
    $$("header .tab").find((t) => t.dataset.tab === "clientes")?.click();
  });

  $("#btnAddCliente")?.addEventListener("click", () => {
    const nombre = prompt("Nombre del cliente:");
    if (!nombre) return;
    const nif = prompt("NIF/CIF:") || "";
    const dir = prompt("Dirección:") || "";
    const tel = prompt("Teléfono:") || "";
    const email = prompt("Email:") || "";

    // Generar _key estable
    const _key = window.__ARSLAN__.clientKey({ nombre, nif });
    A.clientes.push({ nombre, nif, dir, tel, email, _key });
    saveClientes();
    renderClientesSelect();
    renderClientesLista();
  });

  $("#buscarCliente")?.addEventListener("input", renderClientesLista);

  /* =======================================================
     PRODUCTOS
  ======================================================= */
  function saveProductos() {
    save(K.PRODUCTOS, A.productos);
  }

  function renderProductos() {
    const cont = $("#listaProductos");
    if (!cont) return;
    cont.innerHTML = "";
    const q = ($("#buscarProducto")?.value || "").toLowerCase();

    const all = A.productos || [];
    const view = q ? all.filter((p) => (p.name || "").toLowerCase().includes(q)) : all;

    if (view.length === 0) {
      cont.innerHTML = '<div class="item">Sin resultados.</div>';
      return;
    }

    view.forEach((p, idx) => {
      const row = document.createElement("div");
      row.className = "product-row";
      row.innerHTML = `
        <input data-f="name" value="${escapeHTML(p.name || "")}" />
        <select data-f="mode">
          <option value="">—</option>
          <option value="kg"${p.mode === "kg" ? " selected" : ""}>kg</option>
          <option value="unidad"${p.mode === "unidad" ? " selected" : ""}>unidad</option>
          <option value="caja"${p.mode === "caja" ? " selected" : ""}>caja</option>
        </select>
        <input type="number" step="0.01" data-f="boxKg" placeholder="Kg/caja" value="${p.boxKg ?? ""}" />
        <input type="number" step="0.01" data-f="price" placeholder="€ base" value="${p.price ?? ""}" />
        <input data-f="origin" placeholder="Origen" value="${escapeHTML(p.origin || "")}" />
        <button data-e="save" data-i="${idx}">💾 Guardar</button>
        <button class="ghost" data-e="del" data-i="${idx}">✖</button>
      `;
      cont.appendChild(row);
    });

    cont.querySelectorAll("button").forEach((b) => {
      const i = +b.dataset.i;
      b.addEventListener("click", () => {
        if (b.dataset.e === "del") {
          if (!confirm("¿Eliminar producto?")) return;
          A.productos.splice(i, 1);
          saveProductos();
          ensureProductDatalist();
          renderProductos();
        } else {
          const row = b.closest(".product-row");
          const get = (f) => row.querySelector(`[data-f="${f}"]`).value.trim();
          const name = get("name");
          const mode = get("mode") || null;
          const boxKgStr = get("boxKg");
          const boxKg = boxKgStr === "" ? null : parseNum(boxKgStr);
          const priceStr = get("price");
          const price = priceStr === "" ? null : parseNum(priceStr);
          const origin = get("origin") || null;
          A.productos[i] = { name, mode, boxKg, price, origin };
          saveProductos();
          ensureProductDatalist();
          renderProductos();
        }
      });
    });
  }

  $("#buscarProducto")?.addEventListener("input", renderProductos);

  $("#btnAddProducto")?.addEventListener("click", () => {
    const name = prompt("Nombre del producto:");
    if (!name) return;
    A.productos.push({ name });
    saveProductos();
    ensureProductDatalist();
    renderProductos();
  });

  /* =======================================================
     FACTURA: LÍNEAS (CUADRÍCULA)
  ======================================================= */
  function findProducto(name) {
    return (A.productos || []).find(
      (p) => (p.name || "").toLowerCase() === String(name || "").toLowerCase()
    );
  }

  function callRecalcSafe() {
    // Se definirá en Parte 3; aquí lo invocamos si ya existe
    try {
      if (window.__ARSLAN__?.hooks?.recalc) window.__ARSLAN__.hooks.recalc();
    } catch (e) {}
  }

  function addLinea() {
    ensureProductDatalist();
    const wrap = $("#lineas");
    if (!wrap) return;

    const row = document.createElement("div");
    row.className = "linea";
    row.innerHTML = `
      <input class="name" list="productNamesList" placeholder="Producto" />
      <select class="mode">
        <option value="">—</option>
        <option value="kg">kg</option>
        <option value="unidad">unidad</option>
        <option value="caja">caja</option>
      </select>
      <input class="qty"   type="number" step="1"    placeholder="Cant." />
      <input class="gross" type="number" step="0.01" placeholder="Bruto kg" />
      <input class="tare"  type="number" step="0.01" placeholder="Tara kg" />
      <input class="net"   type="number" step="0.01" placeholder="Neto kg" disabled />
      <input class="price" type="number" step="0.01" placeholder="Precio" />
      <input class="origin" placeholder="Origen (opcional)" />
      <button class="del">✕</button>
    `;
    wrap.appendChild(row);

    const name = row.querySelector(".name");
    const mode = row.querySelector(".mode");
    const qty = row.querySelector(".qty");
    const gross = row.querySelector(".gross");
    const tare = row.querySelector(".tare");
    const net = row.querySelector(".net");
    const price = row.querySelector(".price");
    const origin = row.querySelector(".origin");

    function recalcLine() {
      const m = (mode.value || "").toLowerCase();
      const q = Math.max(0, Math.floor(parseNum(qty.value || 0)));
      const g = Math.max(0, parseNum(gross.value || 0));
      const t = Math.max(0, parseNum(tare.value || 0));
      const pr = Math.max(0, parseNum(price.value || 0));
      let n = 0;

      if (g > 0 || t > 0) n = Math.max(0, g - t);
      else if (m === "caja") {
        const p = findProducto(name.value);
        const kg = p?.boxKg || 0;
        n = q * kg;
      } else if (m === "kg") n = q;
      else if (m === "unidad") n = q;

      net.value = n ? n.toFixed(2) : "";
      // Importe se calculará en Parte 3 para Totales/PDF; aquí solo disparamos recalc global
      callRecalcSafe();
    }

    name.addEventListener("change", () => {
      const p = findProducto(name.value.trim());
      if (p) {
        if (p.mode) mode.value = p.mode;
        if (p.price != null) price.value = p.price;
        if (p.origin) origin.value = p.origin;
        // mostrar historial (Parte 3) si existe
        try { window.__ARSLAN__.hooks?.showPriceHistory?.(p.name); } catch(e){}
      }
      recalcLine();
    });

    [mode, qty, gross, tare, price].forEach((el) =>
      el.addEventListener("input", recalcLine)
    );

    row.querySelector(".del").addEventListener("click", () => {
      row.remove();
      callRecalcSafe();
    });
  }

  function ensureInitialLines() {
    const wrap = $("#lineas");
    if (!wrap) return;
    if (wrap.children.length === 0) {
      for (let i = 0; i < 5; i++) addLinea();
    }
  }

  // Botones de líneas
  $("#btnAddLinea")?.addEventListener("click", addLinea);
  $("#btnVaciarLineas")?.addEventListener("click", () => {
    if (!confirm("¿Vaciar todas las líneas?")) return;
    const wrap = $("#lineas");
    if (!wrap) return;
    wrap.innerHTML = "";
    for (let i = 0; i < 5; i++) addLinea();
    callRecalcSafe();
  });

  /* =======================================================
     BOOT PARTE 2
  ======================================================= */
  function bootPart2() {
    // Clientes
    renderClientesSelect();
    renderClientesLista();

    // Productos
    ensureProductDatalist();
    renderProductos();

    // Líneas
    ensureInitialLines();
  }

  // Exponer utilidades de esta parte a siguientes
  if (!window.__ARSLAN__.ui) window.__ARSLAN__.ui = {};
  Object.assign(window.__ARSLAN__.ui, {
    renderClientesSelect,
    renderClientesLista,
    renderProductos,
    addLinea
  });

  bootPart2();
})();
/* =======================================================
   ARSLAN PRO V10.5 — KIWI LITE (FULL)
   app.js — Parte 3/4
   - Totales y recálculo
   - Historial de precios global por producto
   - Guardar factura (nº único)
   - PDF A4 (html2pdf)
   - Hooks (recalc, showPriceHistory)
======================================================= */
(() => {
  "use strict";

  const A = window.__ARSLAN__;
  const { $, $$, money, parseNum, fmtDateDMY, todayISO, escapeHTML } = A.helpers;
  const { K, save, load } = A;

  /* =============== HISTORIAL DE PRECIOS =============== */
  function lastPrice(name) {
    const arr = A.priceHist?.[name];
    return arr?.length ? arr[0].price : null;
  }
  function pushPriceHistory(name, price) {
    if (!name || !(price > 0)) return;
    const arr = A.priceHist[name] || [];
    arr.unshift({ price, date: todayISO() });
    A.priceHist[name] = arr.slice(0, 10);
    save(K.PRICEHIST, A.priceHist);
  }
  function showPriceHistory(name) {
    // Panel flotante sencillo (opcional). Si no existe, ignorar.
    let panel = document.getElementById("pricePanel");
    let body  = document.getElementById("ppBody");
    if (!panel || !body) return;
    panel.removeAttribute("hidden");
    const hist = A.priceHist?.[name] || [];
    if (!hist.length) {
      body.innerHTML = `<div class="pp-row"><span>${escapeHTML(name)}</span><strong>Sin datos</strong></div>`;
      scheduleHidePanel();
      return;
    }
    body.innerHTML =
      `<div class="pp-row" style="justify-content:center"><strong>${escapeHTML(name)}</strong></div>` +
      hist.map(h => `<div class="pp-row"><span>${fmtDateDMY(new Date(h.date))}</span><strong>${money(h.price)}</strong></div>`).join("");
    scheduleHidePanel();
  }
  let hideT = null;
  function scheduleHidePanel() {
    clearTimeout(hideT);
    hideT = setTimeout(() => document.getElementById("pricePanel")?.setAttribute("hidden", ""), 4500);
  }

  /* =============== CAPTURAR LÍNEAS FACTURA =============== */
  function captureLineas() {
    return $$("#lineas .linea").map((row) => {
      const name   = row.querySelector(".name")?.value.trim();
      const mode   = row.querySelector(".mode")?.value.trim().toLowerCase();
      const qty    = Math.max(0, Math.floor(parseNum(row.querySelector(".qty")?.value || 0)));
      const gross  = Math.max(0, parseNum(row.querySelector(".gross")?.value || 0));
      const tare   = Math.max(0, parseNum(row.querySelector(".tare")?.value || 0));
      const netInp = row.querySelector(".net");
      const price  = Math.max(0, parseNum(row.querySelector(".price")?.value || 0));
      const origin = row.querySelector(".origin")?.value.trim();

      // Recalcular neto
/* =======================================================
   ARSLAN PRO V10.5 — KIWI LITE (FULL)
   app.js — Parte 4/4
   - Lista de facturas + acciones (PDF, cobrar, parcial)
   - Pendientes por cliente
   - Ventas: KPIs + gráficos (Chart.js)
   - Backup / Restaurar + Export / Import
   - Boot final
======================================================= */
(() => {
  "use strict";

  const A = window.__ARSLAN__;
  const { $, $$, money, parseNum, fmtDateDMY, todayISO, escapeHTML } = A.helpers;
  const { K, save, load } = A;

  /* =============== UTIL COMÚN =============== */
  function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  function uploadJSON(cb) {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "application/json";
    inp.onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try { cb(JSON.parse(r.result)); } catch { alert("JSON inválido"); }
      };
      r.readAsText(f);
    };
    inp.click();
  }

  /* =============== LISTA DE FACTURAS =============== */
  function badgeEstado(f) {
    const tot = f.totals?.total || 0, pag = f.totals?.pagado || 0;
    if (pag >= tot) return `<span class="badge ok">Pagada</span>`;
    if (pag > 0 && pag < tot) return `<span class="badge warn">Parcial</span>`;
    return `<span class="badge bad">Impagada</span>`;
  }

  function renderFacturas() {
    const cont = $("#listaFacturas");
    if (!cont) return;
    cont.innerHTML = "";

    const q = ($("#buscaCliente")?.value || "").toLowerCase();
    const fe = $("#filtroEstado")?.value || "todas";

    let arr = (A.facturas || []).slice();
    if (fe !== "todas") arr = arr.filter((f) => f.estado === fe);
    if (q) arr = arr.filter((f) => (f.cliente?.nombre || "").toLowerCase().includes(q));

    if (arr.length === 0) {
      cont.innerHTML = '<div class="item">No hay facturas.</div>';
      return;
    }

    arr.slice(0, 500).forEach((f, idx) => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div>
          <strong>${escapeHTML(f.numero)}</strong> ${badgeEstado(f)}
          <div class="muted">${new Date(f.fecha).toLocaleString()} · ${escapeHTML(f.cliente?.nombre || "")}</div>
        </div>
        <div>
          <strong>${money(f.totals.total)}</strong>
          <button class="small" data-e="ver" data-i="${idx}">Ver</button>
          <button class="small" data-e="cobrar" data-i="${idx}">💶 Cobrar</button>
          <button class="small" data-e="parcial" data-i="${idx}">+ Parcial</button>
          <button class="small" data-e="pdf" data-i="${idx}">PDF</button>
        </div>
      `;
      cont.appendChild(div);
    });

    cont.querySelectorAll("button").forEach((b) => {
      const i = +b.dataset.i;
      b.addEventListener("click", () => {
        const f = (A.facturas || [])[i];
        if (!f) return;
        if (b.dataset.e === "ver") {
          // Rellenar panel de impresión con la factura
          try {
            // Relleno simple usando fill de Parte 3: replicamos valores en inputs para imprimir
            $("#cliNombre").value = f.cliente?.nombre || "";
            $("#cliNif").value = f.cliente?.nif || "";
            $("#cliDir").value = f.cliente?.dir || "";
            $("#cliTel").value = f.cliente?.tel || "";
            $("#cliEmail").value = f.cliente?.email || "";
            $("#provNombre").value = f.proveedor?.nombre || "";
            $("#provNif").value = f.proveedor?.nif || "";
            $("#provDir").value = f.proveedor?.dir || "";
            $("#provTel").value = f.proveedor?.tel || "";
            $("#provEmail").value = f.proveedor?.email || "";

            // Mostrar solo en área de impresión:
            const tbody = $("#p-tabla tbody"); tbody.innerHTML = "";
            (f.lineas || []).forEach((l) => {
              const tr = document.createElement("tr");
              const importe = (l.mode === "unidad") ? l.qty * l.price : l.net * l.price;
              tr.innerHTML = `
                <td>${escapeHTML(l.name)}</td>
                <td>${escapeHTML(l.mode || "")}</td>
                <td>${l.qty || ""}</td>
                <td>${l.net ? l.net.toFixed(2) : ""}</td>
                <td>${money(l.price)}</td>
                <td>${escapeHTML(l.origin || "")}</td>
                <td>${money(importe)}</td>
              `;
              tbody.appendChild(tr);
            });
            $("#p-sub").textContent = money(f.totals?.subtotal || 0);
            $("#p-tra").textContent = money(f.totals?.transporte || 0);
            $("#p-iva").textContent = money(f.totals?.iva || 0);
            $("#p-tot").textContent = money(f.totals?.total || 0);
          } catch (e) {}
          // Cambiar a pestaña Factura
          $$("header .tab").find((t) => t.dataset.tab === "factura")?.click();
          document.getElementById("printArea")?.scrollIntoView({ behavior: "smooth" });
        } else if (b.dataset.e === "cobrar") {
          const tot = f.totals?.total || 0;
          f.totals.pagado = tot;
          f.totals.pendiente = 0;
          f.estado = "pagado";
          (f.pagos ??= []).push({ date: todayISO(), amount: tot });
          save(K.FACTURAS, A.facturas);
          renderFacturas(); renderPendientes(); refreshDash();
        } else if (b.dataset.e === "parcial") {
          const tot = f.totals?.total || 0;
          const pag = f.totals?.pagado || 0;
          const max = Math.max(0, tot - pag);
          const val = parseNum(prompt(`Importe abonado (pendiente ${money(max)}):`) || 0);
          if (val > 0) {
            (f.pagos ??= []).push({ date: todayISO(), amount: val });
            f.totals.pagado = (f.totals.pagado || 0) + val;
            f.totals.pendiente = Math.max(0, tot - f.totals.pagado);
            f.estado = f.totals.pendiente > 0 ? (f.totals.pagado > 0 ? "parcial" : "pendiente") : "pagado";
            save(K.FACTURAS, A.facturas);
            renderFacturas(); renderPendientes(); refreshDash();
          }
        } else if (b.dataset.e === "pdf") {
          // Generar PDF directo de la factura f
          try {
            // Rellenar la vista de impresión
            $("#cliNombre").value = f.cliente?.nombre || "";
            $("#cliNif").value = f.cliente?.nif || "";
            $("#cliDir").value = f.cliente?.dir || "";
            $("#cliTel").value = f.cliente?.tel || "";
            $("#cliEmail").value = f.cliente?.email || "";
            $("#provNombre").value = f.proveedor?.nombre || "";
            $("#provNif").value = f.proveedor?.nif || "";
            $("#provDir").value = f.proveedor?.dir || "";
            $("#provTel").value = f.proveedor?.tel || "";
            $("#provEmail").value = f.proveedor?.email || "";
            const tbody = $("#p-tabla tbody"); tbody.innerHTML = "";
            (f.lineas || []).forEach((l) => {
              const tr = document.createElement("tr");
              const importe = (l.mode === "unidad") ? l.qty * l.price : l.net * l.price;
              tr.innerHTML = `
                <td>${escapeHTML(l.name)}</td>
                <td>${escapeHTML(l.mode || "")}</td>
                <td>${l.qty || ""}</td>
                <td>${l.net ? l.net.toFixed(2) : ""}</td>
                <td>${money(l.price)}</td>
                <td>${escapeHTML(l.origin || "")}</td>
                <td>${money(importe)}</td>
              `;
              tbody.appendChild(tr);
            });
            $("#p-sub").textContent = money(f.totals?.subtotal || 0);
            $("#p-tra").textContent = money(f.totals?.transporte || 0);
            $("#p-iva").textContent = money(f.totals?.iva || 0);
            $("#p-tot").textContent = money(f.totals?.total || 0);

            const element = document.getElementById("printArea");
            const dt = new Date(f.fecha);
            const nombreCliente = (f.cliente?.nombre || "Cliente").replace(/\s+/g, "");
            const filename = `Factura-${nombreCliente}-${fmtDateDMY(dt)}.pdf`;
            const opt = {
              margin: [10,10,10,10],
              filename,
              image: { type: "jpeg", quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            };
            window.html2pdf().set(opt).from(element).save();
          } catch (e) {}
        }
      });
    });
  }

  $("#filtroEstado")?.addEventListener("input", renderFacturas);
  $("#buscaCliente")?.addEventListener("input", renderFacturas);

  // Export / Import facturas
  $("#btnExportFacturas")?.addEventListener("click", () => downloadJSON(A.facturas, "facturas-arslan-v105.json"));
  $("#btnImportFacturas")?.addEventListener("click", () =>
    uploadJSON((arr) => {
      if (Array.isArray(arr)) {
        A.facturas = arr; save(K.FACTURAS, A.facturas);
        renderFacturas(); renderPendientes(); refreshDash();
      }
    })
  );

  /* =============== PENDIENTES POR CLIENTE =============== */
  function renderPendientes() {
    const cont = $("#resPorCliente");
    if (!cont) return;
    cont.innerHTML = "";

    const map = new Map(); // cliente -> {total, count}
    (A.facturas || []).forEach((f) => {
      const pend = f.totals?.pendiente || 0;
      if (pend <= 0) return;
      const nom = f.cliente?.nombre || "(s/cliente)";
      const cur = map.get(nom) || { total: 0, count: 0 };
      cur.total += pend; cur.count += 1;
      map.set(nom, cur);
    });

    if (map.size === 0) {
      cont.innerHTML = '<div class="item">Sin deudas registradas.</div>';
      return;
    }

    let global = 0;
    [...map.entries()].sort((a, b) => b[1].total - a[1].total).forEach(([nom, v]) => {
      global += v.total;
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `
        <div><strong>${escapeHTML(nom)}</strong> · ${v.count} factura(s)</div>
        <div><strong>${money(v.total)}</strong></div>
      `;
      cont.appendChild(row);
    });

    // Botón reset global
    $("#btnResetGlobal")?.addEventListener("click", () => {
      if (!confirm("¿Marcar todas las deudas como cobradas?")) return;
      A.facturas = (A.facturas || []).map((f) => {
        const tot = f.totals?.total || 0;
        return {
          ...f,
          estado: "pagado",
          totals: { ...(f.totals || {}), pagado: tot, pendiente: 0 },
          pagos: [...(f.pagos || []), { date: todayISO(), amount: Math.max(0, tot - (f.totals?.pagado || 0)) }],
        };
      });
      save(K.FACTURAS, A.facturas);
      renderFacturas(); renderPendientes(); refreshDash();
    });
  }

  /* =============== RESUMEN + KPIs RÁPIDOS =============== */
  function startOfDay(d=new Date()){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
  function endOfDay(d=new Date()){ const x=new Date(d); x.setHours(23,59,59,999); return x; }
  function startOfWeek(d=new Date()){ const x=new Date(d); const w=(x.getDay()+6)%7; x.setDate(x.getDate()-w); x.setHours(0,0,0,0); return x; }
  function startOfMonth(d=new Date()){ return new Date(d.getFullYear(), d.getMonth(), 1); }

  function sumBetween(d1, d2){
    let s=0;
    (A.facturas||[]).forEach(f=>{ const d=new Date(f.fecha); if(d>=d1 && d<=d2) s += (f.totals?.total||0); });
    return s;
  }

  function resumenQuick(){
    const now = new Date();
    const hoy    = sumBetween(startOfDay(now), endOfDay(now));
    const semana = sumBetween(startOfWeek(now), endOfDay(now));
    const mes    = sumBetween(startOfMonth(now), endOfDay(now));
    const total  = (A.facturas||[]).reduce((a,f)=>a+(f.totals?.total||0),0);
    $("#rHoy")?.textContent = money(hoy);
    $("#rSemana")?.textContent = money(semana);
    $("#rMes")?.textContent = money(mes);
    $("#rTotal")?.textContent = money(total);
  }

  /* =============== GRÁFICOS (Chart.js) =============== */
  let chartDiario, chartMensual;

  function groupDaily(n=7){
    const now=new Date(); const buckets=[];
    for(let i=n-1;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i); const k=d.toISOString().slice(0,10); buckets.push({k,label:k.slice(5),sum:0}); }
    (A.facturas||[]).forEach(f=>{ const k=f.fecha.slice(0,10); const b=buckets.find(x=>x.k===k); if(b) b.sum+=(f.totals?.total||0); });
    return buckets;
  }
  function groupMonthly(n=12){
    const now=new Date(); const buckets=[];
    for(let i=n-1;i>=0;i--){ const d=new Date(now); d.setMonth(d.getMonth()-i); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; buckets.push({k,label:k,sum:0}); }
    (A.facturas||[]).forEach(f=>{ const d=new Date(f.fecha); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; const b=buckets.find(x=>x.k===k); if(b) b.sum+=(f.totals?.total||0); });
    return buckets;
  }

  function drawCharts(){
    if (typeof Chart === "undefined") return;
    const daily = groupDaily(7);
    const monthly = groupMonthly(12);

    const c1 = document.getElementById("chartDiario");
    if (c1) {
      if (chartDiario) chartDiario.destroy();
      chartDiario = new Chart(c1.getContext("2d"), {
        type: "bar",
        data: { labels: daily.map(d=>d.label), datasets: [{ label: "Ventas diarias", data: daily.map(d=>d.sum) }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }

    const c2 = document.getElementById("chartMensual");
    if (c2) {
      if (chartMensual) chartMensual.destroy();
      chartMensual = new Chart(c2.getContext("2d"), {
        type: "line",
        data: { labels: monthly.map(d=>d.label), datasets: [{ label: "Ventas mensuales", data: monthly.map(d=>d.sum) }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }
  }

  function refreshDash(){
    resumenQuick();
    drawCharts();
  }

  // Exponer a otras partes
  if (!window.__ARSLAN__.ui) window.__ARSLAN__.ui = {};
  Object.assign(window.__ARSLAN__.ui, {
    renderFacturas,
    renderPendientes
  });
  if (!window.__ARSLAN__.hooks) window.__ARSLAN__.hooks = {};
  Object.assign(window.__ARSLAN__.hooks, {
    resumenQuick,
    refreshDash
  });

  /* =============== BACKUP / RESTAURAR =============== */
  $("#btnBackup")?.addEventListener("click", ()=>{
    const payload = {
      clientes: A.clientes,
      productos: A.productos,
      facturas: A.facturas,
      priceHist: A.priceHist,
      fecha: todayISO(),
      version: "ARSLAN PRO V10.5 KIWI LITE"
    };
    downloadJSON(payload, `backup-${fmtDateDMY(new Date())}.json`);
  });

  $("#btnRestore")?.addEventListener("click", ()=>{
    uploadJSON((obj)=>{
      if(!obj || typeof obj !== "object"){ alert("Copia inválida"); return; }
      if (Array.isArray(obj.clientes)) A.clientes = obj.clientes;
      if (Array.isArray(obj.productos)) A.productos = obj.productos;
      if (Array.isArray(obj.facturas)) A.facturas = obj.facturas;
      if (obj.priceHist && typeof obj.priceHist === "object") A.priceHist = obj.priceHist;

      save(K.CLIENTES, A.clientes);
      save(K.PRODUCTOS, A.productos);
      save(K.FACTURAS, A.facturas);
      save(K.PRICEHIST, A.priceHist);

      // Re-render todo
      window.__ARSLAN__.ui?.renderClientesSelect?.();
      window.__ARSLAN__.ui?.renderClientesLista?.();
      window.__ARSLAN__.ui?.renderProductos?.();
      renderFacturas(); renderPendientes(); refreshDash();
      alert("Copia restaurada ✔️");
    });
  });

  // Export/Import Clientes (si no los tenías en Partes anteriores)
  $("#btnExportClientes")?.addEventListener("click", ()=>downloadJSON(A.clientes, "clientes-arslan-v105.json"));
  $("#btnImportClientes")?.addEventListener("click", ()=>uploadJSON(arr=>{
    if(Array.isArray(arr)){
      // Añadimos _key si falta
      arr = arr.map(c => c._key ? c : { ...c, _key: window.__ARSLAN__.clientKey(c) });
      A.clientes = arr; save(K.CLIENTES, A.clientes);
      window.__ARSLAN__.ui?.renderClientesSelect?.();
      window.__ARSLAN__.ui?.renderClientesLista?.();
    }
  }));

  // Export/Import Productos (si no los tenías en Partes anteriores)
  $("#btnExportProductos")?.addEventListener("click", ()=>downloadJSON(A.productos, "productos-arslan-v105.json"));
  $("#btnImportProductos")?.addEventListener("click", ()=>uploadJSON(arr=>{
    if(Array.isArray(arr)){
      A.productos = arr; save(K.PRODUCTOS, A.productos);
      window.__ARSLAN__.populateProductDatalist?.();
      window.__ARSLAN__.ui?.renderProductos?.();
    }
  }));

  /* =============== BOOT FINAL =============== */
  function bootPart4(){
    renderFacturas();
    renderPendientes();
    refreshDash();
  }
  bootPart4();
})();

