const itemsDiv = document.getElementById("items");
const btnAdd = document.getElementById("agregar");
const chkTrans = document.getElementById("transport10");
const elSubtotal = document.getElementById("subtotal");
const elIva = document.getElementById("iva");
const elTotal = document.getElementById("total");
const btnPDF = document.getElementById("generarPDF");

// Añadir línea
function addItem(name="", qty=1, price=0){
  const row = document.createElement("div");
  row.className = "item";
  row.innerHTML = `
    <input class="name" placeholder="Producto" value="${name}">
    <input class="qty" type="number" min="0" step="1" placeholder="Cant." value="${qty}">
    <input class="mode" placeholder="kg/unidad/caja">
    <input class="price" type="number" min="0" step="0.01" placeholder="€/unidad" value="${price}">
    <button class="del">X</button>
  `;
  row.querySelector(".del").onclick = () => { row.remove(); recalc(); };
  row.querySelectorAll("input").forEach(i => i.addEventListener("input", recalc));
  itemsDiv.appendChild(row);
  recalc();
}
btnAdd.onclick = () => addItem();

// Cálculos
function recalc(){
  const rows = [...document.querySelectorAll("#items .item")];
  let subtotal = 0;
  rows.forEach(r=>{
    const qty = parseFloat(r.querySelector(".qty").value||0);
    const price = parseFloat(r.querySelector(".price").value||0);
    subtotal += qty * price;
  });
  // Transporte opcional
  if(chkTrans.checked) subtotal *= 1.10;

  // IVA 4% (mostrado; si ya incluyes IVA en el precio, esto solo informa)
  const iva = subtotal * 0.04;
  const total = subtotal; // si el IVA ya está incluido, total = subtotal

  elSubtotal.textContent = subtotal.toFixed(2) + " €";
  elIva.textContent = iva.toFixed(2) + " €";
  elTotal.textContent = total.toFixed(2) + " €";
}
chkTrans.addEventListener("change", recalc);

// PDF (captura simple de la página con print)
document.getElementById("generarPDF").onclick = () => {
  window.print();
};

// Inicia con una línea
addItem();
