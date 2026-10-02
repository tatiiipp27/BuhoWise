/* BuhoWise: bilingual commands. Microphone access requires an explicit click. */
(function () {
    'use strict';
    const normalize = text => String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const numbers = {one:1,first:1,uno:1,una:1,two:2,second:2,dos:2,three:3,third:3,tres:3,four:4,fourth:4,cuatro:4,five:5,cinco:5,six:6,seis:6,seven:7,seventh:7,siete:7,septimo:7,eight:8,eighth:8,ocho:8,octavo:8,nine:9,ninth:9,nueve:9,noveno:9};
    const number = word => numbers[word] || (/^\d+(th|st|nd|rd)?$/.test(word || '') ? parseInt(word,10) : null);
    function parse(value, role = 'student') {
        const text = normalize(value), words = text.split(' ');
        const after = keys => { const i = words.findIndex(w => keys.includes(w)); return i < 0 ? null : (number(words[i+1]) || number(words[i-1])); };
        let grade = after(['grade','grado']);
        words.forEach((w,i) => { if (['grade','grado'].includes(words[i+1]) || ['seventh','eighth','ninth','septimo','octavo','noveno'].includes(w)) grade = number(w); });
        const subject = /\b(math|mathematics|mate|matematica|matematicas)\b/.test(text) ? 'math' : /\b(language|lenguaje|literatura)\b/.test(text) ? 'language' : null;
        // Teacher commands open existing sections; they never submit their forms.
        const teacherRules = role === 'professor' ? [
            ['teacher-support', /\b(teaching support|teacher support|apoyo docente|apoyo para docentes|soporte docente)\b/],
            ['teacher-planner', /\b(lesson planner|planner|plan a lesson|planificador|planificar|planifica)\b/],
            ['teacher-quizzes', /\b(quiz builder|quiz creator|create a quiz|quizzes|quiz|cuestionarios|cuestionario)\b/],
            ['teacher-ranking', /\b(ranking|leaderboard|classification|clasificacion)\b/],
            ['teacher-points', /\b(student points|points|puntos|students|estudiantes|alumnos|progress|progreso)\b/],
            ['teacher-classes', /\b(classes|classrooms|class|clases|clase)\b/],
            ['teacher-overview', /\b(overview|dashboard|resumen|panel|inicio|home)\b/]
        ] : [];
        const rules = [
            ['help', /what can i say|que puedo decir|\bhelp\b|ayuda|comandos|commands/],
            ['read', /read this page|read the page|lee esta pagina|leer esta pagina/],
            ...teacherRules,
            ['avatar', /avatar/], ['profile', /profile|perfil|progress|progreso|points|puntos/],
            ['about', /about|acerca|equipo/], ['teachers', /teacher|profesor|maestro|support|apoyo/],
            ['down', /scroll down|\bbaja\b|bajar/], ['up', /scroll up|\bsube\b|subir/],
            ['back', /go back|regresa|vuelve|volver/], ['home', /go home|home page|inicio|pagina principal/],
            ['subjects', /subjects|materias|asignaturas/]
        ];
        const found = rules.find(([,regex]) => regex.test(text));
        return {text, action:found ? found[0] : null, subject, grade, unit:after(['unit','unidad']), lesson:after(['lesson','leccion']), single:words.length===1 ? number(words[0]) : null};
    }
    function route(c, level) {
        if (!c.subject) return {missing:'subject'};
        if (level==='subject') return {url:c.subject+'-grades.html'};
        if (!c.grade) return {missing:'grade'};
        if (![7,8,9].includes(c.grade)) return {error:true};
        if (level==='grade') return {url:c.grade===7 ? c.subject+'-seventh-units.html' : `grade-units.html?subject=${c.subject}&grade=${c.grade}`};
        if (!c.unit) return {missing:'unit'};
        if (c.unit<1 || c.unit>4) return {unavailable:true};
        if (level==='unit') return {url:c.grade===7 ? `${c.subject==='math'?'matematica':'language'}-septimo.html?unit=${c.unit}` : `learning-path.html?subject=${c.subject}&grade=${c.grade}&unit=${c.unit}`};
        if (!c.lesson || c.lesson<1 || c.lesson>8) return {error:true};
        if (c.grade===7) return {url:c.subject==='math' ? `lessons/math7-u${c.unit}-l${c.lesson}.html` : `lessons/language-quizizz.html?unit=${c.unit}&lesson=${c.lesson}`};
        if (c.subject==='math') return {url:c.grade===8 ? `lessons_8math/leccion${c.lesson}unidad${c.unit}.html` : `lessons_9math/math9-u${c.unit}-l${c.lesson}.html`};
        if (c.grade===8) return {url:`lessons_8languaje/lang8-u${c.unit}-l${c.lesson}.html`};
        const special={'3-1':'Unida3-leccion1.html','2-3':'unidad2-leccion3.html','3-8':'Unidad3-leccon8.html'};
        return {url:'lessons_9languaje/'+(special[`${c.unit}-${c.lesson}`] || `Unidad${c.unit}-leccion${c.lesson}.html`)};
    }
    if (typeof module!=='undefined' && module.exports) { module.exports={parse,route}; return; }
    if (window.BuhoWiseVoice) return;
    window.BuhoWiseVoice={parse,route};
    const base = new URL('.', document.currentScript.src);
    let context={}, pending=null, recognition=null, enabled=false, speaking=false, timer, speechId=0;
    let box, status, mic, help, input, submit, close, button;
    const language = () => document.documentElement.lang.startsWith('es') ? 'es' : 'en';
    const tr = (en,es) => language()==='es' ? es : en;
    const isProfessorPage = () => document.body.classList.contains('professor-page');
    const teacherSections = {
        'teacher-overview': {id: 'overview', name: ['Overview', 'Resumen']},
        'teacher-classes': {id: 'classes', name: ['Classes', 'Clases']},
        'teacher-points': {id: 'students', name: ['Student Points', 'Puntos de estudiantes']},
        'teacher-ranking': {id: 'ranking', name: ['Ranking', 'Clasificación']},
        'teacher-quizzes': {id: 'quizzes', name: ['Quiz Builder', 'Creador de quizzes']},
        'teacher-planner': {id: 'planner', name: ['Lesson Planner', 'Planificador de lecciones']}
    };
    function contextFromPage() {
        try { context=JSON.parse(sessionStorage.getItem('bwVoiceContext') || '{}'); } catch { context={}; }
        const path=location.pathname, params=new URLSearchParams(location.search);
        if (/math|matematica/.test(path)) context.subject='math';
        if (/language|languaje|lang[89]/.test(path)) context.subject='language';
        const grade=path.match(/(?:math|lang)([789])-u/) || path.match(/lessons_([89])/);
        if (/septimo|seventh|language-quizizz|math7/.test(path)) context.grade=7;
        if (grade) context.grade=Number(grade[1]);
        if (['math','language'].includes(params.get('subject'))) context.subject=params.get('subject');
        if (params.has('grade')) context.grade=Number(params.get('grade'));
        const unit=path.match(/-u(\d+)/i) || path.match(/unidad(\d+)/i);
        if (unit) context.unit=Number(unit[1]);
        if (params.has('unit')) context.unit=Number(params.get('unit'));
    }
    function listen() {
        clearTimeout(timer);
        if (!enabled || speaking || document.hidden || !recognition) return;
        recognition.lang=language()==='es' ? 'es-SV' : 'en-US';
        try { recognition.start(); } catch { /* Already listening. */ }
    }
    function off() {
        enabled=false; speaking=false; clearTimeout(timer); ++speechId;
        if (recognition) recognition.abort();
        if (window.speechSynthesis) speechSynthesis.cancel();
        labels();
    }
    function say(text) {
        status.textContent=text;
        if (!window.speechSynthesis) return;
        // Give only one accessibility voice control ownership of the speaker.
        if(document.body.classList.contains('bw-reading-mode') && window.stopReading) window.stopReading();
        const id=++speechId; speaking=true;
        if (recognition) recognition.abort();
        speechSynthesis.cancel();
        const chunks=(text.match(/[^.!?]+[.!?]*\s*/g) || [text]).flatMap(sentence=>sentence.match(/.{1,190}(?:\s|$)|\S+/g) || [sentence]); let index=0;
        function next() {
            if (id!==speechId) return;
            if (index>=chunks.length) { speaking=false; timer=setTimeout(listen,400); return; }
            const speech=new SpeechSynthesisUtterance(chunks[index++]);
            speech.lang=language()==='es' ? 'es-MX' : 'en-US'; speech.rate=.94;
            const voices=speechSynthesis.getVoices().filter(v=>v.lang.startsWith(language()));
            const voice=voices.find(v=>/natural|google|online/i.test(v.name)) || voices[0];
            if (voice) speech.voice=voice;
            speech.onend=next;
            speech.onerror=()=>{ if(id===speechId){speaking=false;timer=setTimeout(listen,500);} };
            speechSynthesis.speak(speech);
        }
        next();
    }
    function helpText() {
        if (isProfessorPage()) {
            return tr(
                'You can say: open my classes, open student points, show the ranking, open the quiz builder, open the lesson planner, open teaching support, go to overview, read this page, scroll down, scroll up, or go back. These commands open sections only; use the forms to save changes.',
                'Puedes decir: abre mis clases, abre puntos de estudiantes, muéstrame la clasificación, abre el creador de quizzes, abre el planificador de lecciones, abre apoyo docente, ve al resumen, lee esta página, baja, sube o regresa. Estos comandos solo abren apartados; usa los formularios para guardar cambios.'
            );
        }
        return tr('You can say: read this page, go home, open subjects, open mathematics, open language arts, go to eighth grade, open unit two, open lesson three, show my progress, change my avatar, show math teachers, about BuhoWise, scroll down, scroll up, or go back.', 'Puedes decir: lee esta página, ve al inicio, abre materias, abre matemáticas, abre lenguaje, ve a octavo grado, abre la unidad dos, abre la lección tres, muéstrame mi progreso, cambia mi avatar, muéstrame los profesores de matemáticas, acerca de BuhoWise, baja, sube o regresa.');
    }
    function go(url) {
        try {
            sessionStorage.setItem('bwVoiceContext',JSON.stringify(context));
            if(enabled) sessionStorage.setItem('bwVoiceResume','yes');
        } catch {}
        off(); location.assign(new URL(url,base).href);
    }
    function handle(value) {
        const professor = isProfessorPage();
        const cmd=parse(value, professor ? 'professor' : 'student');
        input.value='';
        if (!cmd.text) return;
        if (cmd.action) {
            pending=null;
            const section = professor && teacherSections[cmd.action];
            if (section) {
                const link = document.querySelector(`.sidebar [data-section="${section.id}"]`);
                if (!link) return say(tr('This section is not available on this page.', 'Este apartado no está disponible en esta página.'));
                link.click();
                const heading = document.querySelector(`#${section.id} h2`);
                if (heading) {
                    heading.setAttribute('tabindex', '-1');
                    heading.focus({preventScroll: true});
                    heading.scrollIntoView({behavior: 'smooth', block: 'center'});
                }
                return say(tr('Opened: ', 'Apartado abierto: ') + tr(...section.name) + '.');
            }
            if (professor && cmd.action === 'teacher-support') return go('teacherss.html');
            if (professor && ['avatar', 'profile', 'subjects'].includes(cmd.action)) {
                return say(tr('That option belongs to the student area. Here you can open classes, student points, the ranking, the quiz builder, or the lesson planner.', 'Esa opción pertenece al apartado de estudiantes. Aquí puedes abrir clases, puntos de estudiantes, la clasificación, el creador de quizzes o el planificador de lecciones.'));
            }
            const pages={home:'index.html',subjects:'subjects.html',profile:'profile.html',about:'about.html',teachers:cmd.subject ? cmd.subject+'-support.html' : 'teacherss.html'};
            if (pages[cmd.action]) return go(pages[cmd.action]);
            if (cmd.action==='help') return say(helpText());
            if (cmd.action==='avatar') {
                if(window.BuhoWiseAvatar){box.hidden=true;button.setAttribute('aria-expanded','false');window.BuhoWiseAvatar.open();say(tr('Choose your avatar.','Elige tu avatar.'));}
                else say(tr('Avatar selection is available in the student profile.','La selección de avatar está disponible en el perfil de estudiantes.'));
                return;
            }
            if (cmd.action==='back') { if(history.length>1){off();history.back();}else say(tr('There is no previous page.','No hay una página anterior.'));return; }
            if (['up','down'].includes(cmd.action)) { window.scrollBy({top:innerHeight*.7*(cmd.action==='down'?1:-1),behavior:'smooth'}); return; }
            if (cmd.action==='read') {
                const root=document.querySelector('main') || document.body;
                const nodes=[...root.querySelectorAll('h1,h2,h3,p,li,label,button,a')].filter(el=>!el.closest('#bw-voice,#accessibilityPanel,nav,footer,[hidden]') && el.getClientRects().length);
                const texts=nodes.filter(el=>!nodes.some(other=>other!==el && other.contains(el))).map(el=>(el.getAttribute('aria-label') || el.innerText || '').trim()).filter(Boolean);
                return say(texts.join('. ') || tr('No readable content found.','No encontré contenido para leer.'));
            }
        }
        if (professor) return say(tr('I did not understand. Say what can I say to hear the teacher commands.', 'No entendí. Di qué puedo decir para escuchar los comandos para docentes.'));
        if (!pending && ((cmd.subject && cmd.subject!==context.subject) || (cmd.grade && cmd.grade!==context.grade))) { delete context.unit; delete context.lesson; }
        for (const key of ['subject','grade','unit','lesson']) if(cmd[key]!=null) context[key]=cmd[key];
        if (pending && cmd.single) context[pending.missing]=cmd.single;
        const level=cmd.lesson ? 'lesson' : pending ? pending.level : cmd.unit ? 'unit' : cmd.grade ? 'grade' : cmd.subject ? 'subject' : null;
        if (!level) return say(tr('I did not understand. Say what can I say for help.','No entendí. Di qué puedo decir para escuchar la ayuda.'));
        const target=route(context,level);
        if (target.missing) {
            pending={level,missing:target.missing};
            const questions={subject:['Mathematics or Language Arts?','¿Matemáticas o Lenguaje?'],grade:['Seventh, eighth, or ninth grade?','¿Séptimo, octavo o noveno grado?'],unit:['Which unit? Say unit one, two, three, or four.','¿Qué unidad? Di unidad uno, dos, tres o cuatro.']};
            return say(tr(...questions[target.missing]));
        }
        pending=null;
        if (target.unavailable) return say(tr('That unit is coming soon. Units one through four are available.','Esa unidad estará disponible próximamente. Puedes abrir las unidades uno a cuatro.'));
        if (target.error) return say(tr('Choose grade seven to nine and lesson one to eight.','Elige un grado del siete al nueve y una lección del uno al ocho.'));
        go(target.url);
    }
    function labels() {
        if (!box) return;
        button.textContent=tr('Voice assistant','Asistente de voz');
        const title = isProfessorPage() ? tr('Teacher voice assistant', 'Asistente de voz docente') : button.textContent;
        box.querySelector('h2').textContent=title;
        box.setAttribute('aria-label', title);
        mic.textContent=enabled ? tr('Turn microphone off','Apagar micrófono') : tr('Activate microphone','Activar micrófono');mic.setAttribute('aria-pressed',String(enabled));
        help.textContent=tr('What can I say?','¿Qué puedo decir?');
        input.placeholder=tr('Type a command…','Escribe un comando…');input.setAttribute('aria-label',input.placeholder);
        submit.textContent=tr('Go','Ir');close.textContent=tr('Close','Cerrar');
    }
    function init() {
        contextFromPage();
        const style=document.createElement('style');
        style.textContent='#bw-voice{position:fixed;right:20px;bottom:90px;width:min(370px,calc(100vw - 40px));box-sizing:border-box;max-height:70vh;overflow:auto;padding:22px;border:1px solid #ab98f8;border-radius:22px;background:#211c35;color:#fff;z-index:10050;box-shadow:0 12px 40px #0005;font:16px/1.5 Arial,sans-serif}#bw-voice[hidden]{display:none}#bw-voice h2{font-size:22px;color:#fff;margin:0 0 14px}#bw-voice button{background:#6748ed;color:white;border:1px solid #b7a9ff;border-radius:12px;padding:10px;margin:4px;cursor:pointer}#bw-voice input{box-sizing:border-box;width:100%;background:white;color:#211c35;padding:12px;border-radius:10px;border:1px solid #aaa}#bw-voice :focus-visible{outline:3px solid #80eed2;outline-offset:2px}#bw-voice p{color:white}';
        document.head.append(style);
        box=document.createElement('section');box.id='bw-voice';box.hidden=true;box.setAttribute('translate','no');box.setAttribute('aria-label','BuhoWise voice assistant');
        box.innerHTML='<h2></h2><p role="status" aria-live="polite"></p><button type="button" class="mic"></button><button type="button" class="help"></button><form><input autocomplete="off"><button type="submit"></button></form><button type="button" class="close"></button>';
        document.body.append(box);
        status=box.querySelector('p');mic=box.querySelector('.mic');help=box.querySelector('.help');input=box.querySelector('input');submit=box.querySelector('[type=submit]');close=box.querySelector('.close');
        button=document.createElement('button');button.type='button';button.setAttribute('translate','no');button.setAttribute('aria-controls','bw-voice');button.setAttribute('aria-expanded','false');
        button.onclick=()=>{box.hidden=false;button.setAttribute('aria-expanded','true');labels();status.textContent=tr('Activate the microphone or type a command. Allow microphone access when asked.','Activa el micrófono o escribe un comando. Permite el acceso al micrófono cuando se solicite.');mic.focus();};
        function attach() {
            const grid = document.querySelector('#accessibilityPanel .accessibility-grid');
            if (!grid) return;
            const reset = grid.querySelector('[data-bw-accessibility="reset"]');
            button.style.gridColumn = '1 / -1';
            grid.insertBefore(button, reset);
        }
        attach();document.addEventListener('buhowise:accessibility-ready',attach);
        const Recognition=window.SpeechRecognition || window.webkitSpeechRecognition;
        if (Recognition) {
            recognition=new Recognition();recognition.continuous=false;recognition.interimResults=false;
            recognition.onstart=()=>{status.textContent=tr('Listening…','Escuchando…');};
            recognition.onresult=e=>{const result=e.results[e.resultIndex];if(result.isFinal&&!speaking)handle(result[0].transcript);};
            recognition.onend=()=>{if(enabled&&!speaking)timer=setTimeout(listen,650);};
            recognition.onerror=e=>{if(['aborted','no-speech'].includes(e.error))return;off();status.textContent=tr('Microphone unavailable ('+e.error+'). Check permissions or type a command.','Micrófono no disponible ('+e.error+'). Revisa los permisos o escribe un comando.');};
        }
        mic.onclick=()=>{
            if(enabled){off();status.textContent=tr('Microphone off.','Micrófono apagado.');return;}
            if(!recognition){status.textContent=tr('Voice recognition is unavailable. Try Chrome or type a command.','El reconocimiento de voz no está disponible. Prueba Chrome o escribe un comando.');return;}
            if(document.body.classList.contains('bw-reading-mode')&&window.stopReading)window.stopReading();
            enabled=true;labels();listen();
        };
        help.onclick=()=>say(helpText());box.querySelector('form').onsubmit=e=>{e.preventDefault();handle(input.value);};
        document.addEventListener('click',event=>{
            if(event.target.closest('[data-bw-accessibility="read"], [data-bw-accessibility="reset"]')) {
                off();status.textContent=tr('Microphone off.','Micrófono apagado.');
            }
        },true);
        close.onclick=()=>{off();box.hidden=true;button.setAttribute('aria-expanded','false');document.querySelector('.accessibility-btn')?.focus();};
        box.addEventListener('keydown',e=>{if(e.key==='Escape')close.click();});
        document.addEventListener('visibilitychange',()=>{if(document.hidden){if(recognition)recognition.abort();}else listen();});
        document.addEventListener('buhowise:language-change',()=>{off();labels();status.textContent=tr('Language changed. Activate the microphone to continue.','Idioma cambiado. Activa el micrófono para continuar.');});
        window.addEventListener('pagehide',off);labels();
        // Resume only after navigation started by an already enabled assistant.
        let resume=false;
        try { resume=sessionStorage.getItem('bwVoiceResume')==='yes';sessionStorage.removeItem('bwVoiceResume'); } catch {}
        if(resume && recognition){box.hidden=false;button.setAttribute('aria-expanded','true');enabled=true;labels();timer=setTimeout(listen,500);}
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
