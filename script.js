let tiendaSeleccionada = null;
let mapa = null;
let marcadores = [];
let marcadoresPorTienda = {};
let ubicacionNuevaTienda = null;
let marcadorTemporal = null;
let modoSeleccionUbicacion = false;
let tiendasConHistorialAbierto = [];

let tiendas = [
  {
    id: 1,
    nombre: "Walmart Navojoa",
    tipo: "Supermercado",
    zona: "Navojoa",
    estado: "no_confirmado",
    ultimoReporte: "Sin reporte reciente",
    comentario: "Pendiente de confirmar si tiene cartitas.",
    lat: 27.0805,
    lng: -109.4447,
    fechaUltimoReporteISO: null,
    reportes: []
  },
  {
    id: 2,
    nombre: "OXXO Centro",
    tipo: "OXXO",
    zona: "Centro",
    estado: "si_hay",
    ultimoReporte: "Hace 35 minutos",
    comentario: "Usuario reportó sobres disponibles en caja.",
    lat: 27.0712,
    lng: -109.4439,
    fechaUltimoReporteISO: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    reportes: [
      {
        id: generarId(),
        estado: "si_hay",
        comentario: "Usuario reportó sobres disponibles en caja.",
        usuario: "Usuario inicial",
        fechaISO: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        confirmaciones: 0,
        desactualizado: 0
      }
    ]
  },
  {
    id: 3,
    nombre: "OXXO Sufragio Efectivo",
    tipo: "OXXO",
    zona: "Sufragio Efectivo",
    estado: "se_acabaron",
    ultimoReporte: "Hace 1 hora",
    comentario: "Se reportó que ya no quedaban sobres.",
    lat: 27.0761,
    lng: -109.4378,
    fechaUltimoReporteISO: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    reportes: [
      {
        id: generarId(),
        estado: "se_acabaron",
        comentario: "Se reportó que ya no quedaban sobres.",
        usuario: "Usuario inicial",
        fechaISO: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        confirmaciones: 0,
        desactualizado: 0
      }
    ]
  },
  {
    id: 4,
    nombre: "OXXO 16 de Septiembre",
    tipo: "OXXO",
    zona: "16 de Septiembre",
    estado: "proximamente",
    ultimoReporte: "Hoy",
    comentario: "Supuestamente llegan más cartitas mañana.",
    lat: 27.0648,
    lng: -109.4525,
    fechaUltimoReporteISO: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    reportes: [
      {
        id: generarId(),
        estado: "proximamente",
        comentario: "Supuestamente llegan más cartitas mañana.",
        usuario: "Usuario inicial",
        fechaISO: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        confirmaciones: 0,
        desactualizado: 0
      }
    ]
  },
  {
    id: 5,
    nombre: "Farmacia Guadalajara",
    tipo: "Farmacia",
    zona: "Navojoa",
    estado: "no_confirmado",
    ultimoReporte: "Sin reporte reciente",
    comentario: "Pendiente de revisar disponibilidad.",
    lat: 27.0742,
    lng: -109.4465,
    fechaUltimoReporteISO: null,
    reportes: []
  },
  {
    id: 6,
    nombre: "Farmacias Similares",
    tipo: "Farmacia",
    zona: "Navojoa",
    estado: "no_confirmado",
    ultimoReporte: "Sin reporte reciente",
    comentario: "Pendiente de revisar disponibilidad.",
    lat: 27.0682,
    lng: -109.4408,
    fechaUltimoReporteISO: null,
    reportes: []
  },
  {
    id: 7,
    nombre: "Supermercado Ley",
    tipo: "Supermercado",
    zona: "Navojoa",
    estado: "si_hay",
    ultimoReporte: "Hace 2 horas",
    comentario: "Reportaron cartitas cerca de cajas.",
    lat: 27.0736,
    lng: -109.4503,
    fechaUltimoReporteISO: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reportes: [
      {
        id: generarId(),
        estado: "si_hay",
        comentario: "Reportaron cartitas cerca de cajas.",
        usuario: "Usuario inicial",
        fechaISO: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        confirmaciones: 0,
        desactualizado: 0
      }
    ]
  },
  {
    id: 8,
    nombre: "Soriana Navojoa",
    tipo: "Supermercado",
    zona: "Navojoa",
    estado: "no_confirmado",
    ultimoReporte: "Sin reporte reciente",
    comentario: "Pendiente de confirmar.",
    lat: 27.0842,
    lng: -109.4522,
    fechaUltimoReporteISO: null,
    reportes: []
  },
  {
    id: 9,
    nombre: "Abarrotes Don Pepe",
    tipo: "Abarrotes",
    zona: "Colonia cercana",
    estado: "proximamente",
    ultimoReporte: "Ayer",
    comentario: "Dijeron que podrían manejar cartitas si hay demanda.",
    lat: 27.0608,
    lng: -109.4365,
    fechaUltimoReporteISO: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    reportes: [
      {
        id: generarId(),
        estado: "proximamente",
        comentario: "Dijeron que podrían manejar cartitas si hay demanda.",
        usuario: "Usuario inicial",
        fechaISO: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        confirmaciones: 0,
        desactualizado: 0
      }
    ]
  }
];

function generarId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function buscarTiendaPorId(idTienda) {
  return tiendas.find(function(tienda) {
    return tienda.id === idTienda;
  });
}

function buscarReportePorId(tienda, idReporte) {
  if (!tienda.reportes) {
    return null;
  }

  return tienda.reportes.find(function(reporte) {
    return reporte.id === idReporte;
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

function guardarTiendasEnNavegador() {
  const tiendasConvertidasATexto = JSON.stringify(tiendas);
  localStorage.setItem("hayCartitasTiendas", tiendasConvertidasATexto);
}

function cargarTiendasDelNavegador() {
  const tiendasGuardadas = localStorage.getItem("hayCartitasTiendas");

  if (tiendasGuardadas) {
    tiendas = JSON.parse(tiendasGuardadas);
  }
}

function arreglarDatosViejos() {
  tiendas.forEach(function(tienda) {
    if (!tienda.id) {
      tienda.id = generarId();
    }

    if (!tienda.lat || !tienda.lng) {
      tienda.lat = 27.0728 + (Math.random() - 0.5) * 0.03;
      tienda.lng = -109.4437 + (Math.random() - 0.5) * 0.03;
    }

    if (!tienda.reportes) {
      tienda.reportes = [];
    }

    if (!("fechaUltimoReporteISO" in tienda)) {
      tienda.fechaUltimoReporteISO = null;
    }

    tienda.reportes.forEach(function(reporte) {
      if (!reporte.id) {
        reporte.id = generarId();
      }

      if (!reporte.fechaISO) {
        reporte.fechaISO = new Date().toISOString();
      }

      if (!("confirmaciones" in reporte)) {
        reporte.confirmaciones = 0;
      }

      if (!("desactualizado" in reporte)) {
        reporte.desactualizado = 0;
      }
    });

    if (tienda.reportes.length === 0 && tienda.comentario && tienda.ultimoReporte !== "Sin reporte reciente") {
      const fechaMigrada = new Date().toISOString();

      tienda.reportes.push({
        id: generarId(),
        estado: tienda.estado,
        comentario: tienda.comentario,
        usuario: "Reporte anterior",
        fechaISO: fechaMigrada,
        confirmaciones: 0,
        desactualizado: 0
      });

      tienda.fechaUltimoReporteISO = fechaMigrada;
    }

    if (!tienda.fechaUltimoReporteISO && tienda.reportes.length > 0) {
      tienda.fechaUltimoReporteISO = tienda.reportes[0].fechaISO;
    }

    tienda.ultimoReporte = obtenerTiempoRelativo(tienda.fechaUltimoReporteISO);
  });

  guardarTiendasEnNavegador();
}

function borrarTiendasGuardadas() {
  localStorage.removeItem("hayCartitasTiendas");
  alert("Se borraron los datos guardados. Se recargará la página.");
  location.reload();
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

function actualizarEstadoTiendaSegunConfianza(tienda, reporte) {
  const esReporteMasReciente = tienda.reportes && tienda.reportes[0] && tienda.reportes[0].id === reporte.id;

  if (esReporteMasReciente && reporte.desactualizado >= 3) {
    tienda.estado = "no_confirmado";
    tienda.comentario = "El reporte más reciente fue marcado como probablemente desactualizado.";
    tienda.fechaUltimoReporteISO = new Date().toISOString();
    tienda.ultimoReporte = obtenerTiempoRelativo(tienda.fechaUltimoReporteISO);
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
      <button onclick="reportarPorId(${tienda.id})">
        Reportar
      </button>
    `);

    marcadores.push(marcador);
    marcadoresPorTienda[tienda.id] = marcador;
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
  if (tiendasConHistorialAbierto.includes(idTienda)) {
    tiendasConHistorialAbierto = tiendasConHistorialAbierto.filter(function(id) {
      return id !== idTienda;
    });
  } else {
    tiendasConHistorialAbierto.push(idTienda);
  }

  mostrarTiendas(tiendas);
}

function confirmarReporte(idTienda, idReporte) {
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

  reporte.confirmaciones = reporte.confirmaciones + 1;

  guardarTiendasEnNavegador();
  mostrarTiendas(tiendas);
}

function marcarReporteDesactualizado(idTienda, idReporte) {
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

  reporte.desactualizado = reporte.desactualizado + 1;

  actualizarEstadoTiendaSegunConfianza(tienda, reporte);

  guardarTiendasEnNavegador();
  mostrarTiendas(tiendas);
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

  const historialAbierto = tiendasConHistorialAbierto.includes(tienda.id);
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
            onclick="confirmarReporte(${tienda.id}, ${reporte.id})"
          >
            Confirmar
          </button>

          <button 
            class="boton-desactualizado-reporte" 
            onclick="marcarReporteDesactualizado(${tienda.id}, ${reporte.id})"
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
      <button class="boton-historial" onclick="alternarHistorial(${tienda.id})">
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
        <button class="boton-reporte" onclick="reportarPorId(${tienda.id})">
          Reportar actualización
        </button>

        <button class="boton-ver-mapa" onclick="verTiendaEnMapa(${tienda.id})">
          Ver en mapa
        </button>

        <button class="boton-como-llegar" onclick="abrirComoLlegar(${tienda.id})">
          Cómo llegar
        </button>

        <button class="boton-eliminar" onclick="eliminarTienda(${tienda.id})">
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
  tiendaSeleccionada = tiendas.find(function(tienda) {
    return tienda.id === idTienda;
  });

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

function guardarReporte() {
  if (!tiendaSeleccionada) {
    alert("Primero selecciona una tienda.");
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

  const ahoraISO = new Date().toISOString();

  const nuevoReporte = {
    id: generarId(),
    estado: nuevoEstado,
    comentario: comentarioFinal,
    usuario: usuarioFinal,
    fechaISO: ahoraISO,
    confirmaciones: 0,
    desactualizado: 0
  };

  if (!tiendaSeleccionada.reportes) {
    tiendaSeleccionada.reportes = [];
  }

  tiendaSeleccionada.reportes.unshift(nuevoReporte);

  tiendaSeleccionada.estado = nuevoEstado;
  tiendaSeleccionada.comentario = comentarioFinal;
  tiendaSeleccionada.fechaUltimoReporteISO = ahoraISO;
  tiendaSeleccionada.ultimoReporte = obtenerTiempoRelativo(ahoraISO);

  guardarTiendasEnNavegador();
  mostrarTiendas(tiendas);
  cancelarReporte();

  alert("Reporte guardado. Gracias por ayudar a otros coleccionistas.");
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
  const tienda = tiendas.find(function(tienda) {
    return tienda.id === idTienda;
  });

  if (!tienda) {
    alert("No encontramos esa tienda.");
    return;
  }

  if (!mapa) {
    alert("El mapa todavía no está listo.");
    return;
  }

  mapa.setView([tienda.lat, tienda.lng], 16);

  const marcador = marcadoresPorTienda[idTienda];

  if (marcador) {
    marcador.openPopup();
  }

  mapa.getContainer().scrollIntoView({
    behavior: "smooth"
  });
}

function abrirComoLlegar(idTienda) {
  const tienda = tiendas.find(function(tienda) {
    return tienda.id === idTienda;
  });

  if (!tienda) {
    alert("No encontramos esa tienda.");
    return;
  }

  const url = "https://www.google.com/maps/dir/?api=1&destination=" +
    tienda.lat + "," + tienda.lng;

  window.open(url, "_blank");
}

function eliminarTienda(idTienda) {
  const tienda = tiendas.find(function(tienda) {
    return tienda.id === idTienda;
  });

  if (!tienda) {
    alert("No encontramos esa tienda.");
    return;
  }

  const confirmar = confirm("¿Seguro que quieres eliminar esta tienda?\n\n" + tienda.nombre);

  if (!confirmar) {
    return;
  }

  tiendas = tiendas.filter(function(tienda) {
    return tienda.id !== idTienda;
  });

  tiendasConHistorialAbierto = tiendasConHistorialAbierto.filter(function(id) {
    return id !== idTienda;
  });

  guardarTiendasEnNavegador();
  mostrarTiendas(tiendas);

  alert("Tienda eliminada correctamente.");
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

  alert("Tienda agregada correctamente.");
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

cargarTiendasDelNavegador();
arreglarDatosViejos();
iniciarMapa();
mostrarTiendas(tiendas);

setInterval(function() {
  mostrarTiendas(tiendas);
}, 60000);