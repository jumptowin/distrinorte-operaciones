/* DistriNorte · Operaciones del centro de distribución */
(function () {
  "use strict";
  const cfg = window.APP_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const vista = $("#vista");
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (n, d = 0) => Number(n ?? 0).toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fecha = (f) => (f ? new Date(f.length <= 10 ? f + "T12:00:00" : f).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-");
  const hora = (f) => (f ? new Date(f).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-");
  const hoy = () => new Date().toLocaleDateString("en-CA");
  const badge = (e) => `<span class="b ${esc(e)}">${esc(String(e).replace("_", " "))}</span>`;
  const ubic = (o) => `${o.codigo_deposito}-${o.pasillo}-${o.estante}-${o.nivel}`;

  function toast(msg, tipo = "") {
    const t = $("#toast"); t.textContent = msg; t.className = "toast " + tipo; t.hidden = false;
    clearTimeout(toast.h); toast.h = setTimeout(() => (t.hidden = true), 4200);
  }
  function modal(titulo, html, alAbrir) {
    $("#modalTitulo").textContent = titulo; $("#modalCuerpo").innerHTML = html; $("#modal").hidden = false;
    if (alAbrir) alAbrir($("#modalCuerpo"));
  }
  const cerrarModal = () => ($("#modal").hidden = true);
  $("#modalCerrar").onclick = cerrarModal;
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") cerrarModal(); });

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) {
    $("#estadoConexion").textContent = "Sin configurar"; $("#estadoConexion").classList.add("err");
    vista.innerHTML = `<div class="aviso"><b>Falta configurar la base de datos.</b><br>Completá SUPABASE_URL y SUPABASE_ANON_KEY en <code>config.js</code> con la URL del proyecto y la clave pública (anon).</div>`;
    return;
  }
  const db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  async function q(promesa) {
    const { data, error } = await promesa;
    if (error) throw new Error(traducir(error.message));
    return data;
  }
  function traducir(m) {
    if (/stock_cantidad_check/.test(m)) return "No hay stock suficiente en esa ubicación.";
    if (/row-level security/.test(m)) return "La operación no está permitida.";
    if (/duplicate key.*entrega_nro_pedido/.test(m)) return "Ese pedido ya está en una hoja de ruta.";
    if (/un_hoja_en_curso/.test(m)) return "Ese vehículo o chofer ya tiene una hoja de ruta en curso.";
    if (/entrega_id_hoja_orden_visita/.test(m)) return "Ya hay una entrega con ese orden de visita.";
    return m.replace(/^.*?ERROR:\s*/, "");
  }

  /* ---------------- Navegación ---------------- */
  const vistas = { panel, stock, compras, pedidos, rutas, movimientos, flota };
  function ir(v) {
    if (!vistas[v]) v = "panel";
    document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.v === v));
    if (location.hash !== "#" + v) history.replaceState(null, "", "#" + v);
    vista.innerHTML = `<p class="vacio">Cargando…</p>`;
    vistas[v]().catch((e) => { vista.innerHTML = `<div class="aviso">No se pudieron cargar los datos: ${esc(e.message)}</div>`; });
    window.scrollTo(0, 0);
  }
  document.querySelectorAll("#nav a").forEach((a) => (a.onclick = () => ir(a.dataset.v)));
  const recargar = () => ir((location.hash || "#panel").slice(1));

  /* ---------------- Panel (F5 indicadores) ---------------- */
  async function panel() {
    const [ind] = await q(db.from("v_indicadores").select("*"));
    const ocup = await q(db.from("v_ocupacion_deposito").select("*").order("codigo"));
    const rep = await q(db.from("v_stock_producto").select("*").eq("a_reponer", true));
    const hojas = await q(db.from("v_hojas_ruta").select("*").neq("estado", "CERRADA").order("fecha"));
    vista.innerHTML = `
      <h2>Panel de operación</h2><p class="sub">Situación al ${fecha(hoy())}</p>
      <div class="kpis">
        <div class="kpi"><b>${num(ind.pedidos_abiertos)}</b><span>Pedidos abiertos</span></div>
        <div class="kpi v"><b>${ind.pct_entregas_a_tiempo == null ? "-" : num(ind.pct_entregas_a_tiempo, 1) + " %"}</b><span>Entregas a tiempo (${num(ind.entregas_realizadas)} entregadas)</span></div>
        <div class="kpi a"><b>${num(ind.productos_a_reponer)}</b><span>Productos a reponer · ${num(ind.compras_pendientes)} compras en curso</span></div>
        <div class="kpi r"><b>${num(ind.entregas_rechazadas)}</b><span>Entregas rechazadas</span></div>
      </div>
      <div class="grid2">
        <div class="card"><h3>Ocupación de depósitos · total ${num(ind.pct_ocupacion_total, 1)} %</h3>
          ${ocup.map((d) => `<div style="margin-bottom:12px"><div class="row"><b>${esc(d.nombre)}</b><span class="sp"></span><span>${num(d.ocupado)} / ${num(d.capacidad)} u · ${num(d.pct_ocupacion, 1)} %</span></div>
            <div class="bar ${d.pct_ocupacion >= 90 ? "full" : d.pct_ocupacion >= 75 ? "alta" : ""}"><i style="width:${Math.min(100, d.pct_ocupacion || 0)}%"></i></div></div>`).join("")}
        </div>
        <div class="card"><h3>Alertas de reposición</h3>
          ${rep.length ? rep.map((p) => `<div class="row" style="padding:6px 0;border-bottom:1px solid var(--borde)"><div><b>${esc(p.sku)}</b> ${esc(p.descripcion)}<div class="m" style="font-size:12px;color:var(--gris)">${num(p.unidades)} u · mínimo ${num(p.stock_minimo)}</div></div><span class="sp"></span>${p.compra_en_curso ? badge("PENDIENTE") : `<span class="b mal">SIN COMPRA</span>`}</div>`).join("") : `<p class="vacio">Todo el stock está por encima del mínimo.</p>`}
          <div style="margin-top:10px"><button class="btn s" onclick="location.hash='#compras'">Ir a compras</button></div>
        </div>
      </div>
      <div class="card"><h3>Hojas de ruta abiertas</h3>
        ${hojas.length ? hojas.map(filaHoja).join("") : `<p class="vacio">No hay hojas de ruta abiertas.</p>`}
      </div>`;
  }
  const filaHoja = (h) => `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--borde)"><div><b>Hoja ${h.id_hoja}</b> · ${fecha(h.fecha)} ${badge(h.estado)}<div style="font-size:12px;color:var(--gris)">${esc(h.vehiculo)} ${esc(h.patente)} · ${esc(h.chofer)} · ${h.entregas} entregas</div></div><span class="sp"></span><div style="width:110px"><div style="font-size:11px;text-align:right">${num(h.carga_kg, 1)} kg · ${num(h.pct_carga, 0)} %</div><div class="bar ${h.pct_carga >= 90 ? "full" : h.pct_carga >= 75 ? "alta" : ""}"><i style="width:${Math.min(100, h.pct_carga)}%"></i></div></div></div>`;

  /* ---------------- Stock (F1 reposición) ---------------- */
  async function stock() {
    const prods = await q(db.from("v_stock_producto").select("*").order("sku"));
    const st = await q(db.from("stock").select("*").gt("cantidad", 0).order("sku"));
    const ubs = await q(db.from("ubicacion").select("*").order("codigo_deposito"));
    let filtro = "todos";
    const pinta = () => {
      const lista = prods.filter((p) => filtro === "todos" || p.a_reponer);
      $("#lst").innerHTML = lista.map((p) => {
        const pct = p.stock_minimo ? Math.min(100, (100 * p.unidades) / (p.stock_minimo * 3)) : 100;
        const donde = st.filter((s) => s.sku === p.sku).map((s) => `<span class="b">${ubic(s)}: ${s.cantidad}</span>`).join(" ");
        return `<div class="item"><div class="row"><div class="t">${esc(p.sku)} · ${esc(p.descripcion)}</div><span class="sp"></span>${p.a_reponer ? `<span class="b mal">A REPONER</span>` : `<span class="b ok">OK</span>`}</div>
          <div class="m">${esc(p.proveedor)} · mínimo ${num(p.stock_minimo)} · lote ${num(p.lote_reposicion)} ${p.compra_en_curso ? "· compra en curso" : ""}</div>
          <div class="row" style="margin:8px 0"><b style="font-size:20px;color:var(--azul)">${num(p.unidades)}</b><span>${esc(p.unidad_medida)}</span><div class="sp bar ${p.a_reponer ? "full" : ""}"><i style="width:${pct}%"></i></div></div>
          <div class="row">${donde || '<span class="vacio">Sin stock en ubicaciones</span>'}</div></div>`;
      }).join("") || `<p class="vacio">No hay productos para mostrar.</p>`;
    };
    vista.innerHTML = `<h2>Stock y reposición</h2><p class="sub">Unidades por producto y por ubicación. El stock solo cambia con movimientos.</p>
      <div class="chips"><span class="chip on" data-f="todos">Todos (${prods.length})</span><span class="chip" data-f="rep">A reponer (${prods.filter((p) => p.a_reponer).length})</span></div>
      <div class="lista" id="lst"></div>
      <div class="card" style="margin-top:14px"><h3>Ubicaciones</h3><div class="wrap"><table class="tabla"><tr><th>Ubicación</th><th>Capacidad</th><th>Ocupado</th><th>Productos</th></tr>
      ${ubs.map((u) => { const en = st.filter((s) => ubic(s) === ubic(u)); const oc = en.reduce((a, s) => a + s.cantidad, 0);
        return `<tr><td><b>${ubic(u)}</b></td><td>${u.capacidad_unid}</td><td>${oc} (${Math.round((100 * oc) / u.capacidad_unid)} %)</td><td>${en.map((s) => esc(s.sku)).join(", ") || "-"}</td></tr>`; }).join("")}
      </table></div></div>`;
    vista.querySelectorAll(".chip").forEach((c) => (c.onclick = () => { filtro = c.dataset.f; vista.querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === c)); pinta(); }));
    pinta();
  }

  /* ---------------- Compras (F1 reposición + F2 recepción) ---------------- */
  async function compras() {
    const ocs = await q(db.from("orden_compra").select("*, proveedor(razon_social), detalle_orden_compra(sku, cantidad)").order("nro_oc", { ascending: false }));
    const rep = await q(db.from("v_stock_producto").select("*").eq("a_reponer", true).eq("compra_en_curso", false));
    vista.innerHTML = `<h2>Compras a proveedores</h2><p class="sub">Sugerencias por stock mínimo, órdenes de compra y recepción en depósito.</p>
      <div class="card"><h3>Sugerencias de reposición</h3>
        ${rep.length ? rep.map((p) => `<div class="row" style="padding:6px 0;border-bottom:1px solid var(--borde)"><div><b>${esc(p.sku)}</b> ${esc(p.descripcion)}<div style="font-size:12px;color:var(--gris)">${esc(p.proveedor)} · stock ${p.unidades} · mínimo ${p.stock_minimo}</div></div><span class="sp"></span><button class="btn s v" data-oc="${esc(p.sku)}">Pedir ${p.lote_reposicion}</button></div>`).join("") : `<p class="vacio">No hay productos bajo el mínimo sin compra en curso.</p>`}
      </div>
      <div class="lista">${ocs.map((o) => `<div class="item"><div class="row"><div class="t">OC ${o.nro_oc} · ${esc(o.proveedor.razon_social)}</div><span class="sp"></span>${badge(o.estado)}</div>
        <div class="m">Emitida ${fecha(o.fecha)}${o.fecha_recepcion ? " · recibida " + fecha(o.fecha_recepcion) : ""}</div>
        <div class="row" style="margin:8px 0">${o.detalle_orden_compra.map((d) => `<span class="b">${esc(d.sku)} × ${d.cantidad}</span>`).join(" ")}</div>
        ${o.estado === "PENDIENTE" ? `<div class="row"><button class="btn s v" data-rec="${o.nro_oc}">Registrar recepción</button><button class="btn s l" data-can="${o.nro_oc}">Cancelar</button></div>` : ""}</div>`).join("") || `<p class="vacio">Todavía no hay órdenes de compra.</p>`}</div>`;
    vista.querySelectorAll("[data-oc]").forEach((b) => (b.onclick = async () => {
      const p = rep.find((x) => x.sku === b.dataset.oc); b.disabled = true;
      try {
        const [oc] = await q(db.from("orden_compra").insert({ cuit_proveedor: p.cuit_proveedor }).select());
        await q(db.from("detalle_orden_compra").insert({ nro_oc: oc.nro_oc, sku: p.sku, cantidad: p.lote_reposicion }));
        toast(`Orden de compra ${oc.nro_oc} emitida`, "ok"); recargar();
      } catch (e) { toast(e.message, "err"); b.disabled = false; }
    }));
    vista.querySelectorAll("[data-can]").forEach((b) => (b.onclick = async () => {
      try { await q(db.from("orden_compra").update({ estado: "CANCELADA" }).eq("nro_oc", b.dataset.can)); toast("Orden cancelada"); recargar(); } catch (e) { toast(e.message, "err"); }
    }));
    vista.querySelectorAll("[data-rec]").forEach((b) => (b.onclick = () => recibir(ocs.find((o) => o.nro_oc == b.dataset.rec))));
  }
  async function recibir(oc) {
    const ubs = await q(db.from("ubicacion").select("*").order("codigo_deposito"));
    const opts = ubs.map((u) => `<option value="${ubic(u)}">${ubic(u)} (cap. ${u.capacidad_unid})</option>`).join("");
    modal(`Recepción de OC ${oc.nro_oc}`, `<p class="sub">Controlá el remito y elegí dónde se guarda cada producto. Si llegó menos, corregí la cantidad.</p>
      ${oc.detalle_orden_compra.map((d, i) => `<label>${esc(d.sku)} (pedido ${d.cantidad})</label><div class="lin" style="grid-template-columns:1fr 90px"><select id="u${i}">${opts}</select><input id="c${i}" type="number" min="0" value="${d.cantidad}"></div>`).join("")}
      <button class="btn v" id="ok" style="width:100%;margin-top:12px">Confirmar ingreso</button>`, (m) => {
      $("#ok", m).onclick = async () => {
        $("#ok", m).disabled = true;
        try {
          for (const [i, d] of oc.detalle_orden_compra.entries()) {
            const c = +$("#c" + i, m).value; if (!c) continue;
            const [dep, pas, est, niv] = $("#u" + i, m).value.split("-");
            await q(db.from("movimiento_stock").insert({ tipo: "INGRESO", sku: d.sku, codigo_deposito: dep, pasillo: pas, estante: +est, nivel: +niv, cantidad: c, nro_oc: oc.nro_oc, observacion: `Recepción OC ${oc.nro_oc}` }));
          }
          await q(db.from("orden_compra").update({ estado: "RECIBIDA", fecha_recepcion: hoy() }).eq("nro_oc", oc.nro_oc));
          cerrarModal(); toast("Mercadería ingresada al stock", "ok"); recargar();
        } catch (e) { toast(e.message, "err"); $("#ok", m).disabled = false; }
      };
    });
  }

  /* ---------------- Pedidos (F3 preparación) ---------------- */
  async function pedidos() {
    const peds = await q(db.from("pedido").select("*, cliente(razon_social, zona), detalle_pedido(sku, cantidad)").order("nro_pedido", { ascending: false }));
    let filtro = "abiertos";
    const pinta = () => {
      const l = peds.filter((p) => filtro === "todos" || ["PENDIENTE", "PREPARADO", "DESPACHADO"].includes(p.estado));
      $("#lst").innerHTML = l.map((p) => `<div class="item"><div class="row"><div class="t">Pedido ${p.nro_pedido} · ${esc(p.cliente.razon_social)}</div><span class="sp"></span>${badge(p.estado)}</div>
        <div class="m">${esc(p.cliente.zona)} · ${fecha(p.fecha)} · compromiso ${fecha(p.fecha_compromiso)}</div>
        <div class="row" style="margin:8px 0">${p.detalle_pedido.map((d) => `<span class="b">${esc(d.sku)} × ${d.cantidad}</span>`).join(" ")}</div>
        ${p.estado === "PENDIENTE" ? `<div class="row"><button class="btn s v" data-prep="${p.nro_pedido}">Preparar</button><button class="btn s l" data-can="${p.nro_pedido}">Cancelar</button></div>` : ""}</div>`).join("") || `<p class="vacio">No hay pedidos.</p>`;
      vista.querySelectorAll("[data-prep]").forEach((b) => (b.onclick = () => preparar(peds.find((p) => p.nro_pedido == b.dataset.prep))));
      vista.querySelectorAll("[data-can]").forEach((b) => (b.onclick = async () => { try { await q(db.from("pedido").update({ estado: "CANCELADO" }).eq("nro_pedido", b.dataset.can)); toast("Pedido cancelado"); recargar(); } catch (e) { toast(e.message, "err"); } }));
    };
    vista.innerHTML = `<h2>Pedidos de clientes</h2><p class="sub">Alta de pedidos y preparación (picking) desde las ubicaciones.</p>
      <div class="row" style="margin-bottom:10px"><div class="chips" style="margin:0"><span class="chip on" data-f="abiertos">Abiertos</span><span class="chip" data-f="todos">Todos</span></div><span class="sp"></span><button class="btn" id="nuevo">+ Nuevo pedido</button></div>
      <div class="lista" id="lst"></div>`;
    vista.querySelectorAll(".chip").forEach((c) => (c.onclick = () => { filtro = c.dataset.f; vista.querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === c)); pinta(); }));
    $("#nuevo").onclick = nuevoPedido; pinta();
  }
  async function nuevoPedido() {
    const cli = await q(db.from("cliente").select("*").order("razon_social"));
    const prods = await q(db.from("v_stock_producto").select("sku, descripcion, unidades").order("sku"));
    const opP = prods.map((p) => `<option value="${esc(p.sku)}">${esc(p.sku)} · ${esc(p.descripcion)} (${p.unidades})</option>`).join("");
    const f = new Date(); f.setDate(f.getDate() + 2);
    modal("Nuevo pedido", `<label>Cliente</label><select id="cli">${cli.map((c) => `<option value="${c.cuit}">${esc(c.razon_social)} · ${esc(c.zona)}</option>`).join("")}</select>
      <label>Fecha comprometida de entrega</label><input type="date" id="fc" value="${f.toLocaleDateString("en-CA")}">
      <label>Productos</label><div id="lins"></div><button class="btn s l" id="mas">+ Agregar renglón</button>
      <button class="btn v" id="ok" style="width:100%;margin-top:14px">Registrar pedido</button>`, (m) => {
      const agregar = () => { const d = document.createElement("div"); d.className = "lin"; d.innerHTML = `<select>${opP}</select><input type="number" min="1" value="1"><button class="x" title="Quitar">×</button>`; d.querySelector("button").onclick = () => d.remove(); $("#lins", m).appendChild(d); };
      agregar(); $("#mas", m).onclick = agregar;
      $("#ok", m).onclick = async () => {
        const lineas = [...m.querySelectorAll(".lin")].map((l) => ({ sku: l.querySelector("select").value, cantidad: +l.querySelector("input").value })).filter((l) => l.cantidad > 0);
        if (!lineas.length) return toast("Agregá al menos un producto", "err");
        if (new Set(lineas.map((l) => l.sku)).size !== lineas.length) return toast("Hay productos repetidos", "err");
        $("#ok", m).disabled = true;
        try {
          const [p] = await q(db.from("pedido").insert({ cuit_cliente: $("#cli", m).value, fecha_compromiso: $("#fc", m).value }).select());
          await q(db.from("detalle_pedido").insert(lineas.map((l) => ({ ...l, nro_pedido: p.nro_pedido }))));
          cerrarModal(); toast(`Pedido ${p.nro_pedido} registrado`, "ok"); recargar();
        } catch (e) { toast(e.message, "err"); $("#ok", m).disabled = false; }
      };
    });
  }
  async function preparar(p) {
    const st = await q(db.from("stock").select("*").in("sku", p.detalle_pedido.map((d) => d.sku)).gt("cantidad", 0));
    const faltan = p.detalle_pedido.filter((d) => st.filter((s) => s.sku === d.sku).reduce((a, s) => a + s.cantidad, 0) < d.cantidad);
    modal(`Preparar pedido ${p.nro_pedido}`, `<p class="sub">Indicá de qué ubicación se retira cada renglón.</p>
      ${faltan.length ? `<div class="aviso">Stock insuficiente para: ${faltan.map((d) => esc(d.sku)).join(", ")}. No se puede preparar completo.</div>` : ""}
      ${p.detalle_pedido.map((d, i) => `<label>${esc(d.sku)} × ${d.cantidad}</label><select id="u${i}">${st.filter((s) => s.sku === d.sku).sort((a, b) => b.cantidad - a.cantidad).map((s) => `<option value="${ubic(s)}">${ubic(s)} · hay ${s.cantidad}</option>`).join("") || "<option value=''>Sin stock</option>"}</select>`).join("")}
      <button class="btn v" id="ok" style="width:100%;margin-top:14px" ${faltan.length ? "disabled" : ""}>Confirmar picking</button>`, (m) => {
      $("#ok", m).onclick = async () => {
        $("#ok", m).disabled = true;
        try {
          for (const [i, d] of p.detalle_pedido.entries()) {
            const [dep, pas, est, niv] = $("#u" + i, m).value.split("-");
            await q(db.from("movimiento_stock").insert({ tipo: "EGRESO", sku: d.sku, codigo_deposito: dep, pasillo: pas, estante: +est, nivel: +niv, cantidad: d.cantidad, nro_pedido: p.nro_pedido }));
          }
          await q(db.from("pedido").update({ estado: "PREPARADO" }).eq("nro_pedido", p.nro_pedido));
          cerrarModal(); toast(`Pedido ${p.nro_pedido} preparado`, "ok"); recargar();
        } catch (e) { toast(e.message, "err"); $("#ok", m).disabled = false; }
      };
    });
  }

  /* ---------------- Rutas (F4 planificación) ---------------- */
  async function rutas() {
    const hojas = await q(db.from("v_hojas_ruta").select("*").order("id_hoja", { ascending: false }));
    const ents = await q(db.from("entrega").select("*, pedido(nro_pedido, fecha_compromiso, cliente(razon_social, direccion_entrega))").order("orden_visita"));
    vista.innerHTML = `<h2>Hojas de ruta</h2><p class="sub">Armado del viaje, carga del vehículo y registro de cada entrega.</p>
      <div class="row" style="margin-bottom:10px"><span class="sp"></span><button class="btn" id="nueva">+ Nueva hoja de ruta</button></div>
      <div class="lista">${hojas.map((h) => {
        const es = ents.filter((e) => e.id_hoja === h.id_hoja);
        return `<div class="item"><div class="row"><div class="t">Hoja ${h.id_hoja} · ${fecha(h.fecha)}</div><span class="sp"></span>${badge(h.estado)}</div>
          <div class="m">${esc(h.vehiculo)} ${esc(h.patente)} · ${esc(h.chofer)}${h.fecha_hora_salida ? " · salida " + hora(h.fecha_hora_salida) : ""}${h.fecha_hora_regreso ? " · regreso " + hora(h.fecha_hora_regreso) : ""}</div>
          <div class="row" style="margin:8px 0"><span style="font-size:12px">Carga ${num(h.carga_kg, 1)} de ${num(h.capacidad_kg)} kg</span><div class="sp bar ${h.pct_carga >= 90 ? "full" : h.pct_carga >= 75 ? "alta" : ""}"><i style="width:${Math.min(100, h.pct_carga)}%"></i></div><b style="font-size:12px">${num(h.pct_carga, 0)} %</b></div>
          ${es.map((e) => `<div class="row" style="padding:6px 0;border-top:1px solid var(--borde)"><span class="b">${e.orden_visita}</span><div><b>Pedido ${e.nro_pedido}</b> · ${esc(e.pedido.cliente.razon_social)}<div style="font-size:12px;color:var(--gris)">${esc(e.pedido.cliente.direccion_entrega)}${e.receptor ? " · recibió " + esc(e.receptor) : ""}${e.motivo_rechazo ? " · " + esc(e.motivo_rechazo) : ""}</div></div><span class="sp"></span>${badge(e.estado)}
            ${h.estado === "EN_CURSO" && e.estado === "PENDIENTE" ? `<button class="btn s v" data-ent="${e.id_entrega}">Entregada</button><button class="btn s r" data-rech="${e.id_entrega}">Rechazo</button>` : ""}</div>`).join("") || `<p class="vacio">Sin entregas asignadas.</p>`}
          <div class="row" style="margin-top:8px">
            ${h.estado === "PLANIFICADA" ? `<button class="btn s l" data-add="${h.id_hoja}">+ Agregar pedido</button><button class="btn s" data-sal="${h.id_hoja}" ${es.length ? "" : "disabled"}>Registrar salida</button>` : ""}
            ${h.estado === "EN_CURSO" ? `<button class="btn s" data-cer="${h.id_hoja}" ${es.some((e) => e.estado === "PENDIENTE") ? "disabled" : ""}>Cerrar hoja</button>` : ""}
          </div></div>`; }).join("") || `<p class="vacio">No hay hojas de ruta.</p>`}</div>`;
    $("#nueva").onclick = nuevaHoja;
    const H = (id) => hojas.find((h) => h.id_hoja == id), E = (id) => ents.find((e) => e.id_entrega == id);
    vista.querySelectorAll("[data-add]").forEach((b) => (b.onclick = () => agregarPedido(H(b.dataset.add), ents.filter((e) => e.id_hoja == b.dataset.add))));
    vista.querySelectorAll("[data-sal]").forEach((b) => (b.onclick = async () => {
      try {
        const es = ents.filter((e) => e.id_hoja == b.dataset.sal);
        await q(db.from("hoja_ruta").update({ estado: "EN_CURSO", fecha_hora_salida: new Date().toISOString() }).eq("id_hoja", b.dataset.sal));
        await q(db.from("pedido").update({ estado: "DESPACHADO" }).in("nro_pedido", es.map((e) => e.nro_pedido)));
        toast("Salida registrada", "ok"); recargar();
      } catch (e) { toast(e.message, "err"); }
    }));
    vista.querySelectorAll("[data-cer]").forEach((b) => (b.onclick = async () => {
      try { await q(db.from("hoja_ruta").update({ estado: "CERRADA", fecha_hora_regreso: new Date().toISOString() }).eq("id_hoja", b.dataset.cer)); toast("Hoja de ruta cerrada", "ok"); recargar(); } catch (e) { toast(e.message, "err"); }
    }));
    vista.querySelectorAll("[data-ent]").forEach((b) => (b.onclick = () => registrar(E(b.dataset.ent), true)));
    vista.querySelectorAll("[data-rech]").forEach((b) => (b.onclick = () => registrar(E(b.dataset.rech), false)));
  }
  async function nuevaHoja() {
    const veh = await q(db.from("vehiculo").select("*").eq("activo", true).order("capacidad_kg"));
    const cho = await q(db.from("chofer").select("*").gte("licencia_vencimiento", hoy()).order("nombre"));
    modal("Nueva hoja de ruta", `<label>Fecha</label><input type="date" id="f" value="${hoy()}">
      <label>Vehículo (solo activos)</label><select id="v">${veh.map((v) => `<option value="${v.patente}">${esc(v.descripcion)} · ${v.patente} · ${num(v.capacidad_kg)} kg</option>`).join("")}</select>
      <label>Chofer (solo con licencia vigente)</label><select id="c">${cho.map((c) => `<option value="${c.legajo}">${esc(c.nombre)} · legajo ${c.legajo}</option>`).join("")}</select>
      <button class="btn v" id="ok" style="width:100%;margin-top:14px">Crear hoja</button>`, (m) => {
      $("#ok", m).onclick = async () => {
        try { const [h] = await q(db.from("hoja_ruta").insert({ fecha: $("#f", m).value, patente: $("#v", m).value, legajo_chofer: +$("#c", m).value }).select()); cerrarModal(); toast(`Hoja ${h.id_hoja} creada`, "ok"); recargar(); } catch (e) { toast(e.message, "err"); }
      };
    });
  }
  async function agregarPedido(h, es) {
    const peds = await q(db.from("pedido").select("nro_pedido, fecha_compromiso, cliente(razon_social, zona), detalle_pedido(cantidad, producto(peso_unitario_kg)), entrega(id_entrega)").eq("estado", "PREPARADO").order("fecha_compromiso"));
    const libres = peds.filter((p) => !p.entrega || (Array.isArray(p.entrega) ? !p.entrega.length : false));
    const peso = (p) => p.detalle_pedido.reduce((a, d) => a + d.cantidad * d.producto.peso_unitario_kg, 0);
    const disp = h.capacidad_kg - h.carga_kg;
    modal(`Agregar pedido a la hoja ${h.id_hoja}`, `<p class="sub">Capacidad disponible: <b>${num(disp, 1)} kg</b>. Solo pedidos PREPARADOS sin hoja.</p>
      ${libres.length ? `<label>Pedido</label><select id="p">${libres.map((p) => `<option value="${p.nro_pedido}">Pedido ${p.nro_pedido} · ${esc(p.cliente.razon_social)} · ${num(peso(p), 1)} kg · compromiso ${fecha(p.fecha_compromiso)}</option>`).join("")}</select>
      <label>Orden de visita</label><input type="number" id="o" min="1" value="${es.length + 1}">
      <button class="btn v" id="ok" style="width:100%;margin-top:14px">Agregar</button>` : `<p class="vacio">No hay pedidos preparados pendientes de despacho.</p>`}`, (m) => {
      if (!libres.length) return;
      $("#ok", m).onclick = async () => {
        try { await q(db.from("entrega").insert({ nro_pedido: +$("#p", m).value, id_hoja: h.id_hoja, orden_visita: +$("#o", m).value })); cerrarModal(); toast("Pedido agregado a la hoja", "ok"); recargar(); } catch (e) { toast(e.message, "err"); }
      };
    });
  }
  function registrar(e, ok) {
    modal(ok ? `Entrega del pedido ${e.nro_pedido}` : `Rechazo del pedido ${e.nro_pedido}`,
      ok ? `<label>Recibió (nombre de quien firma el remito)</label><input id="t" placeholder="Nombre y apellido"><button class="btn v" id="ok" style="width:100%;margin-top:14px">Confirmar entrega</button>`
         : `<label>Motivo del rechazo</label><select id="t"><option>Comercio cerrado</option><option>Mercadería dañada</option><option>Pedido con diferencias</option><option>Cliente sin fondos</option></select><button class="btn r" id="ok" style="width:100%;margin-top:14px">Registrar rechazo</button>`, (m) => {
      $("#ok", m).onclick = async () => {
        const t = $("#t", m).value.trim(); if (!t) return toast("Completá el dato", "err");
        try {
          await q(db.from("entrega").update(ok ? { estado: "ENTREGADA", receptor: t, fecha_hora_entrega: new Date().toISOString() } : { estado: "RECHAZADA", motivo_rechazo: t, fecha_hora_entrega: new Date().toISOString() }).eq("id_entrega", e.id_entrega));
          await q(db.from("pedido").update({ estado: ok ? "ENTREGADO" : "RECHAZADO" }).eq("nro_pedido", e.nro_pedido));
          cerrarModal(); toast(ok ? "Entrega registrada" : "Rechazo registrado", ok ? "ok" : ""); recargar();
        } catch (err) { toast(err.message, "err"); }
      };
    });
  }

  /* ---------------- Movimientos (F2 trazabilidad) ---------------- */
  async function movimientos() {
    const mov = await q(db.from("movimiento_stock").select("*").order("id_movimiento", { ascending: false }).limit(60));
    vista.innerHTML = `<h2>Movimientos de stock</h2><p class="sub">Historial de ingresos, egresos y ajustes: de dónde vino y a dónde fue cada unidad.</p>
      <div class="row" style="margin-bottom:10px"><span class="sp"></span><button class="btn" id="aj">+ Ajuste de inventario</button></div>
      <div class="card wrap"><table class="tabla"><tr><th>#</th><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Ubicación</th><th>Cant.</th><th class="solo-desk">Origen</th></tr>
      ${mov.map((m) => `<tr><td>${m.id_movimiento}</td><td>${hora(m.fecha_hora)}</td><td>${badge(m.tipo)}</td><td>${esc(m.sku)}</td><td>${ubic(m)}</td><td><b>${m.tipo === "EGRESO" ? "-" : m.cantidad > 0 ? "+" : ""}${m.cantidad}</b></td><td class="solo-desk">${m.nro_pedido ? "Pedido " + m.nro_pedido : m.nro_oc ? "OC " + m.nro_oc : esc(m.observacion || "")}</td></tr>`).join("")}</table></div>`;
    $("#aj").onclick = async () => {
      const st = await q(db.from("stock").select("*").order("sku"));
      const ubs = await q(db.from("ubicacion").select("*").order("codigo_deposito"));
      const prods = await q(db.from("producto").select("sku, descripcion").order("sku"));
      modal("Ajuste de inventario", `<p class="sub">Para diferencias de conteo, roturas o vencimientos. Usá negativo para restar.</p>
        <label>Producto</label><select id="s">${prods.map((p) => `<option value="${esc(p.sku)}">${esc(p.sku)} · ${esc(p.descripcion)}</option>`).join("")}</select>
        <label>Ubicación</label><select id="u">${ubs.map((u) => `<option>${ubic(u)}</option>`).join("")}</select>
        <label>Cantidad (+ / -)</label><input id="c" type="number" value="-1">
        <label>Motivo</label><input id="o" placeholder="Ej.: rotura en manipulación">
        <button class="btn v" id="ok" style="width:100%;margin-top:14px">Registrar ajuste</button>`, (m) => {
        const actual = () => { const s = st.find((x) => x.sku === $("#s", m).value && ubic(x) === $("#u", m).value); $("#c", m).title = "Stock actual: " + (s ? s.cantidad : 0); };
        $("#s", m).onchange = $("#u", m).onchange = actual; actual();
        $("#ok", m).onclick = async () => {
          const c = +$("#c", m).value, o = $("#o", m).value.trim();
          if (!c || !o) return toast("Indicá cantidad y motivo", "err");
          const [dep, pas, est, niv] = $("#u", m).value.split("-");
          try { await q(db.from("movimiento_stock").insert({ tipo: "AJUSTE", sku: $("#s", m).value, codigo_deposito: dep, pasillo: pas, estante: +est, nivel: +niv, cantidad: c, observacion: o })); cerrarModal(); toast("Ajuste registrado", "ok"); recargar(); } catch (e) { toast(e.message, "err"); }
        };
      });
    };
  }

  /* ---------------- Flota ---------------- */
  async function flota() {
    const veh = await q(db.from("vehiculo").select("*").order("patente"));
    const cho = await q(db.from("chofer").select("*").order("legajo"));
    const h = hoy();
    vista.innerHTML = `<h2>Flota y choferes</h2><p class="sub">Solo se planifican vehículos activos y choferes con licencia vigente.</p>
      <div class="grid2"><div class="card"><h3>Vehículos</h3>${veh.map((v) => `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--borde)"><div><b>${esc(v.patente)}</b> · ${esc(v.descripcion)}<div style="font-size:12px;color:var(--gris)">Capacidad ${num(v.capacidad_kg)} kg</div></div><span class="sp"></span>${v.activo ? `<span class="b ok">ACTIVO</span>` : `<span class="b mal">FUERA DE SERVICIO</span>`}</div>`).join("")}</div>
      <div class="card"><h3>Choferes</h3>${cho.map((c) => `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--borde)"><div><b>${esc(c.nombre)}</b> · legajo ${c.legajo}<div style="font-size:12px;color:var(--gris)">Licencia hasta ${fecha(c.licencia_vencimiento)}</div></div><span class="sp"></span>${c.licencia_vencimiento >= h ? `<span class="b ok">VIGENTE</span>` : `<span class="b mal">VENCIDA</span>`}</div>`).join("")}</div></div>`;
  }

  db.from("deposito").select("codigo", { count: "exact", head: true }).then(({ error }) => {
    const p = $("#estadoConexion");
    if (error) { p.textContent = "Sin conexión"; p.classList.add("err"); } else { p.textContent = "En línea"; p.classList.add("ok"); }
  });
  window.addEventListener("hashchange", recargar);
  recargar();
})();
