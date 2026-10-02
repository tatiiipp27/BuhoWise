(function () {
    const voiceScript = document.createElement("script");
    voiceScript.src = new URL("buhowise-voice.js?v=1", document.currentScript.src).href;
    document.head.appendChild(voiceScript);
    const STORAGE_KEY = "buhowiseAccessibility";
    let state = {
        fontSize: 100,
        darkMode: false,
        highContrast: false,
        dyslexia: false,
        readingMode: false,
        language: "en"
    };

    let isReadingModeActive = false;
    let currentHighlightedElement = null;
    let hoverTimer = null;
    let inputTypingTimer = null;

    function supportsSpeech() {
        return "speechSynthesis" in window &&
            typeof window.SpeechSynthesisUtterance === "function";
    }

    function getSweetFemaleVoice() {
        if (!supportsSpeech()) return null;
        const voices = window.speechSynthesis.getVoices();

        const preferredVoices = [
            "Microsoft Dalia Online", "Microsoft Ximena Online",
            "Microsoft Elvira Online", "Paulina", "Sabina",
            "Mia", "Lupe", "Paloma", "Dalia", "Larissa",
            "Hilda", "Sofia",
            "Google español de Estados Unidos",
            "Google español"
        ];

        for (const name of preferredVoices) {
            const voice = voices.find(v => v.name.includes(name) && v.lang.startsWith("es"));
            if (voice) return voice;
        }

        const latinVoice = voices.find(v => (v.lang === "es-MX" || v.lang === "es-US" || v.lang === "es-419"));
        if (latinVoice) return latinVoice;

        return voices.find(v => v.lang.startsWith("es")) || null;
    }

    function getEnglishVoice() {
        if (!supportsSpeech()) return null;
        const voices = window.speechSynthesis.getVoices();

        const preferredEnglishVoices = [
            "Microsoft Ava Online", "Microsoft Emma Online",
            "Microsoft Aria Online", "Microsoft Jenny Online", "Microsoft Sonia Online",
            "Aria", "Jenny", "Sonia", "Hazel", "Fiona", "Victoria",
            "Google UK English Female", "Google US English", "British English Female"
        ];

        for (const name of preferredEnglishVoices) {
            const voice = voices.find(v => v.name.includes(name) && v.lang.toLowerCase().startsWith("en"));
            if (voice) return voice;
        }

        const naturalEnglishVoice = voices.find(v => /natural|online/i.test(v.name) && v.lang.toLowerCase().startsWith("en"));
        if (naturalEnglishVoice) return naturalEnglishVoice;

        const usVoice = voices.find(v => v.lang.toLowerCase() === "en-us");
        if (usVoice) return usVoice;

        const gbVoice = voices.find(v => v.lang.toLowerCase() === "en-gb");
        if (gbVoice) return gbVoice;

        return voices.find(v => v.lang.startsWith("en")) || null;
    }

   
    if (typeof speechSynthesis !== "undefined" && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = function() {
            getSweetFemaleVoice();
            getEnglishVoice();
        };
    }

    function loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (saved && typeof saved === "object") {
                state = Object.assign(state, saved);
            }
        } catch (error) {
            state = {
                fontSize: 100,
                darkMode: false,
                highContrast: false,
                dyslexia: false,
                readingMode: false,
                language: "en"
            };
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            /* Accessibility controls still work when storage is unavailable. */
        }
    }

    /*
     * One shared accessibility interface for every BuhoWise page.
     * Legacy page markup is replaced here so the student, professor,
     * role-selection, path, and quiz pages always use the same base.
     */
    function ensureAccessibilityUi() {
        const existingButtons = Array.from(document.querySelectorAll(".accessibility-btn"));
        let button = existingButtons.shift();

        if (!button) {
            button = document.createElement("button");
            document.body.append(button);
        }

        existingButtons.forEach(function (extraButton) {
            extraButton.remove();
        });

        button.className = "accessibility-btn";
        button.type = "button";
        button.setAttribute("aria-label", "Accessibility Menu");
        button.setAttribute("aria-controls", "accessibilityPanel");
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("translate", "no");
        button.removeAttribute("onclick");
        button.dataset.bwTranslationIgnore = "true";
        button.dataset.bwAccessibility = "toggle-panel";
        button.innerHTML = '<i class="bi bi-universal-access" aria-hidden="true"></i>';

        let panel = document.getElementById("accessibilityPanel");
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "accessibilityPanel";
            document.body.append(panel);
        }

        panel.className = "accessibility-panel";
        panel.dataset.bwTranslationIgnore = "true";
        panel.setAttribute("translate", "no");
        panel.innerHTML = `
            <h5 class="mb-3 text-center">
                <i class="bi bi-sliders me-2" aria-hidden="true"></i>
                Accessibility Tools
            </h5>

            <div class="accessibility-grid">
                <button type="button" data-bw-accessibility="read">
                    <i class="bi bi-volume-up" aria-hidden="true"></i> Read
                </button>
                <button type="button" data-bw-accessibility="text-up">
                    <i class="bi bi-zoom-in" aria-hidden="true"></i> Text +
                </button>
                <button type="button" data-bw-accessibility="text-down">
                    <i class="bi bi-zoom-out" aria-hidden="true"></i> Text -
                </button>
                <button type="button" data-bw-accessibility="dark">
                    <i class="bi bi-moon" aria-hidden="true"></i> Dark
                </button>
                <button type="button" data-bw-accessibility="contrast">
                    <i class="bi bi-circle-half" aria-hidden="true"></i> Contrast
                </button>
                <button type="button" data-bw-accessibility="dyslexia">
                    <i class="bi bi-fonts" aria-hidden="true"></i> Dyslexia
                </button>
                <button type="button" data-bw-accessibility="language">
                    <i class="bi bi-translate" aria-hidden="true"></i> Español
                </button>
                <button type="button" class="btn-reset" data-bw-accessibility="reset">
                    <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Reset
                </button>
            </div>
        `;

        updateAccessibilityUiLabels();
        document.dispatchEvent(new CustomEvent("buhowise:accessibility-ready"));
    }

    window.BuhoWiseAccessibilityUI = {
        ensure: ensureAccessibilityUi
    };

    const phraseTranslations = new Map([
        ["home", "Inicio"],
        ["subjects", "Materias"],
        ["teachers", "Docentes"],
        ["about us", "Sobre Nosotros"],
        ["my profile", "Mi Perfil"],
        ["my avatar", "Mi Avatar"],
        ["choose avatar", "Elegir avatar"],
        ["accessibility tools", "Herramientas de accesibilidad"],
        ["skip to main content", "Saltar al contenido principal"],
        ["skip to dashboard", "Saltar al panel"],
        ["back to path", "Volver a la ruta"],
        ["back to units", "Volver a las unidades"],
        ["back to subjects", "Volver a las materias"],
        ["back to grades", "Volver a los grados"],
        ["start my lesson", "Comenzar mi lección"],
        ["open lesson", "Abrir lección"],
        ["open path", "Abrir ruta"],
        ["try again", "Intentar de nuevo"],
        ["next", "Siguiente"],
        ["correct!", "¡Correcto!"],
        ["great work!", "¡Excelente trabajo!"],
        ["good start!", "¡Buen comienzo!"],
        ["quick theory", "Teoría rápida"],
        ["quick links", "Enlaces rápidos"],
        ["learning path", "Ruta de aprendizaje"],
        ["language arts", "Lenguaje"],
        ["mathematics", "Matemáticas"],
        ["coming soon", "Próximamente"],
        ["available", "Disponible"],
        ["completed", "Completada"],
        ["lesson completed", "Lección completada"],
        ["active unit", "Unidad activa"],
        ["this unit", "Esta unidad"],
        ["eight connected lessons", "Ocho lecciones conectadas"],
        ["interactive questions", "Preguntas interactivas"],
        ["unit review", "Repaso de la unidad"],
        ["final challenge", "Desafío final"],
        ["main idea", "idea principal"],
        ["key details", "detalles clave"],
        ["supporting details", "detalles de apoyo"],
        ["author purpose", "propósito del autor"],
        ["first person", "primera persona"],
        ["third person", "tercera persona"],
        ["text evidence", "evidencia textual"],
        ["topic sentence", "oración temática"],
        ["sequence of events", "secuencia de eventos"],
        ["turning point", "punto de giro"],
        ["time and place", "tiempo y lugar"],
        ["full thought", "idea completa"],
        ["question mark", "signo de interrogación"],
        ["page number", "número de página"],
        ["page numbers", "números de página"],
        ["square root", "raíz cuadrada"],
        ["absolute value", "valor absoluto"],
        ["number line", "recta numérica"],
        ["positive number", "número positivo"],
        ["negative number", "número negativo"],
        ["real numbers", "números reales"],
        ["whole numbers", "números enteros"],
        ["linear function", "función lineal"],
        ["quadratic function", "función cuadrática"],
        ["algebraic expression", "expresión algebraica"],
        ["algebraic expressions", "expresiones algebraicas"],
        ["first-degree equation", "ecuación de primer grado"],
        ["problem solving", "resolución de problemas"],
        ["professor dashboard", "Panel del docente"],
        ["professor workspace", "Espacio del docente"],
        ["student points", "Puntos de estudiantes"],
        ["quiz builder", "Creador de quizzes"],
        ["lesson planner", "Planificador de lecciones"],
        ["teaching support", "Apoyo docente"],
        ["quick actions", "Acciones rápidas"],
        ["create a class", "Crear una clase"],
        ["join a class", "Unirse a una clase"],
        ["create a quiz", "Crear un quiz"],
        ["give points", "Dar puntos"],
        ["student ranking", "Clasificación de estudiantes"],
        ["saved on this device", "Guardado en este dispositivo"],
        ["display name", "Nombre visible"],
        ["choose your role", "Elige tu rol"],
        ["change role", "Cambiar rol"],
        ["i am a student", "Soy estudiante"],
        ["i am a professor", "Soy docente"],
        ["enter student space", "Entrar al espacio estudiantil"],
        ["enter professor space", "Entrar al espacio docente"],
        ["continue with google", "Continuar con Google"],
        ["explore subjects, complete accessible lessons, earn progress, and view the student ranking.", "Explora materias, completa lecciones accesibles, gana progreso y consulta la clasificación estudiantil."],
        ["manage classes, award points, build quizzes, plan lessons, and follow student progress.", "Administra clases, asigna puntos, crea quizzes, planifica lecciones y acompaña el progreso estudiantil."],
        ["choose any lesson below", "Elige cualquier lección a continuación"],
        ["every quiz contains 10 questions", "Cada quiz contiene 10 preguntas"],
        ["all rights reserved", "Todos los derechos reservados"],
        ["skip to role selection", "Saltar a la selección de rol"],
        ["how will you use buhowise?", "¿Cómo usarás BuhoWise?"],
        ["how will you use", "¿Cómo usarás"],
        ["buhowise?", "BuhoWise?"],
        ["choose your learning space.", "Elige tu espacio de aprendizaje."],
        ["your selection and progress stay private on this device.", "Tu selección y progreso permanecen privados en este dispositivo."],
        ["save profile", "Guardar perfil"],
        ["how should we call you?", "¿Cómo debemos llamarte?"],
        ["available quizzes", "Quizzes disponibles"],
        ["toggle navigation", "Alternar navegación"],
        ["create account", "Crear cuenta"],
        ["account creation is coming soon.", "La creación de cuentas estará disponible pronto."],
        ["you can explore every lesson without an account.", "Puedes explorar todas las lecciones sin una cuenta."],
        ["explore subjects", "Explorar materias"],
        ["choose a unit", "Elige una unidad"],
        ["language arts units", "Unidades de Lenguaje"],
        ["overview", "Resumen"],
        ["classes", "Clases"],
        ["ranking", "Clasificación"],
        ["accessible by design", "Accesible desde el diseño"],
        ["every action works with keyboard navigation, clear labels and screen-reader status messages.", "Todas las acciones funcionan con navegación por teclado, etiquetas claras y mensajes de estado para lectores de pantalla."],
        ["manage classroom activities and support every learner from one place.", "Administra las actividades del aula y apoya a cada estudiante desde un solo lugar."],
        ["teach clearly.", "Enseña con claridad."],
        ["celebrate progress.", "Celebra el progreso."],
        ["student name", "Nombre del estudiante"],
        ["add student", "Agregar estudiante"],
        ["save changes", "Guardar cambios"],
        ["delete", "Eliminar"],
        ["cancel", "Cancelar"],
        ["continue", "Continuar"],
        ["close", "Cerrar"],
        ["submit", "Enviar"],
        ["score", "Puntuación"],
        ["question", "Pregunta"],
        ["questions", "Preguntas"],
        ["lesson", "Lección"],
        ["lessons", "Lecciones"],
        ["support", "Apoyo"],
        ["teacher support", "Apoyo docente"],
        ["mathematics support", "Apoyo de Matemáticas"],
        ["language arts support", "Apoyo de Lenguaje"],
        ["learning without limits", "Aprendizaje sin límites"],
        ["without limits", "sin límites"],
        ["featured quiz of the week!", "¡Quiz destacado de la semana!"],
        ["start quiz now", "Comenzar el quiz ahora"],
        ["available subjects", "Materias disponibles"],
        ["identity & purpose", "Identidad y propósito"],
        ["our story", "Nuestra historia"],
        ["every person learns in a different way.", "Cada persona aprende de una manera diferente."],
        ["buhowise was born from a simple reality: there are still not enough learning tools designed around the different ways people understand, practice, and remember information.", "BuhoWise nació de una realidad sencilla: todavía no existen suficientes herramientas de aprendizaje diseñadas para las distintas formas en que las personas comprenden, practican y recuerdan la información."],
        ["some students learn best with visual examples. others need clear step-by-step explanations, repetition, immediate feedback, or the freedom to practice at their own pace. learning should not expect every student to follow one single method.", "Algunos estudiantes aprenden mejor con ejemplos visuales. Otros necesitan explicaciones claras paso a paso, repetición, retroalimentación inmediata o la libertad de practicar a su propio ritmo. El aprendizaje no debe exigir que todos sigan un único método."],
        ["our team created buhowise to bring lessons, quizzes, learning paths, progress, and supportive tools together in one welcoming space for third cycle students in el salvador.", "Nuestro equipo creó BuhoWise para reunir lecciones, quizzes, rutas de aprendizaje, progreso y herramientas de apoyo en un espacio acogedor para estudiantes de tercer ciclo en El Salvador."],
        ["our purpose", "Nuestro propósito"],
        ["mission & vision", "Misión y visión"],
        ["what guides us", "Lo que nos guía"],
        ["the people behind the idea", "Las personas detrás de la idea"],
        ["meet the team", "Conoce al equipo"],
        ["six students, one shared goal: creating a learning experience that respects the different ways people learn.", "Seis estudiantes, un objetivo compartido: crear una experiencia de aprendizaje que respete las distintas formas de aprender."],
        ["buhowise team member", "Integrante del equipo BuhoWise"],
        ["part of the team that transformed a shared idea into the buhowise learning experience.", "Parte del equipo que convirtió una idea compartida en la experiencia de aprendizaje BuhoWise."],
        ["helped shape a platform designed to respect the many different ways students learn.", "Ayudó a crear una plataforma diseñada para respetar las distintas formas en que aprenden los estudiantes."],
        ["contributed to the collaborative work behind an inclusive and welcoming educational space.", "Contribuyó al trabajo colaborativo detrás de un espacio educativo inclusivo y acogedor."],
        ["supported the team effort to make learning feel clearer, friendlier, and more engaging.", "Apoyó el esfuerzo del equipo para hacer que el aprendizaje sea más claro, cercano y atractivo."],
        ["took part in building a project that combines practice, technology, and student-centered learning.", "Participó en la creación de un proyecto que combina práctica, tecnología y aprendizaje centrado en el estudiante."],
        ["helped bring buhowise to life through teamwork and a shared commitment to better learning opportunities.", "Ayudó a hacer realidad BuhoWise mediante el trabajo en equipo y un compromiso compartido con mejores oportunidades de aprendizaje."],
        ["designed for students", "Diseñado para estudiantes"],
        ["what makes buhowise different", "Qué hace diferente a BuhoWise"],
        ["clear learning paths", "Rutas de aprendizaje claras"],
        ["organized lessons help students know what to practice next.", "Las lecciones organizadas ayudan a los estudiantes a saber qué practicar después."],
        ["interactive practice", "Práctica interactiva"],
        ["short quizzes provide immediate feedback in an engaging format.", "Los quizzes breves ofrecen retroalimentación inmediata en un formato atractivo."],
        ["visible progress", "Progreso visible"],
        ["completed lessons stay marked so students can follow their journey.", "Las lecciones completadas permanecen marcadas para que los estudiantes sigan su recorrido."],
        ["student identity", "Identidad del estudiante"],
        ["avatars give every learner a friendly guide and a sense of ownership.", "Los avatares dan a cada estudiante una guía amigable y un sentido de pertenencia."],
        ["focused subjects", "Materias enfocadas"],
        ["mathematics and language arts content supports grades 7 through 9.", "El contenido de Matemáticas y Lenguaje apoya los grados 7.º a 9.º."],
        ["flexible learning", "Aprendizaje flexible"],
        ["students can review, repeat, and move through lessons at their own pace.", "Los estudiantes pueden repasar, repetir y avanzar por las lecciones a su propio ritmo."],
        ["ready to learn?", "¿Listos para aprender?"],
        ["start your buhowise journey today.", "Comienza hoy tu recorrido en BuhoWise."],
        ["choose a subject, follow your learning path, and discover a way of learning that feels right for you.", "Elige una materia, sigue tu ruta de aprendizaje y descubre una forma de aprender que se adapte a ti."],
        ["meet our teachers", "Conoce a nuestros docentes"],
        ["our mission", "Nuestra misión"],
        ["our vision", "Nuestra visión"],
        ["our core values", "Nuestros valores principales"],
        ["third cycle - el salvador", "Tercer Ciclo - El Salvador"],
        ["third cycle", "Tercer Ciclo"],
        ["choose what you want to learn", "Elige lo que quieres aprender"],
        ["choose what you want to", "Elige lo que quieres"],
        ["what you want to learn", "lo que quieres aprender"],
        ["buhowise is an accessible learning platform that helps students improve their knowledge through interactive quizzes, engaging lessons, learning challenges, and inclusive technology designed for every learner.", "BuhoWise es una plataforma de aprendizaje accesible que ayuda a los estudiantes a mejorar sus conocimientos mediante quizzes interactivos, lecciones atractivas, desafíos de aprendizaje y tecnología inclusiva diseñada para cada estudiante."],
        ["buhowise is an inclusive learning platform created to make education clearer, more engaging, and more flexible for every student.", "BuhoWise es una plataforma de aprendizaje inclusiva creada para hacer que la educación sea más clara, atractiva y flexible para cada estudiante."],
        ["challenge yourself with our most popular educational quiz. test your knowledge, earn points, and improve your skills in a fun and interactive way.", "Ponte a prueba con nuestro quiz educativo más popular. Demuestra tus conocimientos, gana puntos y mejora tus habilidades de una forma divertida e interactiva."],
        ["buhowise now focuses on mathematics and language arts for third cycle students in el salvador.", "BuhoWise se enfoca actualmente en Matemáticas y Lenguaje para estudiantes de tercer ciclo en El Salvador."],
        ["buhowise now focuses on the two core areas we can deliver well: mathematics and language arts for 7th, 8th, and 9th grade students in el salvador.", "BuhoWise se enfoca actualmente en dos áreas principales: Matemáticas y Lenguaje para estudiantes de 7.º, 8.º y 9.º grado en El Salvador."],
        ["strengthen reading, writing, grammar, communication, and text analysis.", "Fortalece la lectura, la escritura, la gramática, la comunicación y el análisis de textos."],
        ["practice units, lesson paths, and problem-solving skills for 7th, 8th, and 9th grade.", "Practica con unidades, rutas de lecciones y habilidades de resolución de problemas para 7.º, 8.º y 9.º grado."],
        ["get to know the core ideals, mission, and basic human values that move the buhowise platform forward.", "Conoce los ideales, la misión y los valores humanos fundamentales que impulsan la plataforma BuhoWise."],
        ["to provide accessible, engaging, and innovative educational experiences that empower students to learn without barriers in el salvador.", "Brindar experiencias educativas accesibles, atractivas e innovadoras que permitan a los estudiantes aprender sin barreras en El Salvador."],
        ["to become a leading educational platform where every single learner can achieve their full potential through active inclusive technology.", "Convertirnos en una plataforma educativa líder donde cada estudiante pueda alcanzar su máximo potencial mediante tecnología activa e inclusiva."],
        ["education should be completely available to everyone regardless of any background or physiological abilities.", "La educación debe estar completamente disponible para todas las personas, sin importar su origen o sus capacidades físicas."],
        ["we actively use cutting-edge technology to shape better adaptive, modern learning experiences.", "Usamos activamente tecnología de vanguardia para crear experiencias de aprendizaje modernas, adaptativas y de mayor calidad."],
        ["every unique individual learner deserves equal, respectful, and scalable opportunities to succeed.", "Cada estudiante merece oportunidades equitativas, respetuosas y adaptables para alcanzar el éxito."],
        ["accessibility", "Accesibilidad"],
        ["innovation", "Innovación"],
        ["inclusion", "Inclusión"],
        ["making education accessible, engaging, and inclusive for every learner in el salvador. learning without limits.", "Hacemos que la educación sea accesible, atractiva e inclusiva para cada estudiante en El Salvador. Aprendizaje sin límites."],
        ["pick a subject first. then choose your grade and open the units for that learning area.", "Primero elige una materia. Después, selecciona tu grado y abre las unidades de esa área de aprendizaje."],
        ["build problem-solving skills through units, lesson paths, quick reviews, and accessible practice.", "Desarrolla habilidades para resolver problemas mediante unidades, rutas de lecciones, repasos rápidos y práctica accesible."],
        ["strengthen reading comprehension, writing, grammar, communication, and text analysis.", "Fortalece la comprensión lectora, la escritura, la gramática, la comunicación y el análisis de textos."],
        ["choose grade", "Elegir grado"],
        ["7th grade", "7.º grado"],
        ["8th grade", "8.º grado"],
        ["9th grade", "9.º grado"],
        ["7th", "7.º"],
        ["8th", "8.º"],
        ["9th", "9.º"],
        ["what is the value of", "¿Cuál es el valor de"],
        ["which of the following", "¿Cuál de las siguientes"],
        ["according to the text", "Según el texto"],
        ["choose the correct answer", "Elige la respuesta correcta"],
        ["expand the product", "Desarrolla el producto"],
        ["what is", "¿Qué es"],
        ["what are", "¿Cuáles son"],
        ["lesson", "Lección"],
        ["correct.", "Correcto."],
        ["almost.", "Casi."],
        ["temperature helps us understand positive numbers, negative numbers, and zero.", "La temperatura nos ayuda a comprender los números positivos, los números negativos y el cero."],
        ["in this lesson, read the situation carefully and connect the number sign with its meaning.", "En esta lección, lee con atención la situación y relaciona el signo del número con su significado."],
        ["use the examples before starting the quiz.", "Usa los ejemplos antes de comenzar el quiz."],
        ["a reference point helps us describe position and direction.", "Un punto de referencia nos ayuda a describir la posición y la dirección."],
        ["reference point means zero", "El punto de referencia significa cero"],
        ["one direction is positive", "Una dirección es positiva"],
        ["opposite direction is negative", "La dirección opuesta es negativa"],
        ["a difference tells if a value is above, below, or equal to a reference.", "Una diferencia indica si un valor está por encima, por debajo o es igual a una referencia."],
        ["the number line shows integers in order from negative to positive.", "La recta numérica muestra los números enteros en orden, de negativos a positivos."],
        ["use the number line to compare positive and negative numbers.", "Usa la recta numérica para comparar números positivos y negativos."],
        ["absolute value is distance from zero.", "El valor absoluto es la distancia desde cero."],
        ["absolute value is the distance from zero, so it is always zero or positive. for example, |-8| = 8 and |-3| = 3.", "El valor absoluto es la distancia desde cero, por lo que siempre es cero o positivo. Por ejemplo, |-8| = 8 y |-3| = 3."],
        ["to order negative numbers, compare their positions on the number line. a greater absolute value places a negative number farther left.", "Para ordenar números negativos, compara sus posiciones en la recta numérica. Un valor absoluto mayor coloca al número negativo más hacia la izquierda."],
        ["a number line shows position and movement. moving right increases a number, while moving left decreases it.", "Una recta numérica muestra posición y movimiento. Moverse a la derecha aumenta un número, mientras que moverse a la izquierda lo disminuye."],
        ["to add a positive number, move right. to add a negative number, move left.", "Para sumar un número positivo, muévete a la derecha. Para sumar un número negativo, muévete a la izquierda."],
        ["the final position is the result. always begin at the starting number and count each unit carefully.", "La posición final es el resultado. Comienza siempre en el número inicial y cuenta cada unidad con cuidado."],
        ["when two numbers have the same sign, add their absolute values and keep the common sign.", "Cuando dos números tienen el mismo signo, suma sus valores absolutos y conserva el signo común."],
        ["positive plus positive is positive; negative plus negative is negative.", "Positivo más positivo es positivo; negativo más negativo es negativo."],
        ["positive numbers, negative numbers, and zero for temperature", "Números positivos, números negativos y cero en la temperatura"],
        ["above zero is positive", "Por encima de cero es positivo"],
        ["below zero is negative", "Por debajo de cero es negativo"],
        ["zero is the reference point", "Cero es el punto de referencia"],
        ["use the number line to check the direction and result.", "Usa la recta numérica para comprobar la dirección y el resultado."],
        ["when numbers have different signs, subtract the smaller absolute value from the larger one and keep the sign of the number with greater absolute value.", "Cuando los números tienen signos diferentes, resta el valor absoluto menor del mayor y conserva el signo del número con mayor valor absoluto."],
        ["absolute value tells which number has the stronger magnitude.", "El valor absoluto indica qué número tiene mayor magnitud."],
        ["a number and its opposite add to zero.", "Un número y su opuesto suman cero."],
        ["zero is the additive identity: adding zero does not change a number.", "Cero es el elemento neutro de la suma: sumar cero no cambia un número."],
        ["for every number a, a + 0 = 0 + a = a.", "Para todo número a, a + 0 = 0 + a = a."],
        ["add signed decimals and fractions using the same sign rules used for integers.", "Suma decimales y fracciones con signo usando las mismas reglas de signos que para los enteros."],
        ["for fractions, use a common denominator before adding or subtracting the numerators.", "Para las fracciones, usa un denominador común antes de sumar o restar los numeradores."],
        ["for decimals, align decimal points and then apply the correct sign.", "Para los decimales, alinea los puntos decimales y luego aplica el signo correcto."],
        ["the commutative property changes the order of addends without changing the sum: a + b = b + a.", "La propiedad conmutativa cambia el orden de los sumandos sin cambiar la suma: a + b = b + a."],
        ["the associative property changes the grouping of addends: (a + b) + c = a + (b + c).", "La propiedad asociativa cambia la agrupación de los sumandos: (a + b) + c = a + (b + c)."],
        ["these properties make mental calculations easier.", "Estas propiedades facilitan los cálculos mentales."],
        ["subtracting a number is the same as adding its opposite: a - b = a + (-b).", "Restar un número equivale a sumar su opuesto: a - b = a + (-b)."],
        ["subtracting a positive number moves left on the number line.", "Restar un número positivo mueve hacia la izquierda en la recta numérica."],
        ["subtracting a negative number becomes addition and moves right.", "Restar un número negativo se convierte en una suma y mueve hacia la derecha."],
        ["subtracting zero does not change a number: a - 0 = a.", "Restar cero no cambia un número: a - 0 = a."],
        ["for combined additions and subtractions, work from left to right after changing subtraction into addition of the opposite.", "Para sumas y restas combinadas, trabaja de izquierda a derecha después de convertir la resta en la suma del opuesto."],
        ["keep track of every sign and use parentheses when needed.", "Lleva el control de cada signo y usa paréntesis cuando sea necesario."],
        ["check the result with a number line or estimation.", "Comprueba el resultado con una recta numérica o una estimación."],
        ["the product of two numbers with different signs is negative.", "El producto de dos números con signos diferentes es negativo."],
        ["multiply the absolute values, then attach a negative sign.", "Multiplica los valores absolutos y luego añade un signo negativo."],
        ["use sign rules before calculating the magnitude.", "Aplica las reglas de signos antes de calcular la magnitud."],
        ["the product of two numbers with the same sign is positive.", "El producto de dos números con el mismo signo es positivo."],
        ["positive times positive is positive, and negative times negative is positive.", "Positivo por positivo es positivo y negativo por negativo es positivo."],
        ["multiplying by 1 keeps a number unchanged, multiplying by 0 gives zero, and multiplying by -1 gives the opposite.", "Multiplicar por 1 mantiene el número sin cambios, multiplicar por 0 da cero y multiplicar por -1 da el opuesto."],
        ["the commutative property changes factor order: a × b = b × a.", "La propiedad conmutativa cambia el orden de los factores: a × b = b × a."],
        ["the associative property changes factor grouping: (a × b) × c = a × (b × c).", "La propiedad asociativa cambia la agrupación de los factores: (a × b) × c = a × (b × c)."],
        ["the product stays the same when order or grouping changes.", "El producto permanece igual cuando cambia el orden o la agrupación."],
        ["a product with an even number of negative factors is positive; an odd number is negative.", "Un producto con un número par de factores negativos es positivo; con un número impar es negativo."],
        ["a power represents repeated multiplication: aⁿ means multiply a by itself n times.", "Una potencia representa una multiplicación repetida: aⁿ significa multiplicar a por sí misma n veces."],
        ["the base is the repeated factor and the exponent tells how many times it appears.", "La base es el factor que se repite y el exponente indica cuántas veces aparece."],
        ["parentheses matter when the base is negative.", "Los paréntesis son importantes cuando la base es negativa."],
        ["evaluate powers before performing multiplication.", "Evalúa las potencias antes de realizar la multiplicación."],
        ["follow the order of operations: exponents come before multiplication.", "Sigue el orden de las operaciones: los exponentes van antes que la multiplicación."],
        ["division uses the same sign rules as multiplication: same signs give positive and different signs give negative.", "La división usa las mismas reglas de signos que la multiplicación: signos iguales dan positivo y signos diferentes dan negativo."],
        ["zero divided by any nonzero number is zero.", "Cero dividido entre cualquier número distinto de cero es cero."],
        ["division by zero is undefined and is never allowed.", "La división entre cero no está definida y nunca está permitida."],
        ["a number pattern is a sequence that follows a rule.", "Un patrón numérico es una secuencia que sigue una regla."],
        ["find the change between consecutive terms to identify the rule.", "Encuentra el cambio entre términos consecutivos para identificar la regla."],
        ["use the rule to predict missing or future terms.", "Usa la regla para predecir términos faltantes o futuros."],
        ["generalizing a pattern means writing a rule that works for any term number n.", "Generalizar un patrón significa escribir una regla que funcione para cualquier número de término n."],
        ["an algebraic expression combines numbers, operations, and a variable.", "Una expresión algebraica combina números, operaciones y una variable."],
        ["a variable represents an unknown or changing value.", "Una variable representa un valor desconocido o cambiante."],
        ["evaluate an expression by substituting a value for the variable.", "Evalúa una expresión sustituyendo un valor por la variable."],
        ["expressions can contain two or more variables, such as 2x + 3y.", "Las expresiones pueden contener dos o más variables, como 2x + 3y."],
        ["in algebra, multiplication is usually written without the × sign: 3 × x is written 3x.", "En álgebra, la multiplicación suele escribirse sin el signo ×: 3 × x se escribe 3x."],
        ["multiplying an expression by 1 leaves it unchanged.", "Multiplicar una expresión por 1 no la cambia."],
        ["multiplying an expression by -1 gives its opposite and changes the sign of every term.", "Multiplicar una expresión por -1 da su opuesto y cambia el signo de cada término."],
        ["a power of an algebraic expression represents repeated multiplication.", "Una potencia de una expresión algebraica representa una multiplicación repetida."],
        ["algebraic division can be written with a fraction bar or the ÷ symbol.", "La división algebraica puede escribirse con una barra de fracción o con el símbolo ÷."],
        ["a quotient such as x/3 means x divided by 3.", "Un cociente como x/3 significa x dividido entre 3."],
        ["the main idea is the central point a text is trying to make.", "La idea principal es el punto central que un texto intenta comunicar."],
        ["supporting details give more information about the main idea.", "Los detalles de apoyo brindan más información sobre la idea principal."],
        ["the main idea is often found in the topic sentence of a paragraph.", "La idea principal suele encontrarse en la oración temática de un párrafo."],
        ["an inference is a conclusion based on evidence and reasoning, not stated directly.", "Una inferencia es una conclusión basada en evidencias y razonamiento, no expresada directamente."],
        ["readers combine clues from the text with their own knowledge to make inferences.", "Los lectores combinan las pistas del texto con sus propios conocimientos para hacer inferencias."],
        ["making inferences is often called reading between the lines.", "Hacer inferencias suele llamarse leer entre líneas."],
        ["sequencing is the order in which events happen in a text.", "La secuencia es el orden en que ocurren los eventos de un texto."],
        ["signal words like first, next, then, and finally help show sequence.", "Palabras de señal como primero, después, luego y finalmente ayudan a mostrar la secuencia."],
        ["a cause is why something happens; an effect is what happens as a result.", "Una causa es por qué ocurre algo; un efecto es lo que ocurre como resultado."],
        ["author's purpose is the reason a writer creates a text: to inform, persuade, or entertain.", "El propósito del autor es la razón por la que un escritor crea un texto: informar, persuadir o entretener."],
        ["informative texts explain facts; persuasive texts try to convince; entertaining texts tell stories.", "Los textos informativos explican hechos; los textos persuasivos intentan convencer; los textos recreativos cuentan historias."],
        ["a narrative is a story with characters, a setting, a plot, and a theme.", "Una narración es una historia con personajes, ambiente, trama y tema."],
        ["a narrative is best defined as...", "Una narración se define mejor como..."],
        ["a list of facts", "una lista de hechos"],
        ["a story with characters and events", "una historia con personajes y acontecimientos"],
        ["an argument essay", "un ensayo argumentativo"],
        ["a set of instructions", "un conjunto de instrucciones"],
        ["which is not a basic element of a narrative?", "¿Cuál NO es un elemento básico de una narración?"],
        ["bibliography", "bibliografía"],
        ["the setting of a story refers to...", "El ambiente de una historia se refiere a..."],
        ["the characters' feelings", "los sentimientos de los personajes"],
        ["the time and place where the story happens", "el tiempo y el lugar donde ocurre la historia"],
        ["the moral of the story", "la moraleja de la historia"],
        ["the author's opinion", "la opinión del autor"],
        ["the plot of a story is...", "La trama de una historia es..."],
        ["the sequence of events", "la secuencia de acontecimientos"],
        ["the location only", "solo la ubicación"],
        ["the author's biography", "la biografía del autor"],
        ["a list of characters", "una lista de personajes"],
        ["true or false: every narrative must have a conflict.", "Verdadero o falso: toda narración debe tener un conflicto."],
        ["the theme of a story is...", "El tema de una historia es..."],
        ["the central message or lesson", "el mensaje central o la enseñanza"],
        ["who are the people or animals in a story called?", "¿Cómo se llaman las personas o animales de una historia?"],
        ["the characters", "los personajes"],
        ["the theme", "el tema"],
        ["the conflict", "el conflicto"],
        ["the conflict in a narrative is...", "El conflicto en una narración es..."],
        ["the problem the characters must solve", "el problema que los personajes deben resolver"],
        ["the ending only", "solo el final"],
        ["the author's name", "el nombre del autor"],
        ["which element answers the question 'where and when does the story happen'?", "¿Qué elemento responde a la pregunta 'dónde y cuándo ocurre la historia'?"],
        ["understanding narrative elements helps readers...", "Comprender los elementos narrativos ayuda a los lectores a..."],
        ["skip important parts of a story", "saltarse partes importantes de una historia"],
        ["analyze and understand how a story works", "analizar y comprender cómo funciona una historia"],
        ["memorize page numbers", "memorizar números de página"],
        ["avoid the ending", "evitar el final"],
        ["the five basic elements are characters, setting, plot, conflict, and theme.", "Los cinco elementos básicos son personajes, ambiente, trama, conflicto y tema."],
        ["setting is the time and place of a story.", "El ambiente es el tiempo y el lugar de una historia."],
        ["atmosphere is the mood or feeling created by the setting and word choice.", "La atmósfera es el estado de ánimo o sensación creada por el ambiente y la elección de palabras."],
        ["characterization is how an author reveals a character's personality.", "La caracterización es la forma en que un autor revela la personalidad de un personaje."],
        ["main characters are called protagonists; opposing characters are called antagonists.", "Los personajes principales se llaman protagonistas; los personajes opuestos se llaman antagonistas."],
        ["plot structure includes exposition, rising action, climax, falling action, and resolution.", "La estructura de la trama incluye exposición, acción ascendente, clímax, acción descendente y desenlace."],
        ["the climax is the turning point or most intense part of the story.", "El clímax es el punto de giro o la parte más intensa de la historia."],
        ["point of view is the perspective from which a story is told.", "El punto de vista es la perspectiva desde la que se cuenta una historia."],
        ["theme is the central message, lesson, or insight about life in a story.", "El tema es el mensaje central, la enseñanza o reflexión sobre la vida en una historia."],
        ["informational texts are written to explain, describe, or inform readers about a topic using facts.", "Los textos informativos se escriben para explicar, describir o informar a los lectores sobre un tema usando hechos."],
        ["common examples include textbooks, articles, manuals, and encyclopedias.", "Algunos ejemplos comunes son los libros de texto, artículos, manuales y enciclopedias."],
        ["informational texts rely on facts, data, and evidence rather than opinions.", "Los textos informativos se basan en hechos, datos y evidencias, no en opiniones."],
        ["a fact is a statement that can be proven true or false.", "Un hecho es una afirmación que puede demostrarse verdadera o falsa."],
        ["an opinion is a personal belief, feeling, or judgment that cannot be proven.", "Una opinión es una creencia, sentimiento o juicio personal que no puede demostrarse."],
        ["an argument is a claim the author makes and supports with reasons and evidence.", "Un argumento es una afirmación que el autor presenta y respalda con razones y evidencias."],
        ["evidence includes facts, statistics, examples, and expert opinions used to support a claim.", "La evidencia incluye hechos, estadísticas, ejemplos y opiniones de expertos que se usan para respaldar una afirmación."],
        ["the main parts of speech are nouns, verbs, adjectives, adverbs, pronouns, prepositions, conjunctions, and interjections.", "Las principales categorías gramaticales son sustantivos, verbos, adjetivos, adverbios, pronombres, preposiciones, conjunciones e interjecciones."],
        ["nouns name people, places, things, or ideas; verbs show action or state of being.", "Los sustantivos nombran personas, lugares, cosas o ideas; los verbos expresan acción o estado."],
        ["adjectives describe nouns; adverbs describe verbs, adjectives, or other adverbs.", "Los adjetivos describen sustantivos; los adverbios describen verbos, adjetivos u otros adverbios."],
        ["every complete sentence has a subject and a predicate.", "Toda oración completa tiene sujeto y predicado."],
        ["verb tense shows when an action happens: past, present, or future.", "El tiempo verbal indica cuándo ocurre una acción: pasado, presente o futuro."],
        ["subjects and verbs must agree in number: singular subjects take singular verbs, plural subjects take plural verbs.", "Los sujetos y los verbos deben concordar en número: los sujetos singulares llevan verbos singulares y los sujetos plurales llevan verbos plurales."],
        ["periods end statements, question marks end questions, and exclamation points show strong emotion.", "Los puntos terminan las afirmaciones, los signos de interrogación terminan las preguntas y los signos de exclamación muestran una emoción intensa."]
        ,
        ["location with respect to a reference point", "Ubicación con respecto a un punto de referencia"],
        ["difference from a reference quantity", "Diferencia con respecto a una cantidad de referencia"],
        ["the number line", "La recta numérica"],
        ["comparing positive and negative numbers", "Comparación de números positivos y negativos"],
        ["absolute value", "Valor absoluto"],
        ["ordering negative numbers and their absolute value", "Orden de los números negativos y su valor absoluto"],
        ["movement on the number line", "Desplazamiento en la recta numérica"],
        ["addition of numbers with the same sign", "Suma de números con el mismo signo"],
        ["addition of numbers with different signs", "Suma de números con signos diferentes"],
        ["sums including zero", "Sumas que incluyen cero"],
        ["addition of positive and negative decimals and fractions", "Suma de decimales y fracciones positivas y negativas"],
        ["commutative and associative properties of addition", "Propiedades conmutativa y asociativa de la suma"],
        ["subtraction of a positive or negative number", "Resta de un número positivo o negativo"],
        ["subtractions including zero", "Restas que incluyen cero"],
        ["combined addition and subtraction of positive and negative numbers", "Sumas y restas combinadas de números positivos y negativos"],
        ["multiplication of numbers with different signs", "Multiplicación de números con signos diferentes"],
        ["multiplication of numbers with the same sign", "Multiplicación de números con el mismo signo"],
        ["multiplication including -1, 0, and 1", "Multiplicación que incluye -1, 0 y 1"],
        ["commutative and associative properties of multiplication", "Propiedades conmutativa y asociativa de la multiplicación"],
        ["sign of a product based on the number of negative factors", "Signo de un producto según el número de factores negativos"],
        ["powers of a number", "Potencias de un número"],
        ["multiplication including powers", "Multiplicación que incluye potencias"],
        ["division of positive and negative integers and zero", "División de números enteros positivos y negativos y del cero"],
        ["number patterns", "Patrones numéricos"],
        ["generalizing a number pattern", "Generalización de un patrón numérico"],
        ["algebraic expressions with one variable", "Expresiones algebraicas con una variable"],
        ["algebraic expressions with more than one variable", "Expresiones algebraicas con más de una variable"],
        ["writing algebraic products without the multiplication sign", "Representación de productos algebraicos sin el signo de multiplicación"],
        ["algebraic expressions multiplied by 1 or -1", "Expresiones algebraicas multiplicadas por 1 o -1"],
        ["powers of an algebraic expression", "Potencia de una expresión algebraica"],
        ["algebraic expressions with division", "Expresiones algebraicas con división"],
        ["identifying the main idea", "Identificación de la idea principal"],
        ["finding supporting details", "Búsqueda de detalles de apoyo"],
        ["making inferences", "Realización de inferencias"],
        ["sequencing events", "Secuencia de eventos"],
        ["cause and effect relationships", "Relaciones de causa y efecto"],
        ["author's purpose", "Propósito del autor"],
        ["unit review", "Repaso de la unidad"],
        ["final unit challenge", "Desafío final de la unidad"],
        ["elements of a narrative", "Elementos de una narración"],
        ["setting and atmosphere", "Ambiente y atmósfera"],
        ["characters and characterization", "Personajes y caracterización"],
        ["plot structure", "Estructura de la trama"],
        ["point of view", "Punto de vista"],
        ["theme and message", "Tema y mensaje"],
        ["purpose of informational texts", "Propósito de los textos informativos"],
        ["text structure and organization", "Estructura y organización del texto"],
        ["facts vs. opinions", "Hechos y opiniones"],
        ["identifying the author's argument", "Identificación del argumento del autor"],
        ["evidence and support", "Evidencia y respaldo"],
        ["evaluating credibility", "Evaluación de la credibilidad"],
        ["parts of speech", "Categorías gramaticales"],
        ["subject and predicate", "Sujeto y predicado"],
        ["simple, compound, and complex sentences", "Oraciones simples, compuestas y complejas"],
        ["verb tenses", "Tiempos verbales"],
        ["subject-verb agreement", "Concordancia entre sujeto y verbo"],
        ["punctuation basics", "Fundamentos de la puntuación"],
        ["impossible", "imposible"],
        ["same as", "igual que"],
        ["neither positive nor negative", "ni positivo ni negativo"],
        ["always hot", "siempre caliente"],
        ["sometimes", "a veces"],
        ["nothing", "nada"]
        ,
        ["look for repeated ideas", "Busca ideas repetidas"],
        ["check the topic sentence", "Comprueba la oración temática"],
        ["ask what is this mostly about", "Pregúntate de qué trata principalmente"],
        ["look for names, dates, and numbers", "Busca nombres, fechas y números"],
        ["ask how does this detail support the main idea", "Pregúntate cómo este detalle apoya la idea principal"],
        ["underline key details as you read", "Subraya los detalles clave mientras lees"],
        ["look for clues the author gives", "Busca las pistas que da el autor"],
        ["combine text clues with what you already know", "Combina las pistas del texto con lo que ya sabes"],
        ["ask what can I conclude that isn't stated", "Pregúntate qué puedes concluir aunque no esté expresado"],
        ["look for time order words", "Busca palabras que indiquen orden temporal"],
        ["create a timeline while reading", "Crea una línea de tiempo mientras lees"],
        ["ask what happened first, next, and last", "Pregúntate qué ocurrió primero, después y al final"],
        ["ask why did this happen (cause) and what happened as a result (effect)", "Pregúntate por qué ocurrió esto (causa) y qué ocurrió como resultado (efecto)"],
        ["look for signal words like because and so", "Busca palabras de señal como porque y por eso"],
        ["separate the reason from the result", "Separa la razón del resultado"],
        ["ask why did the author write this", "Pregúntate por qué escribió esto el autor"],
        ["look at word choice and tone", "Observa la elección de palabras y el tono"],
        ["think about informing, persuading, or entertaining", "Piensa si el propósito es informar, persuadir o entretener"],
        ["review each skill from this unit", "Repasa cada habilidad de esta unidad"],
        ["practice identifying the skill needed for each question", "Practica identificar la habilidad necesaria para cada pregunta"],
        ["don't rush, read carefully", "No te apresures; lee con atención"],
        ["read each passage or question carefully", "Lee cada pasaje o pregunta con atención"],
        ["eliminate answers that are clearly wrong", "Elimina las respuestas que claramente son incorrectas"],
        ["trust the skills you practiced in this unit", "Confía en las habilidades que practicaste en esta unidad"],
        ["identify who, where, and what happens", "Identifica quién, dónde y qué ocurre"],
        ["look for the problem the characters face", "Busca el problema al que se enfrentan los personajes"],
        ["think about the message behind the story", "Piensa en el mensaje detrás de la historia"],
        ["look for time and place clues", "Busca pistas sobre el tiempo y el lugar"],
        ["notice descriptive words that create mood", "Observa las palabras descriptivas que crean ambiente"],
        ["ask how the setting makes you feel", "Pregúntate cómo te hace sentir el ambiente"],
        ["look at what a character says, does, and thinks", "Observa lo que dice, hace y piensa un personaje"],
        ["notice how other characters react to them", "Observa cómo reaccionan los demás personajes ante ellos"],
        ["ask if traits are stated directly or shown indirectly", "Pregúntate si los rasgos se expresan directamente o se muestran de forma indirecta"],
        ["identify the problem early in the story", "Identifica el problema al principio de la historia"],
        ["find the most intense moment (the climax)", "Encuentra el momento más intenso (el clímax)"],
        ["notice how the conflict is resolved", "Observa cómo se resuelve el conflicto"],
        ["look for pronouns like I, he, she, or they", "Busca pronombres como yo, él, ella o ellos"],
        ["ask who is telling the story", "Pregúntate quién cuenta la historia"],
        ["identify how much the narrator knows", "Identifica cuánto sabe el narrador"],
        ["ask what lesson the characters learned", "Pregúntate qué enseñanza aprendieron los personajes"],
        ["look at how the conflict is resolved", "Observa cómo se resuelve el conflicto"],
        ["think about the story's message about life", "Piensa en el mensaje de la historia sobre la vida"],
        ["review each narrative skill from this unit", "Repasa cada habilidad narrativa de esta unidad"],
        ["think about how these elements work together in a story", "Piensa en cómo funcionan juntos estos elementos en una historia"],
        ["take your time with each question", "Tómate tu tiempo con cada pregunta"],
        ["read each scenario carefully before answering", "Lee cada situación con atención antes de responder"],
        ["think about how each narrative element connects to the others", "Piensa en cómo se conecta cada elemento narrativo con los demás"],
        ["look for facts, data, and evidence", "Busca hechos, datos y evidencias"],
        ["notice headings and text features", "Observa los encabezados y las características del texto"],
        ["ask what the text is teaching you", "Pregúntate qué te está enseñando el texto"],
        ["look for signal words that hint at structure", "Busca palabras de señal que indiquen la estructura"],
        ["ask how the ideas in the text are connected", "Pregúntate cómo se conectan las ideas del texto"],
        ["notice if the text compares, sequences, or explains causes", "Observa si el texto compara, organiza una secuencia o explica causas"],
        ["ask can this statement be proven true or false", "Pregúntate si esta afirmación puede demostrarse verdadera o falsa"],
        ["look for opinion words like best, worst, or should", "Busca palabras de opinión como mejor, peor o debería"],
        ["separate proven facts from personal beliefs", "Separa los hechos comprobados de las creencias personales"],
        ["look for the main claim the author is making", "Busca la afirmación principal que presenta el autor"],
        ["find the reasons given to support the claim", "Encuentra las razones dadas para respaldar la afirmación"],
        ["check if evidence backs up each reason", "Comprueba si la evidencia respalda cada razón"],
        ["check if the evidence is relevant to the claim", "Comprueba si la evidencia es pertinente para la afirmación"],
        ["ask where the evidence comes from", "Pregúntate de dónde proviene la evidencia"],
        ["look for facts, statistics, or expert opinions", "Busca hechos, estadísticas u opiniones de expertos"],
        ["check who wrote the source and their expertise", "Comprueba quién escribió la fuente y cuál es su experiencia"],
        ["look for bias or a hidden purpose", "Busca prejuicios o un propósito oculto"],
        ["check if the information is current and supported by evidence", "Comprueba si la información está actualizada y respaldada por evidencias"],
        ["think about how these skills work together when evaluating a text", "Piensa en cómo funcionan juntas estas habilidades al evaluar un texto"],
        ["think about how structure, evidence, and credibility connect", "Piensa en cómo se relacionan la estructura, la evidencia y la credibilidad"],
        ["ask what job the word is doing in the sentence", "Pregúntate qué función cumple la palabra en la oración"],
        ["look for action words (verbs) and describing words (adjectives/adverbs)", "Busca palabras de acción (verbos) y palabras descriptivas (adjetivos y adverbios)"],
        ["identify nouns as people, places, things, or ideas", "Identifica los sustantivos como personas, lugares, cosas o ideas"],
        ["ask who or what the sentence is about to find the subject", "Pregúntate de quién o de qué trata la oración para encontrar el sujeto"],
        ["ask what the subject does or is to find the predicate", "Pregúntate qué hace o qué es el sujeto para encontrar el predicado"],
        ["find the main noun and main verb first", "Encuentra primero el sustantivo principal y el verbo principal"],
        ["count the number of complete ideas (clauses) in the sentence", "Cuenta el número de ideas completas (cláusulas) de la oración"],
        ["look for conjunctions like and, but, or, because, or although", "Busca conjunciones como y, pero, o, porque o aunque"],
        ["check if a clause can stand alone as a sentence", "Comprueba si una cláusula puede ser una oración independiente"],
        ["ask when the action is happening", "Pregúntate cuándo ocurre la acción"],
        ["look for helping verbs like has, have, had, will, or is", "Busca verbos auxiliares como has, have, had, will o is"],
        ["identify time clue words like yesterday, now, or tomorrow", "Identifica palabras que indican tiempo, como ayer, ahora o mañana"],
        ["find the true subject of the sentence, ignoring interrupting phrases", "Encuentra el sujeto verdadero de la oración e ignora las frases intercaladas"],
        ["check if the subject is singular or plural", "Comprueba si el sujeto es singular o plural"],
        ["match the verb form to the subject", "Haz concordar la forma del verbo con el sujeto"],
        ["check the sentence type to choose the right end punctuation", "Comprueba el tipo de oración para elegir la puntuación final correcta"],
        ["look for lists or joined clauses that may need commas", "Busca listas o cláusulas unidas que puedan necesitar comas"],
        ["use apostrophes correctly for possession or contractions", "Usa correctamente los apóstrofes para posesión o contracciones"],
        ["review each grammar skill from this unit", "Repasa cada habilidad gramatical de esta unidad"],
        ["read each sentence carefully before answering", "Lee cada oración con atención antes de responder"],
        ["read each sentence carefully before choosing an answer", "Lee cada oración con atención antes de elegir una respuesta"],
        ["check for agreement, tense, and punctuation together", "Comprueba al mismo tiempo la concordancia, el tiempo verbal y la puntuación"],
        ["the main idea of a paragraph is...", "La idea principal de un párrafo es..."],
        ["a small detail", "un detalle pequeño"],
        ["the central point", "el punto central"],
        ["the last sentence", "la última oración"],
        ["a character's name", "el nombre de un personaje"],
        ["where is the main idea usually found?", "¿Dónde suele encontrarse la idea principal?"],
        ["in the title only", "solo en el título"],
        ["in the topic sentence", "en la oración temática"],
        ["in the footnotes", "en las notas al pie"],
        ["nowhere", "en ninguna parte"],
        ["supporting details...", "Los detalles de apoyo..."],
        ["replace the main idea", "reemplazan la idea principal"],
        ["explain and support the main idea", "explican y apoyan la idea principal"],
        ["are always false", "siempre son falsos"],
        ["are only found in poems", "solo se encuentran en poemas"],
        ["true or false: every paragraph has one main idea.", "Verdadero o falso: cada párrafo tiene una idea principal."],
        ["a good reader identifies the main idea to...", "Un buen lector identifica la idea principal para..."],
        ["skip the text", "saltar el texto"],
        ["understand what matters most", "comprender lo más importante"],
        ["memorize every word", "memorizar cada palabra"],
        ["ignore details", "ignorar los detalles"]
        ,
        ["the detective story", "La historia policial"],
        ["greek theatre", "El teatro griego"],
        ["theatre was born in ancient greece as part of religious celebrations and rituals.", "El teatro nació en la antigua Grecia como parte de celebraciones y rituales religiosos."],
        ["rites were performed mainly to honor dionysus, giving thanks and asking for good harvests.", "Los rituales se realizaban principalmente para honrar a Dionisio, dar gracias y pedir buenas cosechas."],
        ["greek theatres were constructed outdoors, utilizing hillside slopes to improve acoustics and visibility.", "Los teatros griegos se construían al aire libre, aprovechando las pendientes de las colinas para mejorar la acústica y la visibilidad."],
        ["greece = birthplace of theatre", "Grecia = cuna del teatro"],
        ["dionysus = god of wine & fertility", "Dionisio = dios del vino y la fertilidad"],
        ["tragedy = human conflicts", "Tragedia = conflictos humanos"],
        ["comedy = humor & social critique", "Comedia = humor y crítica social"],
        ["a detective story focuses on investigating and solving a mystery or crime.", "Una historia policial se centra en investigar y resolver un misterio o un crimen."],
        ["key characters include the detective, sidekick, witnesses, informants, and suspects.", "Los personajes principales incluyen al detective, su ayudante, testigos, informantes y sospechosos."],
        ["the story relies on suspense, clues, and a structured narrative (beginning, conflict, and resolution).", "La historia se apoya en el suspenso, las pistas y una narración estructurada (inicio, conflicto y desenlace)."],
        ["focus on clues & evidence", "Enfócate en las pistas y la evidencia"],
        ["edgar allan poe was the pioneer", "Edgar Allan Poe fue el pionero"],
        ["structure: beginning, conflict, outcome", "Estructura: inicio, conflicto y desenlace"],
        ["a detective story centers on investigating and unraveling a mystery.", "Una historia policial se centra en investigar y resolver un misterio."],
        ["what is a detective story?", "¿Qué es una historia policial?"],
        ["a story about historical events.", "Una historia sobre acontecimientos históricos."],
        ["a narrative in which a mystery or crime is investigated and solved.", "Una narración en la que se investiga y resuelve un misterio o un crimen."],
        ["a fantasy tale with magical creatures.", "Un relato fantástico con criaturas mágicas."],
        ["a poem about detectives.", "Un poema sobre detectives."],
        ["what is the main objective of a detective story?", "¿Cuál es el objetivo principal de una historia policial?"],
        ["to teach scientific facts.", "Enseñar hechos científicos."],
        ["to make the reader laugh.", "Hacer reír al lector."],
        ["to solve a mystery or crime through investigation.", "Resolver un misterio o un crimen mediante la investigación."],
        ["to tell a legend.", "Contar una leyenda."],
        ["who was the first author of the detective genre?", "¿Quién fue el primer autor del género policial?"],
        ["which characters appear in a detective story?", "¿Qué personajes aparecen en una historia policial?"],
        ["kings and princesses.", "Reyes y princesas."],
        ["detective, assistant, witnesses, informants, and suspects.", "Detective, ayudante, testigos, informantes y sospechosos."],
        ["superheroes and villains.", "Superhéroes y villanos."],
        ["talking animals.", "Animales que hablan."],
        ["what keeps the reader's interest?", "¿Qué mantiene el interés del lector?"],
        ["suspense and the discovery of clues.", "El suspenso y el descubrimiento de pistas."],
        ["the product of a monomial by a binomial", "El producto de un monomio por un binomio"],
        ["monomial by binomial multiplication", "Multiplicación de monomio por binomio"],
        ["multiply each term of the binomial by the monomial applying sign laws and exponents.", "Multiplica cada término del binomio por el monomio aplicando las reglas de signos y los exponentes."],
        ["in the product of a monomial by a binomial, the monomial is multiplied by each term of the binomial.", "En el producto de un monomio por un binomio, el monomio se multiplica por cada término del binomio."],
        ["always take into account the sign rules: (+)(+) = +, (+)(-) = -, (-)(+) = -, (-)(-) = +.", "Ten siempre en cuenta las reglas de signos: (+)(+) = +, (+)(-) = -, (-)(+) = -, (-)(-) = +."],
        ["the process of multiplying a term by each term inside parentheses is called expansion (desarrollo).", "El proceso de multiplicar un término por cada término dentro de los paréntesis se llama desarrollo."],
        ["the expansion results in 4 terms before simplifying: ac + ad + bc + bd.", "El desarrollo produce 4 términos antes de simplificar: ac + ad + bc + bd."],
        ["always combine any like terms after expanding to write the expression in its simplest form.", "Combina siempre los términos semejantes después de desarrollar para escribir la expresión en su forma más simple."]
        ,
        ["understanding these elements helps readers analyze how a story works.", "Comprender estos elementos ayuda a los lectores a analizar cómo funciona una historia."],
        ["authors use descriptive details to build atmosphere, such as dark, stormy, or peaceful.", "Los autores usan detalles descriptivos para crear atmósfera, como oscura, tormentosa o tranquila."],
        ["direct characterization states traits directly; indirect characterization shows traits through actions, speech, and thoughts.", "La caracterización directa expresa los rasgos directamente; la caracterización indirecta muestra los rasgos mediante acciones, palabras y pensamientos."],
        ["rising action builds tension leading up to the climax.", "La acción ascendente aumenta la tensión hasta llegar al clímax."],
        ["third person omniscient knows all characters' thoughts; third person limited knows only one character's thoughts.", "La tercera persona omnisciente conoce los pensamientos de todos los personajes; la tercera persona limitada conoce solo los pensamientos de un personaje."],
        ["themes are usually not stated directly; readers must infer them from the story's events.", "Los temas normalmente no se expresan directamente; los lectores deben inferirlos a partir de los acontecimientos de la historia."],
        ["a story can have more than one theme.", "Una historia puede tener más de un tema."],
        ["recognizing text structure helps readers understand how ideas connect.", "Reconocer la estructura del texto ayuda a los lectores a comprender cómo se conectan las ideas."],
        ["signal words help identify which structure an author is using.", "Las palabras de señal ayudan a identificar qué estructura está usando el autor."],
        ["strong readers distinguish facts from opinions to evaluate a text's reliability.", "Los buenos lectores distinguen los hechos de las opiniones para evaluar la confiabilidad de un texto."],
        ["the claim is the main position; reasons explain why the claim is true.", "La afirmación es la postura principal; las razones explican por qué es verdadera."],
        ["strong arguments are supported by credible evidence, not just opinions.", "Los argumentos sólidos se respaldan con evidencias confiables, no solo con opiniones."],
        ["strong evidence is accurate, relevant, and comes from credible sources.", "La evidencia sólida es precisa, pertinente y proviene de fuentes confiables."],
        ["weak evidence may be irrelevant, outdated, or from an unreliable source.", "La evidencia débil puede ser irrelevante, estar desactualizada o provenir de una fuente poco confiable."],
        ["credibility refers to how trustworthy and reliable a source of information is.", "La credibilidad se refiere a qué tan confiable y segura es una fuente de información."],
        ["credible sources are often written by experts, checked for accuracy, and free from strong bias.", "Las fuentes confiables suelen estar escritas por expertos, revisadas para comprobar su precisión y libres de fuertes prejuicios."],
        ["readers should check the author, date, purpose, and evidence of a source before trusting it.", "Los lectores deben comprobar el autor, la fecha, el propósito y la evidencia de una fuente antes de confiar en ella."],
        ["every complete sentence has a subject and a predicate.", "Toda oración completa tiene sujeto y predicado."],
        ["the subject tells who or what the sentence is about; the predicate tells what the subject does or is.", "El sujeto indica de quién o de qué trata la oración; el predicado indica qué hace o qué es el sujeto."],
        ["a simple sentence has one independent clause.", "Una oración simple tiene una cláusula independiente."],
        ["a compound sentence joins two independent clauses with a conjunction like and, but, or or.", "Una oración compuesta une dos cláusulas independientes con una conjunción como y, pero u o."],
        ["a complex sentence joins an independent clause with a dependent clause using words like because, although, or when.", "Una oración compleja une una cláusula independiente con una dependiente mediante palabras como porque, aunque o cuando."],
        ["present tense describes actions happening now or regularly; past tense describes completed actions; future tense describes actions that will happen.", "El tiempo presente describe acciones que ocurren ahora o regularmente; el pasado describe acciones terminadas; el futuro describe acciones que ocurrirán."],
        ["some subjects can be tricky, like collective nouns or subjects joined with and/or.", "Algunos sujetos pueden ser difíciles, como los sustantivos colectivos o los sujetos unidos con y/o."],
        ["interrupting phrases between the subject and verb do not change agreement.", "Las frases intercaladas entre el sujeto y el verbo no cambian la concordancia."],
        ["commas separate items in a list, join clauses with conjunctions, and set off introductory elements.", "Las comas separan elementos de una lista, unen cláusulas con conjunciones y separan elementos introductorios."],
        ["a × a = a²", "a × a = a²"],
        ["multiply signs first", "Multiplica primero los signos"],
        ["multiply coefficients", "Multiplica los coeficientes"],
        ["add exponents of same variables", "Suma los exponentes de las mismas variables"],
        ["identify both unknowns", "Identifica ambas incógnitas"],
        ["substitute values to verify", "Sustituye los valores para comprobar"],
        ["aim to eliminate one variable", "Procura eliminar una variable"],
        ["always check the solution in both equations", "Comprueba siempre la solución en ambas ecuaciones"],
        ["form: y = ax + b", "Forma: y = ax + b"],
        ["x = independent variable", "x = variable independiente"],
        ["y = dependent variable", "y = variable dependiente"],
        ["b = value of y when x = 0", "b = valor de y cuando x = 0"],
        ["triangles = n - 2", "Triángulos = n - 2"],
        ["regular angle = s / n", "Ángulo regular = S / n"],
        ["n = number of sides", "n = número de lados"],
        ["foil method (first, outer, inner, last)", "Método FOIL (primero, exterior, interior y último)"],
        ["combine like terms", "Combina términos semejantes"],
        ["pay attention to negative signs", "Presta atención a los signos negativos"],
        ["define the variable x clearly", "Define claramente la variable x"],
        ["distance = speed × time", "Distancia = velocidad × tiempo"],
        ["multiply fractions by the lcm", "Multiplica las fracciones por el MCM"],
        ["verify your answer in context", "Comprueba tu respuesta en el contexto"],
        ["rate = δy / δx", "Tasa = Δy / Δx"],
        ["constant in linear functions", "Constante en funciones lineales"],
        ["equal to coefficient 'a'", "Igual al coeficiente a"],
        ["measures steepness", "Mide la inclinación"],
        ["sum of exterior = 360°", "Suma de exteriores = 360°"],
        ["interior + exterior = 180°", "Interior + exterior = 180°"],
        ["regular exterior = 360° / n", "Exterior regular = 360° / n"],
        ["sides n = 360° / ext. angle", "Lados n = 360° / ángulo exterior"],
        ["don't forget to double the middle product!", "¡No olvides duplicar el producto del medio!"],
        ["the last term (+b²) is always positive", "El último término (+b²) siempre es positivo"],
        ["opposite signs cancel on addition", "Los signos opuestos se cancelan al sumar"],
        ["same signs require subtraction", "Los signos iguales requieren una resta"],
        ["isolate the variable with coefficient 1", "Aísla la variable con coeficiente 1"],
        ["substitute back to find the 2nd value", "Sustituye nuevamente para encontrar el segundo valor"],
        ["a = slope (inclination)", "a = pendiente (inclinación)"],
        ["b = y-intercept point (0, b)", "b = punto de intersección con el eje y (0, b)"],
        ["a > 0 ➔ increasing line ↗", "a > 0 ➔ recta creciente ↗"],
        ["a < 0 ➔ decreasing line ↘", "a < 0 ➔ recta decreciente ↘"],
        ["corresponding = equal", "Correspondientes = iguales"],
        ["alternate interior = equal", "Alternos internos = iguales"],
        ["alternate exterior = equal", "Alternos externos = iguales"],
        ["consecutive interior = 180°", "Consecutivos internos = 180°"],
        ["middle coefficient = sum (a + b)", "Coeficiente central = suma (a + b)"],
        ["last term = product (a × b)", "Último término = producto (a × b)"],
        ["pay close attention to signs (positive vs negative)", "Presta mucha atención a los signos (positivo frente a negativo)"],
        ["assign x and y to unknown values", "Asigna x e y a los valores desconocidos"],
        ["form two independent equations", "Forma dos ecuaciones independientes"],
        ["check units (dollars, meters, years)", "Comprueba las unidades (dólares, metros, años)"],
        ["verify solutions in original problem", "Comprueba las soluciones en el problema original"],
        ["start at point (0, b)", "Comienza en el punto (0, b)"],
        ["slope = rise / run", "Pendiente = elevación / recorrido"],
        ["only 2 points are needed", "Solo se necesitan 2 puntos"],
        ["draw a continuous line", "Dibuja una recta continua"],
        ["statement + reason", "Afirmación + razón"],
        ["use auxiliary lines", "Usa líneas auxiliares"],
        ["triangle sum = 180°", "Suma de los ángulos del triángulo = 180°"],
        ["transitive property: a=b, b=c ⇒ a=c", "Propiedad transitiva: A=B, B=C ⇒ A=C"],
        ["middle terms always sum to 0", "Los términos centrales siempre suman 0"],
        ["the sign between the terms is always a minus", "El signo entre los términos siempre es un menos"],
        ["multiply decimals by 10 or 100", "Multiplica los decimales por 10 o 100"],
        ["keep equations balanced", "Mantén equilibradas las ecuaciones"],
        ["verify your final values", "Comprueba tus valores finales"],
        ["check with given points", "Comprueba con los puntos dados"],
        ["draw line parallel to base", "Dibuja una línea paralela a la base"],
        ["straight angle = 180°", "Ángulo llano = 180°"],
        ["alternate interior angles match", "Los ángulos alternos internos coinciden"],
        ["result: a + b + c = 180°", "Resultado: A + B + C = 180°"],
        ["expand each special product first", "Desarrolla primero cada producto notable"],
        ["watch out for negative signs before parentheses", "Ten cuidado con los signos negativos antes de los paréntesis"],
        ["combine like terms at the final step", "Combina los términos semejantes en el paso final"],
        ["express equations as y = mx + b", "Expresa las ecuaciones como y = mx + b"],
        ["plot at least 2 points per line", "Representa al menos 2 puntos por recta"],
        ["intersection point (x,y) is the solution", "El punto de intersección (x,y) es la solución"],
        ["parallel lines = no solution", "Rectas paralelas = sin solución"],
        ["b = base / initial value", "b = base / valor inicial"],
        ["a = rate per unit", "a = tasa por unidad"],
        ["x = quantity / time", "x = cantidad / tiempo"],
        ["y = total result", "y = resultado total"],
        ["exterior = sum of remote interior angles", "Exterior = suma de los ángulos interiores no adyacentes"],
        ["sum of exterior angles = 360°", "Suma de los ángulos exteriores = 360°"],
        ["exterior angle > either remote interior", "El ángulo exterior > cualquiera de los interiores no adyacentes"],
        ["grouping works best with 4 terms", "La agrupación funciona mejor con 4 términos"],
        ["always double-check by expanding your answer", "Comprueba siempre desarrollando tu respuesta"],
        ["0 = non-zero number ➔ no solution", "0 = número distinto de cero ➔ sin solución"],
        ["0 = 0 ➔ infinitely many solutions", "0 = 0 ➔ infinitas soluciones"],
        ["coincident lines = infinite solutions", "Rectas coincidentes = infinitas soluciones"],
        ["a > 0: increasing", "a > 0: creciente"],
        ["a < 0: decreasing", "a < 0: decreciente"],
        ["y-intercept: (0, b)", "Intersección con el eje y: (0, b)"],
        ["x-intercept: set y = 0", "Intersección con el eje x: establece y = 0"],
        ["product = c (constant term)", "Producto = c (término constante)"],
        ["sum = b (coefficient of x)", "Suma = b (coeficiente de x)"],
        ["check sign rules for positive/negative c", "Comprueba las reglas de signos para c positivo o negativo"],
        ["1 solution: intersecting lines", "1 solución: rectas que se intersectan"],
        ["0 solutions: parallel lines", "0 soluciones: rectas paralelas"],
        ["∞ solutions: identical lines", "∞ soluciones: rectas idénticas"],
        ["intersection = (x, y) solution", "Intersección = solución (x, y)"],
        ["always 360° sum", "La suma siempre es 360°"],
        ["independent of number of sides", "Independiente del número de lados"]
    ]);

    const wordTranslations = Object.freeze({
        a: "un",
        about: "sobre",
        absolute: "absoluto",
        academic: "académico",
        accessibility: "accesibilidad",
        accessible: "accesible",
        accurate: "preciso",
        action: "acción",
        actions: "acciones",
        active: "activo",
        activity: "actividad",
        activities: "actividades",
        add: "agregar",
        addition: "suma",
        adjective: "adjetivo",
        after: "después",
        again: "de nuevo",
        algebra: "álgebra",
        algebraic: "algebraico",
        all: "todos",
        almost: "casi",
        always: "siempre",
        analyze: "analizar",
        an: "un",
        account: "cuenta",
        analysis: "análisis",
        and: "y",
        angle: "ángulo",
        angles: "ángulos",
        answer: "respuesta",
        answers: "respuestas",
        any: "cualquier",
        applications: "aplicaciones",
        apply: "aplicar",
        applying: "aplicando",
        area: "área",
        areas: "áreas",
        are: "son",
        argumentation: "argumentación",
        argumentative: "argumentativo",
        arithmetic: "aritmético",
        around: "alrededor",
        arts: "lenguaje",
        as: "como",
        associative: "asociativa",
        at: "en",
        atmosphere: "ambiente",
        author: "autor",
        award: "otorgar",
        awarded: "otorgados",
        available: "disponible",
        back: "volver",
        base: "base",
        because: "porque",
        below: "abajo",
        better: "mejores",
        between: "entre",
        binomial: "binomio",
        binomials: "binomios",
        bonus: "bonificación",
        book: "libro",
        bound: "límite",
        brief: "breve",
        build: "crear",
        builder: "creador",
        building: "desarrollando",
        by: "por",
        calculate: "calcular",
        call: "llamar",
        called: "llamado",
        can: "puede",
        caption: "pie",
        central: "central",
        challenge: "desafío",
        character: "personaje",
        characterization: "caracterización",
        characters: "personajes",
        characteristics: "características",
        chart: "gráfico",
        check: "comprobar",
        choose: "elige",
        circle: "círculo",
        class: "clase",
        classes: "clases",
        classroom: "aula",
        clause: "cláusula",
        clauses: "cláusulas",
        clear: "claro",
        clearly: "claramente",
        clues: "pistas",
        code: "código",
        coherence: "coherencia",
        coefficients: "coeficientes",
        color: "color",
        column: "columna",
        combine: "combinar",
        combined: "combinados",
        coming: "próximamente",
        common: "común",
        communication: "comunicación",
        compare: "comparar",
        complete: "completar",
        complex: "complejo",
        compound: "compuesto",
        comprehension: "comprensión",
        comprehensive: "completo",
        concept: "concepto",
        concepts: "conceptos",
        conclusion: "conclusión",
        conflict: "conflicto",
        congruence: "congruencia",
        connected: "conectadas",
        contact: "contactar",
        contains: "contiene",
        contemporary: "contemporánea",
        continue: "continuar",
        core: "principal",
        correct: "correcto",
        count: "cantidad",
        courses: "cursos",
        create: "crear",
        created: "creado",
        creation: "creación",
        credibility: "credibilidad",
        current: "actual",
        cycle: "ciclo",
        dashboard: "panel",
        data: "datos",
        date: "fecha",
        decimal: "decimal",
        decimals: "decimales",
        degree: "grado",
        deeper: "más profundo",
        delete: "eliminar",
        description: "descripción",
        designed: "diseñado",
        detail: "detalle",
        details: "detalles",
        detective: "policial",
        different: "diferente",
        difference: "diferencia",
        discriminant: "discriminante",
        direct: "directa",
        discover: "descubrir",
        display: "mostrar",
        distance: "distancia",
        device: "dispositivo",
        dispersion: "dispersión",
        divide: "dividir",
        division: "división",
        dialogue: "diálogo",
        does: "hace",
        dynamic: "dinámico",
        each: "cada",
        easily: "fácilmente",
        education: "educación",
        educational: "educativo",
        eight: "ocho",
        enter: "entrar",
        equal: "igual",
        equation: "ecuación",
        equations: "ecuaciones",
        equivalent: "equivalente",
        effect: "efecto",
        elements: "elementos",
        email: "correo",
        engaging: "atractivo",
        event: "evento",
        events: "eventos",
        every: "cada",
        evidence: "evidencia",
        example: "ejemplo",
        examples: "ejemplos",
        exam: "examen",
        excellent: "excelente",
        expansion: "expansión",
        exponents: "exponentes",
        experiences: "experiencias",
        express: "expresar",
        expressing: "expresando",
        explains: "explica",
        exterior: "exterior",
        explore: "explorar",
        expression: "expresión",
        expressions: "expresiones",
        fact: "hecho",
        facts: "hechos",
        factor: "factor",
        factoring: "factorización",
        factors: "factores",
        famous: "famoso",
        feedback: "retroalimentación",
        figures: "figuras",
        final: "final",
        find: "encontrar",
        finding: "hallar",
        first: "primero",
        focus: "enfoque",
        follow: "seguir",
        for: "para",
        form: "forma",
        formed: "formado",
        formula: "fórmula",
        fraction: "fracción",
        fractions: "fracciones",
        from: "de",
        fully: "completamente",
        function: "función",
        functions: "funciones",
        general: "general",
        geometric: "geométrico",
        geometry: "geometría",
        give: "dar",
        gothic: "gótica",
        grade: "grado",
        grades: "grados",
        grammar: "gramática",
        graph: "gráfica",
        graphs: "gráficas",
        great: "excelente",
        greater: "mayor",
        greek: "griego",
        guide: "guía",
        guided: "guiada",
        has: "tiene",
        have: "tienen",
        heading: "encabezado",
        help: "ayuda",
        helps: "ayuda",
        history: "historia",
        how: "cómo",
        idea: "idea",
        ideas: "ideas",
        identify: "identificar",
        identifying: "identificando",
        identity: "identidad",
        image: "imagen",
        improve: "mejorar",
        in: "en",
        including: "incluyendo",
        indirect: "indirecto",
        infinitely: "infinitamente",
        info: "información",
        include: "incluir",
        includes: "incluye",
        inclusive: "inclusivo",
        index: "índice",
        inference: "inferencia",
        informational: "informativo",
        inscribed: "inscrito",
        inside: "dentro",
        interior: "interior",
        integer: "entero",
        integers: "enteros",
        interactive: "interactivas",
        into: "en",
        is: "es",
        its: "su",
        join: "unirse",
        journey: "recorrido",
        key: "clave",
        keyboard: "teclado",
        knowledge: "conocimiento",
        language: "lenguaje",
        laws: "leyes",
        learn: "aprender",
        learner: "estudiante",
        learners: "estudiantes",
        learning: "aprendizaje",
        legend: "leyenda",
        less: "menor",
        lesson: "lección",
        lessons: "lecciones",
        light: "luz",
        line: "recta",
        linear: "lineal",
        lines: "rectas",
        links: "enlaces",
        like: "como",
        list: "lista",
        literature: "literatura",
        literary: "literario",
        limits: "límites",
        locate: "ubicar",
        logical: "lógico",
        lyric: "lírica",
        main: "principal",
        make: "hacer",
        making: "haciendo",
        manage: "administrar",
        many: "muchos",
        master: "dominar",
        mathematics: "matemáticas",
        mean: "media",
        measure: "medida",
        measures: "medidas",
        median: "mediana",
        meaning: "significado",
        meet: "conocer",
        member: "integrante",
        message: "mensaje",
        method: "método",
        methods: "métodos",
        minor: "menor",
        mission: "misión",
        mode: "modo",
        monomial: "monomio",
        move: "avanzar",
        my: "mi",
        navigation: "navegación",
        multiplication: "multiplicación",
        multiplied: "multiplicado",
        multiply: "multiplicar",
        multiplying: "multiplicar",
        myth: "mito",
        name: "nombre",
        narrative: "narrativo",
        need: "necesitar",
        negative: "negativo",
        new: "nuevo",
        next: "siguiente",
        not: "no",
        noir: "negra",
        novel: "novela",
        now: "ahora",
        number: "número",
        numbers: "números",
        of: "de",
        on: "en",
        one: "uno",
        open: "abrir",
        operation: "operación",
        operations: "operaciones",
        opinion: "opinión",
        opinions: "opiniones",
        opportunities: "oportunidades",
        or: "o",
        oral: "oral",
        order: "orden",
        organization: "organización",
        organize: "organizar",
        origins: "orígenes",
        our: "nuestro",
        overview: "resumen",
        page: "página",
        paragraph: "párrafo",
        parentheses: "paréntesis",
        parallel: "paralelo",
        parallelism: "paralelismo",
        part: "parte",
        parts: "partes",
        path: "ruta",
        paths: "rutas",
        pattern: "patrón",
        patterns: "patrones",
        people: "personas",
        person: "persona",
        place: "lugar",
        plan: "plan",
        planner: "planificador",
        platform: "plataforma",
        plot: "trama",
        poem: "poema",
        poetry: "poesía",
        policy: "política",
        point: "punto",
        points: "puntos",
        polygon: "polígono",
        polynomial: "polinomio",
        polynomials: "polinomios",
        positive: "positivo",
        power: "potencia",
        powers: "potencias",
        practice: "práctica",
        predicate: "predicado",
        priority: "prioridad",
        privacy: "privacidad",
        probability: "probabilidad",
        pro: "profesional",
        problem: "problema",
        problems: "problemas",
        products: "productos",
        product: "producto",
        professor: "docente",
        profile: "perfil",
        proportionality: "proporcionalidad",
        private: "privado",
        process: "proceso",
        progress: "progreso",
        properties: "propiedades",
        provide: "brindar",
        punctuation: "puntuación",
        put: "colocar",
        purpose: "propósito",
        pythagorean: "pitagórico",
        quadratic: "cuadrática",
        question: "pregunta",
        questions: "preguntas",
        quick: "rápido",
        quiz: "quiz",
        quizzes: "quizzes",
        random: "aleatorio",
        range: "rango",
        ranking: "clasificación",
        rate: "tasa",
        read: "leer",
        reader: "lector",
        reading: "lectura",
        ready: "listos",
        reason: "razón",
        real: "real",
        reference: "referencia",
        recognize: "reconocer",
        relationships: "relaciones",
        reliable: "confiable",
        remember: "recuerda",
        remove: "eliminar",
        repeat: "repetir",
        reserved: "reservados",
        reread: "releer",
        reset: "restablecer",
        review: "repaso",
        revise: "revisar",
        rights: "derechos",
        role: "rol",
        romantic: "romántico",
        root: "raíz",
        roots: "raíces",
        rules: "reglas",
        same: "mismo",
        save: "guardar",
        saved: "guardado",
        score: "puntuación",
        search: "buscar",
        section: "sección",
        select: "selecciona",
        selected: "seleccionado",
        semicolon: "punto y coma",
        sentence: "oración",
        sentences: "oraciones",
        sequence: "secuencia",
        setting: "ambiente",
        show: "mostrar",
        sign: "signo",
        signs: "signos",
        screen: "pantalla",
        science: "ciencia",
        see: "ver",
        send: "enviar",
        shared: "compartido",
        should: "debería",
        similar: "semejantes",
        simplify: "simplificar",
        simple: "simple",
        single: "cada",
        skill: "habilidad",
        skills: "habilidades",
        slope: "pendiente",
        solid: "sólido",
        solids: "sólidos",
        solve: "resolver",
        solving: "resolución",
        solution: "solución",
        solutions: "soluciones",
        soon: "pronto",
        source: "fuente",
        space: "espacio",
        special: "especial",
        square: "cuadrado",
        squares: "cuadrados",
        start: "comenzar",
        statements: "enunciados",
        statistical: "estadístico",
        statistics: "estadística",
        step: "paso",
        steps: "pasos",
        story: "historia",
        strategies: "estrategias",
        strategy: "estrategia",
        structure: "estructura",
        student: "estudiante",
        students: "estudiantes",
        subject: "materia",
        subjects: "materias",
        substitution: "sustitución",
        subtract: "restar",
        subtraction: "resta",
        sum: "suma",
        summaries: "resúmenes",
        summary: "resumen",
        support: "apoyo",
        supporting: "de apoyo",
        supports: "apoya",
        systems: "sistemas",
        take: "tomar",
        teach: "enseñar",
        teacher: "docente",
        teachers: "docentes",
        team: "equipo",
        techniques: "técnicas",
        technology: "tecnología",
        temperature: "temperatura",
        term: "término",
        terms: "términos",
        test: "prueba",
        text: "texto",
        texts: "textos",
        than: "que",
        that: "que",
        the: "el",
        their: "su",
        theme: "tema",
        themes: "temas",
        theory: "teoría",
        teaching: "docencia",
        theatre: "teatro",
        these: "estos",
        they: "ellos",
        thinking: "pensamiento",
        third: "tercero",
        this: "este",
        those: "esos",
        through: "mediante",
        time: "tiempo",
        tips: "consejos",
        title: "título",
        to: "a",
        together: "juntos",
        topic: "tema",
        total: "total",
        tragedy: "tragedia",
        triangle: "triángulo",
        triangles: "triángulos",
        trinomials: "trinomios",
        try: "intentar",
        two: "dos",
        unit: "unidad",
        units: "unidades",
        use: "usar",
        using: "usando",
        useful: "útil",
        understand: "comprender",
        unique: "único",
        value: "valor",
        values: "valores",
        variable: "variable",
        variables: "variables",
        verb: "verbo",
        verified: "verificado",
        verbal: "verbal",
        view: "ver",
        vision: "visión",
        visual: "visual",
        vocabulary: "vocabulario",
        volume: "volumen",
        was: "fue",
        we: "nosotros",
        welcome: "bienvenido",
        will: "vas a",
        want: "quieres",
        way: "forma",
        what: "qué",
        when: "cuándo",
        where: "dónde",
        which: "cuál",
        who: "quién",
        why: "por qué",
        with: "con",
        without: "sin",
        word: "palabra",
        work: "trabajo",
        workspace: "espacio",
        world: "mundo",
        writing: "escritura",
        you: "tú",
        your: "tu",
        zero: "cero",
        explanation: "explicación",
        explanations: "explicaciones",
        options: "opciones",
        tip: "consejo",
        hint: "pista",
        it: "eso",
        if: "si",
        sides: "lados",
        be: "ser",
        only: "solo",
        gives: "da",
        change: "cambio",
        changes: "cambia",
        so: "así que",
        both: "ambos",
        expand: "desarrolla",
        expanded: "desarrollado",
        exercise: "ejercicio",
        written: "escrito",
        opposite: "opuesto",
        property: "propiedad",
        vertex: "vértice",
        vertices: "vértices",
        represents: "representa",
        means: "significa",
        right: "derecha",
        system: "sistema",
        since: "ya que",
        his: "su",
        left: "izquierda",
        before: "antes",
        rule: "regla",
        parabola: "parábola",
        subtracting: "restar",
        opens: "abre",
        adding: "sumar",
        coefficient: "coeficiente",
        object: "objeto",
        do: "hacer",
        times: "veces",
        increases: "aumenta",
        keep: "conserva",
        commutative: "conmutativa",
        middle: "medio",
        then: "luego",
        regular: "regular",
        out: "fuera",
        downward: "hacia abajo",
        changing: "cambiante",
        length: "longitud",
        repeated: "repetido",
        there: "allí",
        crime: "crimen",
        tragic: "trágico",
        audience: "público",
        end: "final",
        must: "debe",
        mystery: "misterio",
        never: "nunca",
        freedom: "libertad",
        more: "más",
        smaller: "menor",
        get: "obtener",
        width: "ancho",
        alternate: "alterno",
        hero: "héroe",
        equals: "es igual a",
        works: "funciona",
        substitute: "sustituir",
        symbol: "símbolo",
        across: "a través de",
        beginning: "inicio",
        straight: "recta",
        exactly: "exactamente",
        uses: "usa",
        becomes: "se convierte",
        identical: "idéntico",
        following: "siguiente",
        standard: "estándar",
        physical: "físico",
        radical: "radical",
        social: "social",
        truth: "verdad",
        shows: "muestra",
        represent: "representar",
        intersect: "intersectar",
        true: "verdadero",
        such: "tal",
        directly: "directamente",
        vertical: "vertical",
        symmetry: "simetría",
        investigation: "investigación",
        complement: "complemento",
        dramatic: "dramático",
        statement: "afirmación",
        decreases: "disminuye",
        larger: "mayor",
        consecutive: "consecutivo",
        other: "otro",
        wider: "más ancha",
        resolution: "desenlace",
        being: "ser",
        stage: "escena",
        makes: "hace",
        follows: "sigue",
        replace: "reemplazar",
        perimeter: "perímetro",
        three: "tres",
        extract: "extraer",
        maximum: "máximo",
        even: "par",
        pair: "par",
        last: "último",
        personal: "personal",
        describe: "describir",
        plus: "más",
        additive: "aditivo",
        leaves: "deja",
        exponent: "exponente",
        exponents: "exponentes",
        intersection: "intersección",
        exact: "exacto",
        slopes: "pendientes",
        share: "comparten",
        tells: "indica",
        moving: "moverse",
        moves: "se mueve",
        second: "segundo",
        keeps: "mantiene",
        itself: "sí misma",
        write: "escribir",
        bar: "barra",
        upward: "hacia arriba",
        stories: "historias",
        toward: "hacia",
        carefully: "con cuidado",
        starting: "inicial",
        down: "abajo",
        while: "mientras",
        stays: "permanece",
        yes: "sí",
        combines: "combina",
        contain: "contener",
        independent: "independiente",
        cost: "costo",
        expanding: "desarrollando",
        occurs: "ocurre",
        horizontal: "horizontal",
        transversal: "transversal",
        remote: "remoto",
        arguments: "argumentos",
        narrower: "más estrecha",
        exclusively: "exclusivamente",
        historical: "histórico",
        serve: "sirven",
        situation: "situación",
        become: "convertirse",
        answers: "respuestas",
        correct: "correcto",
        almost: "casi",
        no: "no",
        used: "usado",
        side: "lado",
        up: "arriba",
        us: "nos",
        result: "resultado",
        constant: "constante",
        origin: "origen",
        play: "jugar",
        completely: "completamente",
        evaluate: "evaluar",
        usually: "normalmente",
        "y-axis": "eje y",
        direction: "dirección",
        unchanged: "sin cambios",
        given: "dado",
        above: "encima",
        "x-axis": "eje x",
        position: "posición",
        relationship: "relación",
        formal: "formal",
        past: "pasado",
        moral: "moral",
        entire: "entero",
        speed: "velocidad",
        political: "político",
        performing: "realizando",
        hours: "horas",
        exclamation: "exclamación",
        least: "menor",
        cannot: "no puede",
        signed: "con signo",
        addends: "sumandos",
        grouping: "agrupación",
        additions: "sumas",
        odd: "impar",
        divided: "dividido",
        future: "futuro",
        often: "a menudo",
        known: "conocido",
        substituting: "sustituyendo",
        adjacent: "adyacente",
        elimination: "eliminación",
        eliminate: "eliminar",
        type: "tipo",
        years: "años",
        perfect: "perfecto",
        trinomial: "trinomio",
        over: "sobre",
        gcf: "MCD",
        period: "punto",
        structured: "estructurada",
        old: "antiguo",
        connect: "conectar",
        movement: "movimiento",
        subtractions: "restas",
        generalizing: "generalizar",
        perpendicular: "perpendicular",
        coincident: "coincidente",
        models: "modelos",
        leaving: "dejando",
        auxiliary: "auxiliar",
        present: "presente",
        long: "largo",
        urban: "urbano",
        logic: "lógica",
        fiction: "ficción",
        introduction: "introducción",
        presentation: "presentación",
        marks: "signos",
        letters: "letras",
        sounds: "sonidos",
        independence: "independencia",
        popular: "popular",
        false: "falso",
        isolate: "aislar",
        drawing: "dibujo",
        context: "contexto",
        turns: "giros",
        convex: "convexo",
        life: "vida",
        axis: "eje",
        draw: "dibujar",
        theorem: "teorema",
        height: "altura",
        takes: "toma",
        large: "grande",
        reflection: "reflexión",
        enigma: "enigma",
        culprit: "culpable",
        secondary: "secundario",
        begins: "comienza",
        article: "artículo",
        images: "imágenes",
        within: "dentro de",
        recipient: "destinatario",
        protagonist: "protagonista",
        emotional: "emocional",
        theatrical: "teatral",
        scene: "escena",
        technique: "técnica",
        goal: "objetivo",
        closer: "más cerca",
        negatives: "negativos",
        goes: "va",
        ends: "termina",
        denominator: "denominador",
        denominators: "denominadores",
        unknown: "desconocido",
        verify: "verificar",
        phrase: "frase",
        plane: "plano",
        forms: "formas",
        multiple: "múltiple",
        liters: "litros",
        let: "sea",
        supplementary: "suplementario"
    });

    const originalTextValues = new WeakMap();
    const translatedTextValues = new WeakMap();
    const originalAttributeValues = new WeakMap();
    const translatedAttributeValues = new WeakMap();
    let originalDocumentTitle = document.title;
    let translatedDocumentTitle = "";
    let pageHasBeenTranslated = false;
    let languageObserver = null;
    let languageUpdateInProgress = false;
    function escapeRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    const protectedPhrasePatterns = Array.from(phraseTranslations.keys())
        .filter(function (phrase) { return phrase.includes(" "); })
        .sort(function (first, second) { return second.length - first.length; })
        .map(function (phrase) {
            return {
                phrase: phrase,
                pattern: new RegExp(
                    "(^|[^A-Za-z0-9])(" + escapeRegExp(phrase).replace(/\s+/g, "\\s+") + ")(?=$|[^A-Za-z0-9])",
                    "gi"
                )
            };
        });

    const wordPattern = new RegExp(
        "\\b(" + Object.keys(wordTranslations)
            .sort(function (first, second) { return second.length - first.length; })
            .map(escapeRegExp)
            .join("|") + ")\\b",
        "gi"
    );

    function matchCapitalization(source, translated) {
        if (source === source.toUpperCase() && /[A-Z]/.test(source)) {
            return translated.toUpperCase();
        }
        if (source.charAt(0) === source.charAt(0).toUpperCase()) {
            return translated.charAt(0).toUpperCase() + translated.slice(1);
        }
        return translated;
    }

    function translateToSpanish(value) {
        if (!value || !/[A-Za-z]/.test(value)) return value;

        const leadingSpace = value.match(/^\s*/)[0];
        const trailingSpace = value.match(/\s*$/)[0];
        const trimmed = value.trim();

        // Keep standalone algebraic formulas intact; translating variable names
        // such as "a" or "x" as ordinary words makes the mathematics wrong.
        if (/^[a-z](?:\s*[+\-*/×÷=^]\s*[a-z0-9²³⁰¹⁻]+)+$/i.test(trimmed)) {
            return value;
        }

        const dynamicTranslation = (function () {
            let match = trimmed.match(/^Back to Unit\s+(\d+)\s+Path$/i);
            if (match) return `Volver a la ruta de la Unidad ${match[1]}`;

            match = trimmed.match(/^Lesson\s+(\d+):$/i);
            if (match) return `Lección ${match[1]}:`;

            match = trimmed.match(/^Question\s+(\d+)\s+of\s+(\d+)$/i);
            if (match) return `Pregunta ${match[1]} de ${match[2]}`;

            match = trimmed.match(/^A temperature of\s+(.+)\s+is\.\.\.$/i);
            if (match) return `Una temperatura de ${match[1]} es...`;

            match = trimmed.match(/^([+-]?\d+)\s+degrees\s+(below|above)\s+zero is written as\.\.\.$/i);
            if (match) return `${match[1]} grados ${match[2].toLowerCase() === "below" ? "por debajo" : "por encima"} de cero se escribe como...`;

            match = trimmed.match(/^Which is\s+(colder|warmer)\?$/i);
            if (match) return `¿Cuál es ${match[1].toLowerCase() === "colder" ? "más frío" : "más cálido"}?`;

            return "";
        })();

        if (dynamicTranslation) {
            return leadingSpace + dynamicTranslation + trailingSpace;
        }

        const directTranslation = phraseTranslations.get(trimmed.toLowerCase());

        if (directTranslation) {
            return leadingSpace + matchCapitalization(trimmed, directTranslation) + trailingSpace;
        }

        const protectedValues = [];
        let translated = trimmed;

        protectedPhrasePatterns.forEach(function (entry) {
            translated = translated.replace(entry.pattern, function (match, prefix, phraseMatch) {
                const marker = "\uE000" + protectedValues.length + "\uE001";
                protectedValues.push(matchCapitalization(phraseMatch, phraseTranslations.get(entry.phrase)));
                return prefix + marker;
            });
        });

        translated = translated.replace(wordPattern, function (match) {
            return matchCapitalization(match, wordTranslations[match.toLowerCase()]);
        });

        translated = translated.replace(/\uE000(\d+)\uE001/g, function (_, index) {
            return protectedValues[Number(index)];
        });

        if (trimmed.endsWith("?") && !translated.startsWith("¿")) translated = "¿" + translated;
        if (trimmed.endsWith("!") && !translated.startsWith("¡")) translated = "¡" + translated;

        return leadingSpace + translated + trailingSpace;
    }

    function shouldIgnoreTranslation(node) {
        const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        if (!element) return true;
        return !!element.closest(
            "script, style, noscript, code, pre, kbd, svg, [translate='no'], [data-bw-translation-ignore]"
        );
    }

    function translateTextNode(node, language) {
        if (!node || node.nodeType !== Node.TEXT_NODE || shouldIgnoreTranslation(node)) return;

        const currentValue = node.nodeValue;
        const previousTranslation = translatedTextValues.get(node);
        let originalValue = originalTextValues.get(node);

        if (originalValue === undefined || (language === "es" && currentValue !== previousTranslation)) {
            originalValue = currentValue;
            originalTextValues.set(node, originalValue);
        }

        const nextValue = language === "es" ? translateToSpanish(originalValue) : originalValue;
        translatedTextValues.set(node, nextValue);
        if (currentValue !== nextValue) node.nodeValue = nextValue;
    }

    function translateAttributes(element, language) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE || shouldIgnoreTranslation(element)) return;

        const attributes = ["placeholder", "title", "aria-label", "alt"];
        let originals = originalAttributeValues.get(element);
        let translations = translatedAttributeValues.get(element);

        if (!originals) {
            originals = {};
            originalAttributeValues.set(element, originals);
        }
        if (!translations) {
            translations = {};
            translatedAttributeValues.set(element, translations);
        }

        attributes.forEach(function (attribute) {
            if (!element.hasAttribute(attribute)) return;
            const currentValue = element.getAttribute(attribute);

            if (originals[attribute] === undefined || (language === "es" && currentValue !== translations[attribute])) {
                originals[attribute] = currentValue;
            }

            const nextValue = language === "es"
                ? translateToSpanish(originals[attribute])
                : originals[attribute];
            translations[attribute] = nextValue;
            if (currentValue !== nextValue) element.setAttribute(attribute, nextValue);
        });
    }

    function translateSubtree(root, language) {
        if (!root) return;

        if (root.nodeType === Node.TEXT_NODE) {
            translateTextNode(root, language);
            return;
        }

        if (root.nodeType !== Node.ELEMENT_NODE || shouldIgnoreTranslation(root)) return;
        translateAttributes(root, language);

        root.querySelectorAll("*").forEach(function (element) {
            translateAttributes(element, language);
        });

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let textNode = walker.nextNode();
        while (textNode) {
            translateTextNode(textNode, language);
            textNode = walker.nextNode();
        }
    }

    function observeLanguageChanges() {
        if (languageObserver) return;

        languageObserver = new MutationObserver(function (mutations) {
            if (languageUpdateInProgress) return;
            languageUpdateInProgress = true;

            mutations.forEach(function (mutation) {
                if (mutation.type === "characterData") {
                    translateTextNode(mutation.target, state.language);
                    return;
                }
                if (mutation.type === "attributes") {
                    translateAttributes(mutation.target, state.language);
                    return;
                }
                mutation.addedNodes.forEach(function (node) {
                    translateSubtree(node, state.language);
                });
            });

            languageUpdateInProgress = false;
        });

        languageObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["placeholder", "title", "aria-label", "alt"],
            characterData: true,
            childList: true,
            subtree: true
        });
    }

    function setPageLanguage(language) {
        const selectedLanguage = language === "es" ? "es" : "en";
        state.language = selectedLanguage;
        document.documentElement.lang = selectedLanguage;

        languageUpdateInProgress = true;
        if (selectedLanguage === "es") {
            pageHasBeenTranslated = true;
            translateSubtree(document.body, selectedLanguage);
        } else if (pageHasBeenTranslated) {
            translateSubtree(document.body, selectedLanguage);
        }

        if (selectedLanguage === "es") {
            if (document.title !== translatedDocumentTitle) originalDocumentTitle = document.title;
            translatedDocumentTitle = translateToSpanish(originalDocumentTitle);
            document.title = translatedDocumentTitle;
        } else {
            document.title = originalDocumentTitle;
            translatedDocumentTitle = "";
        }

        languageUpdateInProgress = false;
        updateAccessibilityUiLabels();
        document.dispatchEvent(new CustomEvent("buhowise:language-change", {
            detail: { language: selectedLanguage }
        }));
        observeLanguageChanges();
    }

    function updateAccessibilityUiLabels() {
        const spanish = state.language === "es";
        const labels = {
            read: isReadingModeActive
                ? ["bi-volume-mute", spanish ? "Detener lectura" : "Stop Reading"]
                : ["bi-volume-up", spanish ? "Leer" : "Read"],
            "text-up": ["bi-zoom-in", spanish ? "Texto +" : "Text +"],
            "text-down": ["bi-zoom-out", spanish ? "Texto -" : "Text -"],
            dark: ["bi-moon", spanish ? "Oscuro" : "Dark"],
            contrast: ["bi-circle-half", spanish ? "Contraste" : "Contrast"],
            dyslexia: ["bi-fonts", spanish ? "Dislexia" : "Dyslexia"],
            language: ["bi-translate", spanish ? "English" : "Español"],
            reset: ["bi-arrow-counterclockwise", spanish ? "Restablecer" : "Reset"]
        };

        const heading = document.querySelector("#accessibilityPanel h5");
        if (heading) {
            heading.innerHTML =
                '<i class="bi bi-sliders me-2" aria-hidden="true"></i>' +
                (spanish ? "Herramientas de accesibilidad" : "Accessibility Tools");
        }

        Object.entries(labels).forEach(function ([action, label]) {
            const button = document.querySelector(`[data-bw-accessibility="${action}"]`);
            if (!button) return;
            button.innerHTML = `<i class="bi ${label[0]}" aria-hidden="true"></i> ${label[1]}`;
        });

        const menuButton = document.querySelector(".accessibility-btn");
        if (menuButton) {
            menuButton.setAttribute("aria-label", spanish ? "Menú de accesibilidad" : "Accessibility Menu");
        }
    }

    function applyState() {
        document.body.classList.toggle("dark-mode", !!state.darkMode);
        document.body.classList.toggle("high-contrast", !!state.highContrast);
        document.body.classList.toggle("dyslexia", !!state.dyslexia);
        document.body.style.fontSize = (state.fontSize || 100) + "%";
        
        
        isReadingModeActive = !!state.readingMode;
        document.body.classList.toggle("bw-reading-mode", isReadingModeActive);

        const readBtn = document.querySelector('[data-bw-accessibility="read"]');
        if (readBtn) readBtn.setAttribute("aria-pressed", String(isReadingModeActive));

        const pressedStates = {
            dark: !!state.darkMode,
            contrast: !!state.highContrast,
            dyslexia: !!state.dyslexia,
            read: isReadingModeActive
        };

        Object.entries(pressedStates).forEach(function ([action, pressed]) {
            document.querySelectorAll(`[data-bw-accessibility="${action}"]`).forEach(function (button) {
                button.setAttribute("aria-pressed", String(pressed));
            });
        });

        updateAccessibilityUiLabels();
    }

    function syncFromBody() {
        state.darkMode = document.body.classList.contains("dark-mode");
        state.highContrast = document.body.classList.contains("high-contrast");
        state.dyslexia = document.body.classList.contains("dyslexia");
        state.readingMode = isReadingModeActive;
        const size = parseInt((document.body.style.fontSize || "100").replace("%", ""), 10);
        state.fontSize = Number.isFinite(size) ? size : 100;
        saveState();
    }

    window.clearHighlights = function () {
        if (currentHighlightedElement) {
            currentHighlightedElement.classList.remove("bw-element-reading");
            currentHighlightedElement = null;
        }
    };

    loadState();

    window.toggleAccessibility = function () {
        const panel = document.getElementById("accessibilityPanel");
        if (!panel) return;
        const open = panel.style.display !== "block";
        panel.style.display = open ? "block" : "none";
        const button = document.querySelector(".accessibility-btn");
        if (button) button.setAttribute("aria-expanded", String(open));
    };

    
    window.readPage = function (shouldAnnounce = true) {
        if (typeof shouldAnnounce === "boolean") {
            isReadingModeActive = !isReadingModeActive;
        } else {
            isReadingModeActive = true;
        }

        state.readingMode = isReadingModeActive;
        saveState();

        const readBtn = document.querySelector('[data-bw-accessibility="read"]');

        if (isReadingModeActive) {
            document.body.classList.add("bw-reading-mode");
            if (readBtn) readBtn.setAttribute("aria-pressed", "true");

            if (shouldAnnounce === true) {
                const message = state.language === "es"
                    ? "Modo de lectura activado. Pasa el cursor sobre cualquier texto o escribe en un buscador para escucharlo."
                    : "Reading mode enabled. Move the pointer over any text, or type in a search box, to hear it.";
                speakText(message);
            }
        } else {
            window.stopReading();
        }

        updateAccessibilityUiLabels();
    };

    
    window.stopReading = function () {
        isReadingModeActive = false;
        state.readingMode = false;
        saveState();

        document.body.classList.remove("bw-reading-mode");
        
        if (hoverTimer) clearTimeout(hoverTimer);
        if (inputTypingTimer) clearTimeout(inputTypingTimer);
        
        const readBtn = document.querySelector('[data-bw-accessibility="read"]');
        if (readBtn) readBtn.setAttribute("aria-pressed", "false");

        if (supportsSpeech()) window.speechSynthesis.cancel();
        window.clearHighlights();
        updateAccessibilityUiLabels();
    };

    
    function speakText(text, element = null) {
        if (!text || text.trim().length === 0) return;
        if (!supportsSpeech()) return;

        window.speechSynthesis.cancel();
        window.clearHighlights();

        if (element) {
            currentHighlightedElement = element;
            currentHighlightedElement.classList.add("bw-element-reading");
        }

        const speech = new window.SpeechSynthesisUtterance(text.trim());

        if (state.language === "en") {
            const englishVoice = getEnglishVoice();
            if (englishVoice) speech.voice = englishVoice;
            speech.lang = englishVoice ? englishVoice.lang : "en-US";
            speech.pitch = 1.0;
            speech.rate = 0.92;
            speech.volume = 1.0;
        } else {
            const femaleVoice = getSweetFemaleVoice();
            if (femaleVoice) speech.voice = femaleVoice;
            speech.lang = femaleVoice ? femaleVoice.lang : "es-MX";
            speech.pitch = 1.0;
            speech.rate = 0.92;
            speech.volume = 1.0;
        }

        speech.onend = window.clearHighlights;
        speech.onerror = window.clearHighlights;

        window.speechSynthesis.speak(speech);
    }

    
    document.addEventListener("mouseover", function (event) {
        if (!isReadingModeActive) return;

        if (event.target.closest("#accessibilityPanel") || event.target.closest(".accessibility-btn")) {
            return;
        }

        const targetElement = event.target.closest("h1, h2, h3, h4, h5, h6, p, label, a, button, li, span");

        if (targetElement) {
            if (targetElement === currentHighlightedElement) return;

            if (hoverTimer) clearTimeout(hoverTimer);

            hoverTimer = setTimeout(function () {
                const textToRead = targetElement.getAttribute("aria-label") ||
                    targetElement.innerText || targetElement.textContent;
                speakText(textToRead, targetElement);
            }, 250);
        }
    }, true);

    document.addEventListener("mouseout", function (event) {
        if (!isReadingModeActive) return;
        const targetElement = event.target.closest("h1, h2, h3, h4, h5, h6, p, label, a, button, li, span");
        if (targetElement && targetElement === currentHighlightedElement) {
            if (hoverTimer) clearTimeout(hoverTimer);
        }
    }, true);

    
    document.addEventListener("input", function (event) {
        if (!isReadingModeActive) return;

        const inputField = event.target.closest("input[type='text'], input[type='search'], input:not([type]), textarea");
        if (!inputField) return;

        if (inputTypingTimer) clearTimeout(inputTypingTimer);

        
        inputTypingTimer = setTimeout(function () {
            const textToRead = inputField.value;
            if (textToRead && textToRead.trim().length > 0) {
                speakText(textToRead, inputField);
            }
        }, 300);
    }, true);

    window.increaseText = function () {
        state.fontSize = Math.min((state.fontSize || 100) + 10, 150);
        applyState();
        saveState();
    };

    window.decreaseText = function () {
        state.fontSize = Math.max((state.fontSize || 100) - 10, 70);
        applyState();
        saveState();
    };

    window.toggleDarkMode = function () {
        state.highContrast = false;
        state.darkMode = !state.darkMode;
        applyState();
        saveState();
    };

    window.toggleContrast = function () {
        state.darkMode = false;
        state.highContrast = !state.highContrast;
        applyState();
        saveState();
    };

    window.toggleDyslexia = function () {
        state.dyslexia = !state.dyslexia;
        applyState();
        saveState();
    };

    window.resetAccessibility = function () {
        window.stopReading();
        state = {
            fontSize: 100,
            darkMode: false,
            highContrast: false,
            dyslexia: false,
            readingMode: false,
            language: state.language === "es" ? "es" : "en"
        };
        applyState();
        saveState();
    };

    const actions = {
        "toggle-panel": function () { window.toggleAccessibility(); },
        read: function () { window.readPage(true); },
        "text-up": function () { window.increaseText(); },
        "text-down": function () { window.decreaseText(); },
        dark: function () { window.toggleDarkMode(); },
        contrast: function () { window.toggleContrast(); },
        dyslexia: function () { window.toggleDyslexia(); },
        language: function () {
            setPageLanguage(state.language === "es" ? "en" : "es");
            saveState();
        },
        reset: function () { window.resetAccessibility(); }
    };

    document.addEventListener("click", function (event) {
        const control = event.target.closest("[data-bw-accessibility]");
        if (!control) return;
        const action = actions[control.dataset.bwAccessibility];
        if (!action) return;
        event.preventDefault();
        action();
    });

    document.addEventListener("buhowise:accessibility-ready", applyState);

    function initializeAccessibility() {
        ensureAccessibilityUi();
        applyState();
        setPageLanguage(state.language);
        syncFromBody();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeAccessibility, { once: true });
    } else {
        initializeAccessibility();
    }

    document.addEventListener("click", function (event) {
        const panel = document.getElementById("accessibilityPanel");
        const button = document.querySelector(".accessibility-btn");
        const panelToggle = event.target.closest('[data-bw-accessibility="toggle-panel"]');
        if (panel && button && panel.style.display === "block" && !panel.contains(event.target) && !button.contains(event.target) && !panelToggle) {
            panel.style.display = "none";
            button.setAttribute("aria-expanded", "false");
        }
    });
})();
