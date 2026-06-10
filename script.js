const SUPABASE_URL = "https://ajczyfoyrmrklbeixdum.supabase.co";
const SUPABASE_KEY = "sb_publishable_30cWHLbp6e5CK7JsAoVvjw_yvKjj42L";

const RADIO_FILTRO_KM = 10;

let supabaseClient = null;

if (
  SUPABASE_URL !== "PEGA_AQUI_TU_SUPABASE_URL" &&
  SUPABASE_KEY !== "PEGA_AQUI_TU_PUBLISHABLE_KEY"
) {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let usuarioActual = null;
let perfilActual = null;
let tiendaSeleccionada = null;
let mapa = null;
let marcadores = [];
let marcadoresPorTienda = {};
let marcadorUsuario = null;
let ubicacionUsuario = null;
let ubicacionNuevaTienda = null;
let marcadorTemporal = null;
let modoSeleccionUbicacion = false;
let filtroCercanasActivo = true;
let tiendasConHistorialAbierto = [];
let tiendas = [];
let filtroEstadoActual = "todas";
let filtroBusquedaActual = "";

function actualizarMensajeEstadoApp(mensaje) {
  const elemento = document.getElementById("mensaje-estado-app");

  if (elemento) {
    elemento.textContent = mensaje;
  }
}

function actualizarMensajeFiltroDistancia() {
  const elemento = document.getElementById("mensaje-filtro-distancia");

  if (!elemento) {
    return;
  }

  if (!filtroCercanasActivo) {
    elemento.textContent = "Filtro de distancia desactivado. Mostrando todas las tiendas.";
    return;
  }

  if (!ubicacionUsuario) {
    elemento.textContent = "Filtro cercano activo. Presiona “Usar mi ubicación” para mostrar tiendas a 10 km.";
    return;
  }

  elemento.textContent = "Mostrando tiendas a " + RADIO_FILTRO_KM + " km de tu ubicación.";
}

function alternarGuiaBeta() {
  const guiaBeta = document.getElementById("guia-beta");

  if (!guiaBeta) {
    return;
  }

  guiaBeta.classList.toggle("oculto");
}

function alternarFeedbackBeta() {
  const formularioFeedback = document.getElementById("formulario-feedback-beta");

  if (!formularioFeedback) {
    return;
  }

  formularioFeedback.classList.toggle("oculto");

  if (!formularioFeedback.classList.contains("oculto")) {
    formularioFeedback.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function ocultarFeedbackBeta() {
  const formularioFeedback = document.getElementById("formulario-feedback-beta");

  if (formularioFeedback) {
    formularioFeedback.classList.add("oculto");
  }
}

function alternarFormularioAgregar() {
  const formularioAgregar = document.getElementById("formulario-agregar");

  if (!formularioAgregar) {
    return;
  }

  formularioAgregar.classList.toggle("oculto");

  if (!formularioAgregar.classList.contains("oculto")) {
    formularioAgregar.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function mostrarFormularioAgregar() {
  const formularioAgregar = document.getElementById("formulario-agregar");

  if (!formularioAgregar) {
    return;
  }

  formularioAgregar.classList.remove("oculto");

  formularioAgregar.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function ocultarFormularioAgregar() {
  limpiarFormularioNuevaTienda();

  const formularioAgregar = document.getElementById("formulario-agregar");

  if (formularioAgregar) {
    formularioAgregar.classList.add("oculto");
  }
}

function usuarioDebeEstarConectado() {
  if (!usuarioActual || !perfilActual) {
    alert("Para hacer esta acción necesitas crear cuenta o iniciar sesión.");
    return false;
  }

  return true;
}

function obtenerNombreUsuarioActual() {
  if (perfilActual && perfilActual.nombre) {
    return perfilActual.nombre;
  }

  if (usuarioActual && usuarioActual.email) {
    return usuarioActual.email;
  }

  return "Usuario beta";
}

function actualizarVistaUsuario() {
  const zonaCerrada = document.getElementById("zona-sesion-cerrada");
  const zonaAbierta = document.getElementById("zona-sesion-abierta");
  const contenidoApp = document.getElementById("contenido-app");
  const nombreUsuario = document.getElementById("nombre-usuario-activo");
  const rolUsuario = document.getElementById("rol-usuario-activo");

  if (!zonaCerrada || !zonaAbierta || !contenidoApp) {
    return;
  }

  if (usuarioActual && perfilActual) {
    zonaCerrada.classList.add("oculto");
    zonaAbierta.classList.remove("oculto");
    contenidoApp.classList.remove("oculto");

    if (nombreUsuario) {
      nombreUsuario.textContent = perfilActual.nombre;
    }

    if (rolUsuario) {
      rolUsuario.textContent = "· " + perfilActual.rol + " · " + perfilActual.ciudad;
    }

    if (mapa) {
      setTimeout(function() {
        mapa.invalidateSize();
      }, 200);
    }
  } else {
    zonaCerrada.classList.remove("oculto");
    zonaAbierta.classList.add("oculto");
    contenidoApp.classList.add("oculto");
  }

  actualizarMensajeFiltroDistancia();
}

async function crearPerfilAutomaticoSiFalta(nombreSugerido) {
  if (!usuarioActual) {
    return null;
  }

  let nombreFinal = nombreSugerido;

  if (!nombreFinal || nombreFinal.trim() === "") {
    nombreFinal = usuarioActual.email;
  }

  const resultadoPerfil = await supabaseClient
    .from("perfiles")
    .insert({
      id: usuarioActual.id,
      nombre: nombreFinal,
      ciudad: "Navojoa",
      pais: "México",
      rol: "usuario",
      es_beta: true
    })
    .select()
    .single();

  if (resultadoPerfil.error) {
    console.error(resultadoPerfil.error);
    return null;
  }

  return resultadoPerfil.data;
}

async function cargarPerfilActual(nombreSugerido) {
  if (!usuarioActual) {
    perfilActual = null;
    actualizarVistaUsuario();
    return;
  }

  const resultadoPerfil = await supabaseClient
    .from("perfiles")
    .select("*")
    .eq("id", usuarioActual.id)
    .maybeSingle();

  if (resultadoPerfil.error) {
    console.error(resultadoPerfil.error);
    perfilActual = null;
    actualizarVistaUsuario();
    alert("No se pudo cargar el perfil del usuario.");
    return;
  }

  if (!resultadoPerfil.data) {
    perfilActual = await crearPerfilAutomaticoSiFalta(nombreSugerido);

    if (!perfilActual) {
      actualizarVistaUsuario();
      alert("Tu sesión existe, pero no se pudo crear tu perfil beta.");
      return;
    }
  } else {
    perfilActual = resultadoPerfil.data;
  }

  actualizarVistaUsuario();
}

async function cargarUsuarioActual() {
  if (!supabaseClient) {
    return;
  }

  const resultadoUsuario = await supabaseClient.auth.getUser();

  if (resultadoUsuario.error) {
    usuarioActual = null;
    perfilActual = null;
    actualizarVistaUsuario();
    return;
  }

  usuarioActual = resultadoUsuario.data.user;

  if (usuarioActual) {
    await cargarPerfilActual();
  } else {
    perfilActual = null;
    actualizarVistaUsuario();
  }
}

async function crearCuenta() {
  if (!supabaseClient) {
    alert("Supabase no está configurado.");
    return;
  }

  const nombreInput = document.getElementById("nombre-registro");
  const emailInput = document.getElementById("email-registro");
  const passwordInput = document.getElementById("password-registro");

  const nombre = nombreInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (nombre === "") {
    alert("Escribe tu nombre.");
    return;
  }

  if (email === "") {
    alert("Escribe tu email.");
    return;
  }

  if (password.length < 6) {
    alert("La contraseña debe tener mínimo 6 caracteres.");
    return;
  }

  const resultadoRegistro = await supabaseClient.auth.signUp({
    email: email,
    password: password
  });

  if (resultadoRegistro.error) {
    console.error(resultadoRegistro.error);
    alert("No se pudo crear la cuenta: " + resultadoRegistro.error.message);
    return;
  }

  if (!resultadoRegistro.data.session) {
    alert("Cuenta creada. Revisa tu correo para confirmar la cuenta antes de iniciar sesión.");
    return;
  }

  usuarioActual = resultadoRegistro.data.user;

  await cargarPerfilActual(nombre);

  nombreInput.value = "";
  emailInput.value = "";
  passwordInput.value = "";

  await cargarTiendasDesdeSupabase();
  intentarActivarUbicacionInicial();

  alert("Cuenta beta creada correctamente.");
}

async function iniciarSesion() {
  if (!supabaseClient) {
    alert("Supabase no está configurado.");
    return;
  }

  const emailInput = document.getElementById("email-login");
  const passwordInput = document.getElementById("password-login");

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (email === "") {
    alert("Escribe tu email.");
    return;
  }

  if (password === "") {
    alert("Escribe tu contraseña.");
    return;
  }

  const resultadoLogin = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (resultadoLogin.error) {
    console.error(resultadoLogin.error);
    alert("No se pudo iniciar sesión: " + resultadoLogin.error.message);
    return;
  }

  usuarioActual = resultadoLogin.data.user;

  await cargarPerfilActual(email);

  if (!perfilActual) {
    alert("Iniciaste sesión, pero no se pudo cargar tu perfil.");
    return;
  }

  emailInput.value = "";
  passwordInput.value = "";

  await cargarTiendasDesdeSupabase();
  intentarActivarUbicacionInicial();

  alert("Sesión iniciada correctamente.");
}

async function cerrarSesion() {
  if (!supabaseClient) {
    return;
  }

  const resultado = await supabaseClient.auth.signOut();

  if (resultado.error) {
    console.error(resultado.error);
    alert("No se pudo cerrar sesión.");
    return;
  }

  usuarioActual = null;
  perfilActual = null;
  tiendas = [];
  ubicacionUsuario = null;

  if (marcadorUsuario && mapa) {
    mapa.removeLayer(marcadorUsuario);
    marcadorUsuario = null;
  }

  actualizarVistaUsuario();
  actualizarMensajeEstadoApp("Sesión cerrada. Inicia sesión para entrar a la beta.");

  alert("Sesión cerrada.");
}

async function guardarFeedbackBeta() {
  if (!usuarioDebeEstarConectado()) {
    return;
  }

  const tipoInput = document.getElementById("tipo-feedback");
  const mensajeInput = document.getElementById("mensaje-feedback");

  if (!tipoInput || !mensajeInput) {
    alert("Falta el formulario de feedback en el HTML.");
    return;
  }

  const tipo = tipoInput.value;
  const mensaje = mensajeInput.value.trim();

  if (mensaje === "") {
    alert("Escribe el bug, idea o comentario antes de enviarlo.");
    return;
  }

  const resultado = await supabaseClient
    .from("feedback_beta")
    .insert({
      usuario_id: usuarioActual.id,
      nombre_usuario: obtenerNombreUsuarioActual(),
      tipo: tipo,
      mensaje: mensaje,
      pagina: "app principal"
    });

  if (resultado.error) {
    console.error(resultado.error);
    alert("No se pudo guardar el feedback en Supabase.");
    return;
  }

  mensajeInput.value = "";
  tipoInput.value = "bug";
  ocultarFeedbackBeta();

  alert("Gracias. Tu feedback quedó guardado.");
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

function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
  const radioTierraKm = 6371;
  const diferenciaLat = convertirGradosARadianes(lat2 - lat1);
  const diferenciaLng = convertirGradosARadianes(lng2 - lng1);

  const a =
    Math.sin(diferenciaLat / 2) * Math.sin(diferenciaLat / 2) +
    Math.cos(convertirGradosARadianes(lat1)) *
      Math.cos(convertirGradosARadianes(lat2)) *
      Math.sin(diferenciaLng / 2) *
      Math.sin(diferenciaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return radioTierraKm * c;
}

function convertirGradosARadianes(grados) {
  return grados * (Math.PI / 180);
}

function formatearDistancia(distanciaKm) {
  if (distanciaKm === null || distanciaKm === undefined) {
    return "Distancia no disponible";
  }

  if (distanciaKm < 1) {
    return Math.round(distanciaKm * 1000) + " m de ti";
  }

  return distanciaKm.toFixed(1) + " km de ti";
}

function actualizarDistanciasDeTiendas() {
  tiendas.forEach(function(tienda) {
    if (!ubicacionUsuario || !tienda.lat || !tienda.lng) {
      tienda.distanciaKm = null;
      return;
    }

    tienda.distanciaKm = calcularDistanciaKm(
      ubicacionUsuario.lat,
      ubicacionUsuario.lng,
      tienda.lat,
      tienda.lng
    );
  });
}

function ordenarTiendasPorDistancia(lista) {
  if (!ubicacionUsuario) {
    return lista;
  }

  return lista.slice().sort(function(a, b) {
    if (a.distanciaKm === null || a.distanciaKm === undefined) {
      return 1;
    }

    if (b.distanciaKm === null || b.distanciaKm === undefined) {
      return -1;
    }

    return a.distanciaKm - b.distanciaKm;
  });
}

function aplicarFiltrosActuales() {
  let resultado = tiendas.slice();

  if (filtroEstadoActual !== "todas") {
    resultado = resultado.filter(function(tienda) {
      return tienda.estado === filtroEstadoActual;
    });
  }

  if (filtroBusquedaActual !== "") {
    resultado = resultado.filter(function(tienda) {
      return (
        tienda.nombre.toLowerCase().includes(filtroBusquedaActual) ||
        tienda.tipo.toLowerCase().includes(filtroBusquedaActual) ||
        tienda.zona.toLowerCase().includes(filtroBusquedaActual) ||
        tienda.estado.toLowerCase().includes(filtroBusquedaActual)
      );
    });
  }

  if (filtroCercanasActivo && ubicacionUsuario) {
    resultado = resultado.filter(function(tienda) {
      return tienda.distanciaKm !== null && tienda.distanciaKm <= RADIO_FILTRO_KM;
    });
  }

  resultado = ordenarTiendasPorDistancia(resultado);

  mostrarTiendas(resultado);
}

function ordenarReportes(reportes) {
  return reportes.sort(function(a, b) {
    const fechaA = new Date(a.fechaISO || a.created_at || 0).getTime();
    const fechaB = new Date(b.fechaISO || b.created_at || 0).getTime();

    if (fechaB !== fechaA) {
      return fechaB - fechaA;
    }

    return String(b.id).localeCompare(String(a.id));
  });
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

    ordenarReportes(reportesDeLaTienda);

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
      distanciaKm: null,
      reportes: reportesDeLaTienda
    };
  });
}

async function cargarTiendasDesdeSupabase() {
  const contenedor = document.getElementById("lista-tiendas");

  if (!usuarioActual || !perfilActual) {
    actualizarMensajeEstadoApp("Inicia sesión para entrar a la beta local.");
    actualizarVistaUsuario();
    return;
  }

  actualizarMensajeEstadoApp("Cargando datos desde Supabase...");

  if (contenedor) {
    contenedor.innerHTML = "<p>Cargando tiendas desde Supabase...</p>";
  }

  const resultadoTiendas = await supabaseClient
    .from("tiendas")
    .select("*")
    .order("created_at", { ascending: true });

  if (resultadoTiendas.error) {
    console.error(resultadoTiendas.error);
    actualizarMensajeEstadoApp("Error cargando tiendas desde Supabase.");

    if (contenedor) {
      contenedor.innerHTML = "<p>Error cargando tiendas desde Supabase.</p>";
    }

    alert("No se pudieron cargar las tiendas desde Supabase.");
    return;
  }

  const resultadoReportes = await supabaseClient
    .from("reportes")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (resultadoReportes.error) {
    console.error(resultadoReportes.error);
    actualizarMensajeEstadoApp("Error cargando reportes desde Supabase.");

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

  actualizarDistanciasDeTiendas();
  aplicarFiltrosActuales();

  actualizarMensajeEstadoApp(
    "Beta conectada. Tiendas: " +
    tiendas.length +
    ". Última actualización: " +
    new Date().toLocaleTimeString()
  );

  actualizarMensajeFiltroDistancia();
}

async function borrarTiendasGuardadas() {
  await cargarTiendasDesdeSupabase();
  alert("Datos actualizados desde Supabase.");
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
  if (!usuarioDebeEstarConectado()) {
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

  const resultadoVoto = await supabaseClient
    .from("votos_reportes")
    .insert({
      reporte_id: idReporte,
      usuario_id: usuarioActual.id,
      usuario_nombre: obtenerNombreUsuarioActual(),
      tipo_voto: tipoVoto
    });

  if (resultadoVoto.error) {
    console.error(resultadoVoto.error);

    if (detectarErrorDeVotoDuplicado(resultadoVoto.error)) {
      alert("Ya votaste en este reporte. Cada usuario solo puede votar una vez por reporte.");
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

    mostrarFormularioAgregar();
  });

  setTimeout(function() {
    mapa.invalidateSize();
  }, 300);
}

function crearIconoUsuario() {
  return L.divIcon({
    className: "marcador-personalizado",
    html: `<div class="pin pin-user"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
}

function mostrarUbicacionUsuarioEnMapa() {
  if (!mapa || !ubicacionUsuario) {
    return;
  }

  if (marcadorUsuario) {
    mapa.removeLayer(marcadorUsuario);
  }

  marcadorUsuario = L.marker([ubicacionUsuario.lat, ubicacionUsuario.lng], {
    icon: crearIconoUsuario()
  }).addTo(mapa);

  marcadorUsuario.bindPopup("Estás aquí");

  mapa.setView([ubicacionUsuario.lat, ubicacionUsuario.lng], 14);
}

function usarMiUbicacion() {
  if (!usuarioDebeEstarConectado()) {
    return;
  }

  if (!navigator.geolocation) {
    alert("Tu navegador no permite usar ubicación.");
    return;
  }

  actualizarMensajeFiltroDistancia("Buscando tu ubicación...");

  navigator.geolocation.getCurrentPosition(
    function(posicion) {
      ubicacionUsuario = {
        lat: posicion.coords.latitude,
        lng: posicion.coords.longitude
      };

      filtroCercanasActivo = true;

      mostrarUbicacionUsuarioEnMapa();
      actualizarDistanciasDeTiendas();
      aplicarFiltrosActuales();
      actualizarMensajeFiltroDistancia();

      alert("Ubicación activada. Mostrando tiendas cercanas a 10 km.");
    },
    function(error) {
      console.error(error);
      ubicacionUsuario = null;
      actualizarMensajeFiltroDistancia();
      alert("No se pudo obtener tu ubicación. Puedes revisar permisos del navegador o quitar el filtro de 10 km.");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  );
}

function intentarActivarUbicacionInicial() {
  if (!usuarioActual || !perfilActual) {
    return;
  }

  if (!navigator.geolocation) {
    filtroCercanasActivo = false;
    actualizarMensajeFiltroDistancia();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function(posicion) {
      ubicacionUsuario = {
        lat: posicion.coords.latitude,
        lng: posicion.coords.longitude
      };

      filtroCercanasActivo = true;

      mostrarUbicacionUsuarioEnMapa();
      actualizarDistanciasDeTiendas();
      aplicarFiltrosActuales();
      actualizarMensajeFiltroDistancia();
    },
    function(error) {
      console.warn("Ubicación no disponible o permiso rechazado.", error);
      ubicacionUsuario = null;
      actualizarMensajeFiltroDistancia();
      aplicarFiltrosActuales();
    },
    {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 60000
    }
  );
}

function activarFiltroCercanas() {
  filtroCercanasActivo = true;

  if (!ubicacionUsuario) {
    usarMiUbicacion();
    return;
  }

  actualizarDistanciasDeTiendas();
  aplicarFiltrosActuales();
  actualizarMensajeFiltroDistancia();
}

function quitarFiltroCercanas() {
  filtroCercanasActivo = false;
  aplicarFiltrosActuales();
  actualizarMensajeFiltroDistancia();
}

function activarSeleccionUbicacion() {
  if (!usuarioDebeEstarConectado()) {
    return;
  }

  modoSeleccionUbicacion = true;

  const textoUbicacion = document.getElementById("ubicacion-seleccionada");

  if (textoUbicacion) {
    textoUbicacion.textContent = "Modo selección activado. Ahora haz clic en el mapa.";
  }

  if (mapa) {
    mapa.scrollWheelZoom.disable();
    mapa.getContainer().scrollIntoView({
      behavior: "smooth",
      block: "center"
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

    const textoDistancia = ubicacionUsuario && tienda.distanciaKm !== null
      ? "<br><small>" + formatearDistancia(tienda.distanciaKm) + "</small>"
      : "";

    const marcador = L.marker([tienda.lat, tienda.lng], {
      icon: crearIcono(tienda.estado)
    }).addTo(mapa);

    marcador.bindPopup(`
      <strong>${tienda.nombre}</strong><br>
      ${obtenerTextoEstado(tienda.estado)}<br>
      <small>${tienda.zona}</small><br>
      <small>${obtenerTiempoRelativo(tienda.fechaUltimoReporteISO)}</small>
      ${textoDistancia}<br><br>
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

  aplicarFiltrosActuales();
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
    if (filtroCercanasActivo && ubicacionUsuario) {
      contenedor.innerHTML = "<p>No encontramos tiendas dentro de 10 km. Puedes quitar el filtro de distancia.</p>";
    } else {
      contenedor.innerHTML = "<p>No encontramos tiendas con esa búsqueda.</p>";
    }

    mostrarMarcadores([]);
    return;
  }

  lista.forEach(function(tienda) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-tienda";

    const textoDistancia = ubicacionUsuario && tienda.distanciaKm !== null
      ? `<p class="distancia-tienda"><strong>Distancia:</strong> ${formatearDistancia(tienda.distanciaKm)}</p>`
      : "";

    tarjeta.innerHTML = `
      <span class="estado ${tienda.estado}">
        ${obtenerTextoEstado(tienda.estado)}
      </span>

      <h3>${tienda.nombre}</h3>

      <p><strong>Tipo:</strong> ${tienda.tipo}</p>
      <p><strong>Zona:</strong> ${tienda.zona}</p>
      ${textoDistancia}
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
      </div>
    `;

    contenedor.appendChild(tarjeta);
  });

  mostrarMarcadores(lista);
}

function mostrarTodas() {
  filtroEstadoActual = "todas";
  filtroBusquedaActual = "";

  const buscador = document.getElementById("buscador");

  if (buscador) {
    buscador.value = "";
  }

  aplicarFiltrosActuales();
}

function filtrarTiendas(estado) {
  filtroEstadoActual = estado;
  aplicarFiltrosActuales();
}

function filtrarTiendasConReportesConfiables() {
  let tiendasConfiables = tiendas.filter(function(tienda) {
    if (!tienda.reportes) {
      return false;
    }

    return tienda.reportes.some(function(reporte) {
      return reporte.confirmaciones >= 3 && reporte.desactualizado < 3;
    });
  });

  if (filtroCercanasActivo && ubicacionUsuario) {
    tiendasConfiables = tiendasConfiables.filter(function(tienda) {
      return tienda.distanciaKm !== null && tienda.distanciaKm <= RADIO_FILTRO_KM;
    });
  }

  tiendasConfiables = ordenarTiendasPorDistancia(tiendasConfiables);

  mostrarTiendas(tiendasConfiables);
}

function buscarTiendas() {
  const buscador = document.getElementById("buscador");

  if (!buscador) {
    console.error("No existe el elemento con id buscador");
    return;
  }

  filtroBusquedaActual = buscador.value.toLowerCase();
  aplicarFiltrosActuales();
}

function reportarPorId(idTienda) {
  if (!usuarioDebeEstarConectado()) {
    return;
  }

  tiendaSeleccionada = buscarTiendaPorId(idTienda);

  if (!tiendaSeleccionada) {
    alert("No encontramos esa tienda.");
    return;
  }

  document.getElementById("nombre-tienda-reporte").textContent = tiendaSeleccionada.nombre;
  document.getElementById("estado-reporte").value = tiendaSeleccionada.estado;
  document.getElementById("comentario-reporte").value = "";

  document.getElementById("formulario-reporte").classList.remove("oculto");

  document.getElementById("formulario-reporte").scrollIntoView({
    behavior: "smooth"
  });
}

async function guardarReporte() {
  if (!usuarioDebeEstarConectado()) {
    return;
  }

  if (!tiendaSeleccionada) {
    alert("Primero selecciona una tienda.");
    return;
  }

  const nuevoEstado = document.getElementById("estado-reporte").value;
  const nuevoComentario = document.getElementById("comentario-reporte").value.trim();

  let comentarioFinal = "";

  if (nuevoComentario !== "") {
    comentarioFinal = nuevoComentario;
  } else {
    comentarioFinal = "Reporte actualizado sin comentario.";
  }

  const fechaReporte = new Date().toISOString();

  const resultadoReporte = await supabaseClient
    .from("reportes")
    .insert({
      tienda_id: tiendaSeleccionada.id,
      usuario_id: usuarioActual.id,
      estado: nuevoEstado,
      comentario: comentarioFinal,
      usuario: obtenerNombreUsuarioActual(),
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

async function agregarNuevaTienda() {
  if (!usuarioDebeEstarConectado()) {
    return;
  }

  const nombreInput = document.getElementById("nombre-nueva-tienda");
  const tipoInput = document.getElementById("tipo-nueva-tienda");
  const zonaInput = document.getElementById("zona-nueva-tienda");
  const estadoInput = document.getElementById("estado-nueva-tienda");
  const comentarioInput = document.getElementById("comentario-nueva-tienda");

  if (!nombreInput || !tipoInput || !zonaInput || !estadoInput || !comentarioInput) {
    alert("Hay un problema: falta un campo del formulario en el HTML.");
    return;
  }

  const nombre = nombreInput.value.trim();
  const tipo = tipoInput.value;
  const zona = zonaInput.value.trim();
  const estado = estadoInput.value;
  const comentario = comentarioInput.value.trim();

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

  const fechaActual = new Date().toISOString();

  const resultadoTienda = await supabaseClient
    .from("tiendas")
    .insert({
      nombre: nombre,
      tipo: tipo,
      zona: zona,
      estado: estado,
      comentario: comentarioFinal,
      lat: ubicacionNuevaTienda.lat,
      lng: ubicacionNuevaTienda.lng,
      fecha_ultimo_reporte: fechaActual,
      created_at: fechaActual,
      creado_por: usuarioActual.id
    })
    .select()
    .single();

  if (resultadoTienda.error) {
    console.error(resultadoTienda.error);
    alert("No se pudo guardar la tienda en Supabase.");
    return;
  }

  const nuevaTienda = resultadoTienda.data;

  const resultadoReporte = await supabaseClient
    .from("reportes")
    .insert({
      tienda_id: nuevaTienda.id,
      usuario_id: usuarioActual.id,
      estado: estado,
      comentario: comentarioFinal,
      usuario: obtenerNombreUsuarioActual(),
      confirmaciones: 0,
      desactualizado: 0,
      created_at: fechaActual
    });

  if (resultadoReporte.error) {
    console.error(resultadoReporte.error);
    alert("La tienda se guardó, pero no se pudo crear su primer reporte.");
    return;
  }

  await cargarTiendasDesdeSupabase();
  limpiarFormularioNuevaTienda();

  const formularioAgregar = document.getElementById("formulario-agregar");

  if (formularioAgregar) {
    formularioAgregar.classList.add("oculto");
  }

  alert("Tienda nueva guardada correctamente en Supabase.");
}

function limpiarFormularioNuevaTienda() {
  document.getElementById("nombre-nueva-tienda").value = "";
  document.getElementById("tipo-nueva-tienda").value = "OXXO";
  document.getElementById("zona-nueva-tienda").value = "";
  document.getElementById("estado-nueva-tienda").value = "no_confirmado";
  document.getElementById("comentario-nueva-tienda").value = "";

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
  actualizarVistaUsuario();
  actualizarMensajeFiltroDistancia();
  await cargarUsuarioActual();

  if (usuarioActual && perfilActual) {
    await cargarTiendasDesdeSupabase();
    intentarActivarUbicacionInicial();
  } else {
    actualizarMensajeEstadoApp("Inicia sesión para entrar a la beta local.");
  }

  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange(async function() {
      await cargarUsuarioActual();

      if (usuarioActual && perfilActual) {
        await cargarTiendasDesdeSupabase();
        intentarActivarUbicacionInicial();
      }
    });
  }
}

iniciarApp();

setInterval(function() {
  if (usuarioActual && perfilActual && tiendas.length > 0) {
    actualizarDistanciasDeTiendas();
    aplicarFiltrosActuales();
  }
}, 60000);
