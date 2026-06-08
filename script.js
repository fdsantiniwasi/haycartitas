const SUPABASE_URL = "https://ajczyfoyrmrklbeixdum.supabase.co";
const SUPABASE_KEY = "sb_publishable_30cWHLbp6e5CK7JsAoVvjw_yvKjj42L";

let supabaseClient = null;

if (
  SUPABASE_URL !== "PEGA_AQUI_TU_SUPABASE_URL" &&
  SUPABASE_KEY !== "PEGA_AQUI_TU_PUBLISHABLE_KEY"
) {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let tiendaSeleccionada = null;
let mapa = null;
let marcadores = [];
let marcadoresPorTienda = {};
let ubicacionNuevaTienda = null;
let marcadorTemporal = null;
let modoSeleccionUbicacion = false;
let tiendasConHistorialAbierto = [];
let tiendas = [];

function generarId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function buscarTiendaPorId(idTienda) {
  return tiendas.find(function(tienda) {
    return String(tienda.id) === String(idTienda);
  });
}

function buscarReportePorId(tienda, idReporte) {
  if (!tienda.reportes) {
    return null;
  }

  return tienda.reportes.find(function(reporte) {
    return String(reporte.id) === String(idReporte);
  });
}

function obtenerTiempoRelativo(fechaISO) {
  if (!fechaISO) {
    return "Sin reporte reciente";
  }

  const fechaReporte = new Date(fechaISO);
  const ahora = new Date();

  const diferenciaMs = ahora - fechaReporte;
  const diferenciaMinutos = Math.floor(diferenciaMs / 1000 / 60);
  const diferenciaHoras = Math.floor(diferenciaMinutos / 60);
  const diferenciaDias = Math.floor(diferenciaHoras / 24);

  if (diferenciaMinutos < 1) {
    return "Hace un momento";
  }

  if (diferenciaMinutos < 60) {
    return "Hace " + diferenciaMinutos + " minuto" + (diferenciaMinutos === 1 ? "" : "s");
  }

  if (diferenciaHoras < 24) {
    return "Hace " + diferenciaHoras + " hora" + (diferenciaHoras === 1 ? "" : "s");
  }

  return "Hace " + diferenciaDias + " día" + (diferenciaDias === 1 ? "" : "s");
}

function convertirDatosDeSupabase(tiendasData, reportesData) {
  return tiendasData.map(function(tienda) {
    const reportesDeLaTienda = reportesData
      .filter(function(reporte) {
        return String(reporte.tienda_id) === String(tienda.id);
      })
      .map(function(reporte) {
        return {
          id: reporte.id,
          estado: reporte.estado,
          comentario: reporte.comentario || "Reporte sin comentario.",
          usuario: reporte.usuario || "Usuario anónimo",
          fechaISO: reporte.created_at,
          confirmaciones: reporte.confirmaciones || 0,
          desactualizado: reporte.desactualizado || 0
        };
      });

    return {
      id: tienda.id,
      nombre: tienda.nombre,
      tipo: tienda.tipo,
      zona: tienda.zona,
      estado: tienda.estado,
      ultimoReporte: obtenerTiempoRelativo(tienda.fecha_ultimo_reporte),
      comentario: tienda.comentario || "Sin comentario.",
      lat: tienda.lat,
      lng: tienda.lng,
      fechaUltimoReporteISO: tienda.fecha_ultimo_reporte,
      reportes: reportesDeLaTienda
    };
  });
}

async function cargarTiendasDesdeSupabase() {
  const contenedor = document.getElementById("lista-tiendas");

  if (contenedor) {
    contenedor.innerHTML = "<p>Cargando tiendas desde Supabase...</p>";
  }

  if (!supabaseClient) {
    if (contenedor) {
      contenedor.innerHTML = `
        <p>
          Falta configurar Supabase. Abre <strong>script.js</strong> y reemplaza
          <strong>SUPABASE_URL</strong> y <strong>SUPABASE_KEY</strong>.
        </p>
      `;
    }

    return;
  }

  const resultadoTiendas = await supabaseClient
    .from("tiendas")
    .select("*")
    .order("created_at", { ascending: true });

  if (resultadoTiendas.error) {
    console.error(resultadoTiendas.error);

    if (contenedor) {
      contenedor.innerHTML = "<p>Error cargando tiendas desde Supabase.</p>";
    }

    alert("No se pudieron cargar las tiendas desde Supabase.");
    return;
  }

  const resultadoReportes = await supabaseClient
    .from("reportes")
    .select("*")
    .order("created_at", { ascending: false });

  if (resultadoReportes.error) {
    console.error(resultadoReportes.error);

    if (contenedor) {
      contenedor.innerHTML = "<p>Error cargando reportes desde Supabase.</p>";
    }

    alert("No se pudieron cargar los reportes desde Supabase.");
    return;
  }

  tiendas = convertirDatosDeSupabase(
    resultadoTiendas.data || [],
    resultadoReportes.data || []
  );

  mostrarTiendas(tiendas);
}

function guardarTiendasEnNavegador() {
  console.log("Modo Supabase: ya no usamos localStorage para guardar tiendas.");
}

async function borrarTiendasGuardadas() {
  await cargarTiendasDesdeSupabase();
  alert("Datos recargados desde Supabase.");
}

function actualizarResumen() {
  document.getElementById("total-tiendas").textContent = tiendas.length;

  document.getElementById("total-si-hay").textContent = tiendas.filter(function(tienda) {
    return tienda.estado === "si_hay";
  }).length;

  document.getElementById("total-se-acabaron").textContent = tiendas.filter(function(tienda) {
    return tienda.estado === "se_acabaron";
  }).length;

  document.getElementById("total-no-confirmado").textContent = tiendas.filter(function(tienda) {
    return tienda.estado === "no_confirmado";
  }).length;

  document.getElementById("total-proximamente").textContent = tiendas.filter(function(tienda) {
    return tienda.estado === "proximamente";
  }).length;
}

function actualizarTiemposDeReportes() {
  tiendas.forEach(function(tienda) {
    tienda.ultimoReporte = obtenerTiempoRelativo(tienda.fechaUltimoReporteISO);
  });
}

function pedirNombreParaVotar() {
  const nombre = prompt("Escribe tu nombre para registrar tu voto:");

  if (!nombre) {
    return null;
  }

  const nombreLimpio = nombre.trim();

  if (nombreLimpio === "") {
    return null;
  }

  return nombreLimpio;
}

function detectarErrorDeVotoDuplicado(error) {
  if (!error) {
    return false;
  }

  if (error.code === "23505") {
    return true;
  }

  if (error.message && error.message.toLowerCase().includes("duplicate")) {
    return true;
  }

  return false;
}

async function actualizarContadorReporteEnSupabase(idReporte, campo, nuevoValor) {
  const datosActualizar = {};
  datosActualizar[campo] = nuevoValor;

  const resultado = await supabaseClient
    .from("reportes")
    .update(datosActualizar)
    .eq("id", idReporte);

  if (resultado.error) {
    console.error(resultado.error);
    alert("El voto se guardó, pero no se pudo actualizar el contador del reporte.");
    return false;
  }

  return true;
}

async function actualizarTiendaDesactualizadaEnSupabase(tienda) {
  const fechaActual = new Date().toISOString();

  const resultado = await supabaseClient
    .from("tiendas")
    .update({
      estado: "no_confirmado",
      comentario: "El reporte más reciente fue marcado como probablemente desactualizado.",
      fecha_ultimo_reporte: fechaActual
    })
    .eq("id", tienda.id);

  if (resultado.error) {
    console.error(resultado.error);
    alert("El reporte fue marcado como desactualizado, pero no se pudo actualizar la tienda.");
    return false;
  }

  return true;
}

async function guardarVotoReporteEnSupabase(idTienda, idReporte, tipoVoto) {
  if (!supabaseClient) {
    alert("Supabase no está configurado.");
    return;
  }

  const tienda = buscarTiendaPorId(idTienda);

  if (!tienda) {
    alert("No encontramos esa tienda.");
    return;
  }

  const reporte = buscarReportePorId(tienda, idReporte);

  if (!reporte) {
    alert("No encontramos ese reporte.");
    return;
  }

  const usuarioNombre = pedirNombreParaVotar();

  if (!usuarioNombre) {
    alert("Para votar necesitas escribir tu nombre.");
    return;
  }

  const resultadoVoto = await supabaseClient
    .from("votos_reportes")
    .insert({
      reporte_id: idReporte,
      usuario_nombre: usuarioNombre,
      tipo_voto: tipoVoto
    });

  if (resultadoVoto.error) {
    console.error(resultadoVoto.error);

    if (detectarErrorDeVotoDuplicado(resultadoVoto.error)) {
      alert("Ese nombre ya votó en este reporte. Cada nombre solo puede votar una vez por reporte.");
      return;
    }

    alert("No se pudo guardar el voto en Supabase.");
    return;
  }

  let campoActualizar = "";
  let nuevoValor = 0;

  if (tipoVoto === "confirmar") {
    campoActualizar = "confirmaciones";
    nuevoValor = reporte.confirmaciones + 1;
  }

  if (tipoVoto === "ya_no_aplica") {
    campoActualizar = "desactualizado";
    nuevoValor = reporte.desactualizado + 1;
  }

  const contadorActualizado = await actualizarContadorReporteEnSupabase(
    idReporte,
    campoActualizar,
    nuevoValor
  );

  if (!contadorActualizado) {
    return;
  }

  const esReporteMasReciente =
    tienda.reportes &&
    tienda.reportes[0] &&
    String(tienda.reportes[0].id) === String(idReporte);

  if (tipoVoto === "ya_no_aplica" && esReporteMasReciente && nuevoValor >= 3) {
    const tiendaActualizada = await actualizarTiendaDesactualizadaEnSupabase(tienda);

    if (!tiendaActualizada) {
      return;
    }
  }

  await cargarTiendasDesdeSupabase();

  if (tipoVoto === "confirmar") {
    alert("Confirmación guardada en Supabase.");
  } else {
    alert("Voto de 'Ya no aplica' guardado en Supabase.");
  }
}

function iniciarMapa() {
  const contenedorMapa = document.getElementById("mapa");

  if (!contenedorMapa) {
    console.error("No existe el elemento con id mapa");
    return;
  }

  mapa = L.map("mapa").setView([27.0728, -109.4437], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(mapa);

  mapa.on("click", function(evento) {
    if (!modoSeleccionUbicacion) {
      return;
    }

    ubicacionNuevaTienda = {
      lat: evento.latlng.lat,
      lng: evento.latlng.lng
    };

    if (marcadorTemporal) {
      mapa.removeLayer(marcadorTemporal);
    }

    marcadorTemporal = L.marker([ubicacionNuevaTienda.lat, ubicacionNuevaTienda.lng]).addTo(mapa);

    marcadorTemporal.bindPopup("Ubicación seleccionada para nueva tienda").openPopup();

    const textoUbicacion = document.getElementById("ubicacion-seleccionada");

    if (textoUbicacion) {
      textoUbicacion.textContent =
        "Ubicación seleccionada: " +
        ubicacionNuevaTienda.lat.toFixed(5) +
        ", " +
        ubicacionNuevaTienda.lng.toFixed(5);
    }

    modoSeleccionUbicacion = false;

    if (mapa) {
      mapa.scrollWheelZoom.enable();
    }
  });

  setTimeout(function() {
    mapa.invalidateSize();
  }, 300);
}

function activarSeleccionUbicacion() {
  modoSeleccionUbicacion = true;

  const textoUbicacion = document.getElementById("ubicacion-seleccionada");

  if (textoUbicacion) {
    textoUbicacion.textContent = "Modo selección activado. Ahora haz clic en el mapa.";
  }

  if (mapa) {
    mapa.scrollWheelZoom.disable();
    mapa.getContainer().scrollIntoView({
      behavior: "smooth"
    });
  }
}

function limpiarMarcadores() {
  if (!mapa) {
    return;
  }

  marcadores.forEach(function(marcador) {
    mapa.removeLayer(marcador);
  });

  marcadores = [];
  marcadoresPorTienda = {};
}

function obtenerColorMarcador(estado) {
  if (estado === "si_hay") {
    return "green";
  }

  if (estado === "se_acabaron") {
    return "red";
  }

  if (estado === "no_confirmado") {
    return "orange";
  }

  if (estado === "proximamente") {
    return "blue";
  }

  return "gray";
}

function crearIcono(estado) {
  const color = obtenerColorMarcador(estado);

  return L.divIcon({
    className: "marcador-personalizado",
    html: `<div class="pin pin-${color}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
}

function mostrarMarcadores(lista) {
  if (!mapa) {
    return;
  }

  limpiarMarcadores();

  lista.forEach(function(tienda) {
    if (!tienda.lat || !tienda.lng) {
      return;
    }

    const marcador = L.marker([tienda.lat, tienda.lng], {
      icon: crearIcono(tienda.estado)
    }).addTo(mapa);

    marcador.bindPopup(`
      <strong>${tienda.nombre}</strong><br>
      ${obtenerTextoEstado(tienda.estado)}<br>
      <small>${tienda.zona}</small><br>
      <small>${obtenerTiempoRelativo(tienda.fechaUltimoReporteISO)}</small><br><br>
      <button onclick="reportarPorId('${tienda.id}')">
        Reportar
      </button>
    `);

    marcadores.push(marcador);
    marcadoresPorTienda[String(tienda.id)] = marcador;
  });
}

function obtenerTextoEstado(estado) {
  if (estado === "si_hay") {
    return "🟢 Sí hay";
  }

  if (estado === "se_acabaron") {
    return "🔴 Se acabaron";
  }

  if (estado === "no_confirmado") {
    return "🟡 No confirmado";
  }

  if (estado === "proximamente") {
    return "🔵 Próximamente";
  }

  return "Sin estado";
}

function obtenerEtiquetaConfianza(reporte) {
  if (reporte.desactualizado >= 3) {
    return `<span class="etiqueta-confianza etiqueta-desactualizada">Probablemente desactualizado</span>`;
  }

  if (reporte.confirmaciones >= 3) {
    return `<span class="etiqueta-confianza etiqueta-confiable">Reporte confiable</span>`;
  }

  return "";
}

function alternarHistorial(idTienda) {
  const idTexto = String(idTienda);

  if (tiendasConHistorialAbierto.includes(idTexto)) {
    tiendasConHistorialAbierto = tiendasConHistorialAbierto.filter(function(id) {
      return id !== idTexto;
    });
  } else {
    tiendasConHistorialAbierto.push(idTexto);
  }

  mostrarTiendas(tiendas);
}

function confirmarReporte(idTienda, idReporte) {
  guardarVotoReporteEnSupabase(idTienda, idReporte, "confirmar");
}

function marcarReporteDesactualizado(idTienda, idReporte) {
  guardarVotoReporteEnSupabase(idTienda, idReporte, "ya_no_aplica");
}

function crearHistorialHTML(tienda) {
  if (!tienda.reportes || tienda.reportes.length === 0) {
    return `
      <div class="historial-reportes">
        <h4>Historial de reportes</h4>
        <p>No hay reportes todavía.</p>
      </div>
    `;
  }

  const historialAbierto = tiendasConHistorialAbierto.includes(String(tienda.id));
  const reportesAMostrar = historialAbierto ? tienda.reportes : tienda.reportes.slice(0, 3);

  const listaReportes = reportesAMostrar.map(function(reporte) {
    return `
      <li>
        <span class="texto-reporte">
          ${obtenerTextoEstado(reporte.estado)} — ${reporte.comentario}
        </span>

        <span class="meta-reporte">
          ${obtenerTiempoRelativo(reporte.fechaISO)} · ${reporte.usuario}
        </span>

        ${obtenerEtiquetaConfianza(reporte)}

        <div class="confianza-reporte">
          <span class="contadores-confianza">
            Confirmaciones: ${reporte.confirmaciones} · Ya no aplica: ${reporte.desactualizado}
          </span>

          <button 
            class="boton-confirmar-reporte" 
            onclick="confirmarReporte('${tienda.id}', '${reporte.id}')"
          >
            Confirmar
          </button>

          <button 
            class="boton-desactualizado-reporte" 
            onclick="marcarReporteDesactualizado('${tienda.id}', '${reporte.id}')"
          >
            Ya no aplica
          </button>
        </div>
      </li>
    `;
  }).join("");

  let botonHistorial = "";

  if (tienda.reportes.length > 3) {
    botonHistorial = `
      <button class="boton-historial" onclick="alternarHistorial('${tienda.id}')">
        ${historialAbierto ? "Ver menos reportes" : "Ver todos los reportes"}
      </button>
    `;
  }

  return `
    <div class="historial-reportes">
      <h4>Historial de reportes</h4>
      <ul>
        ${listaReportes}
      </ul>
      ${botonHistorial}
    </div>
  `;
}

function mostrarTiendas(lista) {
  const contenedor = document.getElementById("lista-tiendas");

  if (!contenedor) {
    console.error("No existe el elemento con id lista-tiendas");
    return;
  }

  actualizarTiemposDeReportes();
  actualizarResumen();

  contenedor.innerHTML = "";

  if (lista.length === 0) {
    contenedor.innerHTML = "<p>No encontramos tiendas con esa búsqueda.</p>";
    mostrarMarcadores([]);
    return;
  }

  lista.forEach(function(tienda) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-tienda";

    tarjeta.innerHTML = `
      <span class="estado ${tienda.estado}">
        ${obtenerTextoEstado(tienda.estado)}
      </span>

      <h3>${tienda.nombre}</h3>

      <p><strong>Tipo:</strong> ${tienda.tipo}</p>
      <p><strong>Zona:</strong> ${tienda.zona}</p>
      <p><strong>Último reporte:</strong> ${obtenerTiempoRelativo(tienda.fechaUltimoReporteISO)}</p>
      <p><strong>Comentario actual:</strong> ${tienda.comentario}</p>

      ${crearHistorialHTML(tienda)}

      <div class="botones-tienda">
        <button class="boton-reporte" onclick="reportarPorId('${tienda.id}')">
          Reportar actualización
        </button>

        <button class="boton-ver-mapa" onclick="verTiendaEnMapa('${tienda.id}')">
          Ver en mapa
        </button>

        <button class="boton-como-llegar" onclick="abrirComoLlegar('${tienda.id}')">
          Cómo llegar
        </button>

        <button class="boton-eliminar" onclick="eliminarTienda('${tienda.id}')">
          Eliminar tienda
        </button>
      </div>
    `;

    contenedor.appendChild(tarjeta);
  });

  mostrarMarcadores(lista);
}

function mostrarTodas() {
  mostrarTiendas(tiendas);
}

function filtrarTiendas(estado) {
  const tiendasFiltradas = tiendas.filter(function(tienda) {
    return tienda.estado === estado;
  });

  mostrarTiendas(tiendasFiltradas);
}

function filtrarTiendasConReportesConfiables() {
  const tiendasConfiables = tiendas.filter(function(tienda) {
    if (!tienda.reportes) {
      return false;
    }

    return tienda.reportes.some(function(reporte) {
      return reporte.confirmaciones >= 3 && reporte.desactualizado < 3;
    });
  });

  mostrarTiendas(tiendasConfiables);
}

function buscarTiendas() {
  const buscador = document.getElementById("buscador");

  if (!buscador) {
    console.error("No existe el elemento con id buscador");
    return;
  }

  const texto = buscador.value.toLowerCase();

  const resultado = tiendas.filter(function(tienda) {
    return (
      tienda.nombre.toLowerCase().includes(texto) ||
      tienda.tipo.toLowerCase().includes(texto) ||
      tienda.zona.toLowerCase().includes(texto) ||
      tienda.estado.toLowerCase().includes(texto)
    );
  });

  mostrarTiendas(resultado);
}

function reportarPorId(idTienda) {
  tiendaSeleccionada = buscarTiendaPorId(idTienda);

  if (!tiendaSeleccionada) {
    alert("No encontramos esa tienda.");
    return;
  }

  document.getElementById("nombre-tienda-reporte").textContent = tiendaSeleccionada.nombre;
  document.getElementById("estado-reporte").value = tiendaSeleccionada.estado;
  document.getElementById("comentario-reporte").value = "";
  document.getElementById("usuario-reporte").value = "";

  document.getElementById("formulario-reporte").classList.remove("oculto");

  document.getElementById("formulario-reporte").scrollIntoView({
    behavior: "smooth"
  });
}

async function guardarReporte() {
  if (!tiendaSeleccionada) {
    alert("Primero selecciona una tienda.");
    return;
  }

  if (!supabaseClient) {
    alert("Supabase no está configurado.");
    return;
  }

  const nuevoEstado = document.getElementById("estado-reporte").value;
  const nuevoComentario = document.getElementById("comentario-reporte").value.trim();
  const usuario = document.getElementById("usuario-reporte").value.trim();

  let comentarioFinal = "";

  if (nuevoComentario !== "") {
    comentarioFinal = nuevoComentario;
  } else {
    comentarioFinal = "Reporte actualizado sin comentario.";
  }

  let usuarioFinal = "Usuario anónimo";

  if (usuario !== "") {
    usuarioFinal = usuario;
  }

  const fechaReporte = new Date().toISOString();

  const resultadoReporte = await supabaseClient
    .from("reportes")
    .insert({
      tienda_id: tiendaSeleccionada.id,
      estado: nuevoEstado,
      comentario: comentarioFinal,
      usuario: usuarioFinal,
      confirmaciones: 0,
      desactualizado: 0,
      created_at: fechaReporte
    })
    .select()
    .single();

  if (resultadoReporte.error) {
    console.error(resultadoReporte.error);
    alert("No se pudo guardar el reporte en Supabase.");
    return;
  }

  const resultadoTienda = await supabaseClient
    .from("tiendas")
    .update({
      estado: nuevoEstado,
      comentario: comentarioFinal,
      fecha_ultimo_reporte: fechaReporte
    })
    .eq("id", tiendaSeleccionada.id);

  if (resultadoTienda.error) {
    console.error(resultadoTienda.error);
    alert("El reporte se guardó, pero no se pudo actualizar la tienda.");
    return;
  }

  await cargarTiendasDesdeSupabase();
  cancelarReporte();

  alert("Reporte guardado correctamente en Supabase.");
}

function cancelarReporte() {
  tiendaSeleccionada = null;

  const formularioReporte = document.getElementById("formulario-reporte");

  if (formularioReporte) {
    formularioReporte.classList.add("oculto");
  }

  document.getElementById("nombre-tienda-reporte").textContent = "";
  document.getElementById("comentario-reporte").value = "";
  document.getElementById("usuario-reporte").value = "";
}

function verTiendaEnMapa(idTienda) {
  const tienda = buscarTiendaPorId(idTienda);

  if (!tienda) {
    alert("No encontramos esa tienda.");
    return;
  }

  if (!mapa) {
    alert("El mapa todavía no está listo.");
    return;
  }

  mapa.setView([tienda.lat, tienda.lng], 16);

  const marcador = marcadoresPorTienda[String(idTienda)];

  if (marcador) {
    marcador.openPopup();
  }

  mapa.getContainer().scrollIntoView({
    behavior: "smooth"
  });
}

function abrirComoLlegar(idTienda) {
  const tienda = buscarTiendaPorId(idTienda);

  if (!tienda) {
    alert("No encontramos esa tienda.");
    return;
  }

  const url = "https://www.google.com/maps/dir/?api=1&destination=" +
    tienda.lat + "," + tienda.lng;

  window.open(url, "_blank");
}

function eliminarTienda(idTienda) {
  alert("Por seguridad, borrar tiendas desde la app pública está desactivado en Supabase. Más adelante haremos modo administrador.");
}

function agregarNuevaTienda() {
  const nombreInput = document.getElementById("nombre-nueva-tienda");
  const tipoInput = document.getElementById("tipo-nueva-tienda");
  const zonaInput = document.getElementById("zona-nueva-tienda");
  const estadoInput = document.getElementById("estado-nueva-tienda");
  const comentarioInput = document.getElementById("comentario-nueva-tienda");
  const usuarioInput = document.getElementById("usuario-nueva-tienda");

  if (!nombreInput || !tipoInput || !zonaInput || !estadoInput || !comentarioInput || !usuarioInput) {
    alert("Hay un problema: falta un campo del formulario en el HTML.");
    return;
  }

  const nombre = nombreInput.value.trim();
  const tipo = tipoInput.value;
  const zona = zonaInput.value.trim();
  const estado = estadoInput.value;
  const comentario = comentarioInput.value.trim();
  const usuario = usuarioInput.value.trim();

  if (nombre === "") {
    alert("Escribe el nombre de la tienda.");
    return;
  }

  if (zona === "") {
    alert("Escribe la zona o colonia.");
    return;
  }

  if (!ubicacionNuevaTienda) {
    alert("Primero presiona 'Elegir ubicación en el mapa' y haz clic en el mapa.");
    return;
  }

  const tiendaYaExiste = tiendas.some(function(tienda) {
    return tienda.nombre.toLowerCase() === nombre.toLowerCase();
  });

  if (tiendaYaExiste) {
    alert("Esa tienda ya existe en la lista.");
    return;
  }

  let comentarioFinal = "";

  if (comentario !== "") {
    comentarioFinal = comentario;
  } else {
    comentarioFinal = "Tienda agregada por la comunidad.";
  }

  let usuarioFinal = "Usuario anónimo";

  if (usuario !== "") {
    usuarioFinal = usuario;
  }

  const ahoraISO = new Date().toISOString();

  const nuevaTienda = {
    id: generarId(),
    nombre: nombre,
    tipo: tipo,
    zona: zona,
    estado: estado,
    ultimoReporte: obtenerTiempoRelativo(ahoraISO),
    comentario: comentarioFinal,
    lat: ubicacionNuevaTienda.lat,
    lng: ubicacionNuevaTienda.lng,
    fechaUltimoReporteISO: ahoraISO,
    reportes: [
      {
        id: generarId(),
        estado: estado,
        comentario: comentarioFinal,
        usuario: usuarioFinal,
        fechaISO: ahoraISO,
        confirmaciones: 0,
        desactualizado: 0
      }
    ]
  };

  tiendas.push(nuevaTienda);

  guardarTiendasEnNavegador();
  mostrarTiendas(tiendas);
  limpiarFormularioNuevaTienda();

  alert("Tienda agregada solo en pantalla por ahora. En una clase próxima la guardaremos en Supabase.");
}

function limpiarFormularioNuevaTienda() {
  document.getElementById("nombre-nueva-tienda").value = "";
  document.getElementById("tipo-nueva-tienda").value = "OXXO";
  document.getElementById("zona-nueva-tienda").value = "";
  document.getElementById("estado-nueva-tienda").value = "no_confirmado";
  document.getElementById("comentario-nueva-tienda").value = "";
  document.getElementById("usuario-nueva-tienda").value = "";

  ubicacionNuevaTienda = null;
  modoSeleccionUbicacion = false;

  const textoUbicacion = document.getElementById("ubicacion-seleccionada");

  if (textoUbicacion) {
    textoUbicacion.textContent = "Todavía no has seleccionado ubicación.";
  }

  if (marcadorTemporal && mapa) {
    mapa.removeLayer(marcadorTemporal);
    marcadorTemporal = null;
  }

  if (mapa) {
    mapa.scrollWheelZoom.enable();
  }
}

async function iniciarApp() {
  iniciarMapa();
  await cargarTiendasDesdeSupabase();
}

iniciarApp();

setInterval(function() {
  if (tiendas.length > 0) {
    mostrarTiendas(tiendas);
  }
}, 60000);
