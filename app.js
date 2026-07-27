/* ==========================================================
   COACH — lógica principal
   - Humor aleatorio por sesión
   - Flujos por evento
   - Detección de comida no saludable en "Otro…"
   - Estadísticas y rachas en LocalStorage
   Las frases viven en frases.js (objeto FRASES).
   ========================================================== */

(function () {
  "use strict";

  /* ---------- Coaches (humores) ---------- */
  const COACHES = [
    { id: "sarcastico", nombre: "Coach Sarcástico", emoji: "😈" },
    { id: "ironico",    nombre: "Coach Irónico",    emoji: "😂" },
    { id: "sargento",   nombre: "Coach Sargento",   emoji: "🪖" },
    { id: "dramatico",  nombre: "Coach Dramático",  emoji: "🎭" },
    { id: "companero",  nombre: "Coach Compañero",  emoji: "🤝" },
    { id: "sabio",      nombre: "Coach Sabio",      emoji: "🧠" }
  ];

  /* ---------- Eventos del menú principal ---------- */
  const EVENTOS = [
    { id: "antojo",      emoji: "🍫", texto: "Tengo un antojo",           flujo: "antojo" },
    { id: "delivery",    emoji: "🛵", texto: "Quiero pedir delivery",     flujo: "valeLaPena" },
    { id: "noGym",       emoji: "🛋️", texto: "No quiero ir al gimnasio",  flujo: "simple" },
    { id: "entrene",     emoji: "💪", texto: "Terminé de entrenar",       flujo: "entreno" },
    { id: "ofrecieron",  emoji: "🍰", texto: "Me ofrecieron comida",      flujo: "valeLaPena" },
    { id: "rompiDieta",  emoji: "😵", texto: "Rompí la dieta",            flujo: "simple" },
    { id: "desmotivado", emoji: "🌧️", texto: "Me siento desmotivado",     flujo: "simple" },
    { id: "ansiedad",    emoji: "😰", texto: "Tengo ansiedad",            flujo: "simple" },
    { id: "aburrido",    emoji: "🥱", texto: "Estoy aburrido y quiero comer", flujo: "valeLaPena" }
  ];

  /* ---------- Opciones saludables del antojo ---------- */
  const OPCIONES_SALUDABLES = [
    { emoji: "🥣", texto: "Yogurt griego" },
    { emoji: "🍗", texto: "Pollo" },
    { emoji: "🍎", texto: "Fruta" },
    { emoji: "🥜", texto: "Frutos secos" }
  ];

  /* ---------- Palabras clave de comida no saludable ---------- */
  const NO_SALUDABLE = [
    "galleta", "pizza", "hamburguesa", "torta", "pastel", "queque", "helado",
    "gaseosa", "soda", "chocolate", "dona", "donut", "papas fritas", "fritura",
    "frito", "broaster", "salchipapa", "chip", "caramelo", "dulce", "golosina",
    "gomita", "chicle", "cerveza", "trago", "alcohol", "pisco", "ron", "vodka",
    "empanada", "churro", "alfajor", "paneton", "panetón", "cupcake", "brownie",
    "waffle", "wafle", "picarones", "tequeño", "nugget", "hotdog", "hot dog",
    "chorizo", "tocino", "mayonesa", "ketchup", "azucar", "azúcar", "miel de caja",
    "cereal", "kfc", "mcdonald", "burger", "bembos", "snack", "piqueo",
    "chifle", "cancha frita", "marciano", "cremolada con leche condensada",
    "leche condensada", "manjar", "manjarblanco", "milkshake", "frappe", "frapuccino",
    "pie de", "cheesecake", "tres leches", "suspiro", "turron", "turrón", "mazapan",
    "chocoteja", "sublime", "oreo", "pringles", "doritos", "cheetos", "inka kola",
    "coca cola", "pepsi", "fanta", "sprite"
  ];

  /* ---------- Estado ---------- */
  const CLAVE_STORAGE = "coach_datos_v1";

  let datos = cargarDatos();
  let coachActual = elegirCoach();
  let eventoActual = null;   // id del evento en curso
  let pasoFlujo = null;      // paso actual dentro del flujo

  /* ---------- Referencias DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const pantallas = document.querySelectorAll(".pantalla");

  /* ==========================================================
     Persistencia
     ========================================================== */
  function cargarDatos() {
    const base = {
      tema: "pastel",
      rechazos: 0,       // antojos rechazados
      entrenos: 0,       // entrenamientos completados
      pecados: 0,        // antojos aceptados
      visitas: 0,        // interacciones con el coach
      racha: 0,          // días seguidos con al menos una victoria
      mejorRacha: 0,
      ultimoDiaVictoria: null,
      ultimoCoach: null
    };
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE_STORAGE));
      return Object.assign(base, guardado || {});
    } catch (e) {
      return base;
    }
  }

  function guardarDatos() {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(datos));
  }

  /* ==========================================================
     Utilidades
     ========================================================== */
  function aleatorio(arreglo) {
    return arreglo[Math.floor(Math.random() * arreglo.length)];
  }

  function fraseDe(categoria) {
    const paquete = FRASES[coachActual.id];
    const lista = paquete && paquete[categoria];
    if (!lista || !lista.length) return "…";
    return aleatorio(lista);
  }

  function hoyISO() {
    return new Date().toISOString().slice(0, 10);
  }

  /** Registra una "victoria" del día y actualiza la racha. */
  function registrarVictoria() {
    const hoy = hoyISO();
    if (datos.ultimoDiaVictoria === hoy) return; // ya contó hoy

    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const ayerISO = ayer.toISOString().slice(0, 10);

    datos.racha = (datos.ultimoDiaVictoria === ayerISO) ? datos.racha + 1 : 1;
    datos.mejorRacha = Math.max(datos.mejorRacha, datos.racha);
    datos.ultimoDiaVictoria = hoy;
  }

  /** Devuelve true si el texto contiene comida no saludable. */
  function esNoSaludable(texto) {
    const limpio = texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // quita tildes
    return NO_SALUDABLE.some((palabra) => {
      const p = palabra.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return limpio.includes(p);
    });
  }

  /* ==========================================================
     Coach de la sesión
     ========================================================== */
  function elegirCoach() {
    // Evita repetir el mismo coach de la sesión anterior si es posible.
    const candidatos = COACHES.filter((c) => c.id !== datos.ultimoCoach);
    const elegido = aleatorio(candidatos.length ? candidatos : COACHES);
    datos.ultimoCoach = elegido.id;
    guardarDatos();
    return elegido;
  }

  /* ==========================================================
     Navegación entre pantallas
     ========================================================== */
  function mostrarPantalla(id) {
    pantallas.forEach((p) => p.classList.toggle("activa", p.id === id));
    $("navCoach").classList.toggle("nav-activo", id !== "pantalla-stats");
    $("navStats").classList.toggle("nav-activo", id === "pantalla-stats");
    if (id === "pantalla-stats") pintarStats();
  }

  /* ==========================================================
     Render: inicio
     ========================================================== */
  function pintarInicio() {
    $("coachEmoji").textContent = coachActual.emoji;
    $("coachNombre").textContent = coachActual.nombre;
    $("flujoEmoji").textContent = coachActual.emoji;

    const grid = $("gridEventos");
    grid.innerHTML = "";
    EVENTOS.forEach((ev) => {
      const btn = document.createElement("button");
      btn.className = "evento-btn";
      btn.innerHTML =
        '<span class="evento-emoji">' + ev.emoji + "</span>" +
        '<span class="evento-texto">' + ev.texto + "</span>";
      btn.addEventListener("click", () => iniciarEvento(ev));
      grid.appendChild(btn);
    });
  }

  /* ==========================================================
     Flujos
     ========================================================== */
  function iniciarEvento(ev) {
    eventoActual = ev;
    datos.visitas++;
    guardarDatos();
    limpiarFlujo();
    mostrarPantalla("pantalla-flujo");

    if (ev.flujo === "antojo") {
      mostrarFrase(fraseDe("antojo"));
      preguntarQueComer();
    } else if (ev.flujo === "valeLaPena") {
      mostrarFrase(fraseDe(ev.id));
      preguntarValeLaPena();
    } else if (ev.flujo === "entreno") {
      datos.entrenos++;
      registrarVictoria();
      guardarDatos();
      mostrarFrase(fraseDe("entrene"));
      botonesFinales();
    } else {
      mostrarFrase(fraseDe(ev.id));
      botonesFinales(true); // permite pedir otra frase
    }
  }

  function limpiarFlujo() {
    $("flujoPregunta").classList.add("oculto");
    $("flujoOtro").classList.add("oculto");
    $("flujoOpciones").innerHTML = "";
    $("inputOtro").value = "";
    pasoFlujo = null;
  }

  function mostrarFrase(texto) {
    const burbuja = $("burbuja");
    // Reinicia la animación de la burbuja
    burbuja.style.animation = "none";
    void burbuja.offsetWidth;
    burbuja.style.animation = "";
    $("fraseTexto").textContent = texto;
  }

  function ponerPregunta(texto) {
    const p = $("flujoPregunta");
    p.textContent = texto;
    p.classList.remove("oculto");
  }

  function crearOpcion(texto, destacada, alHacerClick) {
    const btn = document.createElement("button");
    btn.className = "opcion-btn" + (destacada ? " destacada" : "");
    btn.textContent = texto;
    btn.addEventListener("click", alHacerClick);
    $("flujoOpciones").appendChild(btn);
    return btn;
  }

  /* --- Paso: ¿Qué vas a comer? --- */
  function preguntarQueComer() {
    ponerPregunta("¿Qué vas a comer?");
    $("flujoOpciones").innerHTML = "";
    $("flujoOtro").classList.add("oculto");

    OPCIONES_SALUDABLES.forEach((op) => {
      crearOpcion(op.emoji + "  " + op.texto, false, () => {
        limpiarFlujo();
        registrarVictoria();
        guardarDatos();
        mostrarFrase(fraseDe("comidaSaludable"));
        botonesFinales();
      });
    });

    crearOpcion("❓  Otro…", false, () => {
      $("flujoOpciones").innerHTML = "";
      $("flujoOtro").classList.remove("oculto");
      $("inputOtro").focus();
    });
  }

  /* --- Paso: respuesta libre en "Otro…" --- */
  function procesarOtro() {
    const texto = $("inputOtro").value.trim();
    if (!texto) return;

    limpiarFlujo();

    if (esNoSaludable(texto)) {
      mostrarFrase(fraseDe("comidaNoSaludable"));
      preguntarValeLaPena();
    } else {
      registrarVictoria();
      guardarDatos();
      mostrarFrase(fraseDe("comidaSaludable"));
      botonesFinales();
    }
  }

  /* --- Paso: ¿De verdad vale la pena? --- */
  function preguntarValeLaPena() {
    ponerPregunta("¿De verdad vale la pena?");
    $("flujoOpciones").innerHTML = "";

    crearOpcion("❌  No", true, () => {
      limpiarFlujo();
      datos.rechazos++;
      registrarVictoria();
      guardarDatos();
      mostrarFrase(fraseDe("victoria"));
      botonesFinales();
    });

    crearOpcion("✅  Sí", false, () => {
      limpiarFlujo();
      datos.pecados++;
      guardarDatos();
      mostrarFrase(fraseDe("pecado"));
      botonesFinales();
    });
  }

  /* --- Botones al final de un flujo --- */
  function botonesFinales(permiteOtraFrase) {
    $("flujoOpciones").innerHTML = "";
    if (permiteOtraFrase) {
      crearOpcion("🎲  Dime otra", false, () => {
        mostrarFrase(fraseDe(eventoActual.id));
      });
    }
    crearOpcion("🏠  Listo, volver", true, () => mostrarPantalla("pantalla-inicio"));
  }

  /* ==========================================================
     Estadísticas
     ========================================================== */
  /** Devuelve un mensaje de próxima meta según el progreso actual. */
  function proximaMeta() {
    const hitos = [3, 5, 7, 14, 21, 30, 45, 60, 90, 120, 180, 365];

    if (datos.racha === 0) {
      return "🎯 Hoy puede ser el día 1: una victoria y arranca tu racha.";
    }
    const siguiente = hitos.find((h) => h > datos.racha);
    if (siguiente) {
      const faltan = siguiente - datos.racha;
      return faltan === 1
        ? "🎯 ¡Mañana llegas a " + siguiente + " días de racha! No la sueltes."
        : "🎯 Próxima meta: " + siguiente + " días de racha. Te faltan solo " + faltan + ".";
    }
    return "🏆 Racha legendaria. Ahora la meta es no soltarla jamás.";
  }

  function pintarStats() {
    $("statRacha").textContent = datos.racha;
    $("statMejorRacha").textContent = "Mejor racha: " + datos.mejorRacha;
    $("statMeta").textContent = proximaMeta();
    $("statRechazos").textContent = datos.rechazos;
    $("statEntrenos").textContent = datos.entrenos;
    $("statPecados").textContent = datos.pecados;
    $("statVisitas").textContent = datos.visitas;
    $("statsFrase").textContent = "“" + fraseDe("statsComentario") + "”";
  }

  /* ==========================================================
     Tema
     ========================================================== */
  function aplicarTema() {
    document.documentElement.setAttribute("data-theme", datos.tema);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", datos.tema === "pastel" ? "#FFF7FA" : "#0D0D0F");
  }

  function alternarTema() {
    datos.tema = datos.tema === "pastel" ? "bestia" : "pastel";
    guardarDatos();
    aplicarTema();
  }

  /* ==========================================================
     Eventos globales
     ========================================================== */
  $("btnTema").addEventListener("click", alternarTema);
  $("btnVolver").addEventListener("click", () => mostrarPantalla("pantalla-inicio"));
  $("btnEnviarOtro").addEventListener("click", procesarOtro);
  $("inputOtro").addEventListener("keydown", (e) => {
    if (e.key === "Enter") procesarOtro();
  });
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => mostrarPantalla(btn.dataset.pantalla));
  });

  /* ==========================================================
     Arranque
     ========================================================== */
  aplicarTema();
  pintarInicio();
})();
