/* Shared BuhoWise quiz feedback, based on 8th Grade Mathematics Unit 1 Lesson 1. */
(function () {
  "use strict";

  const CORRECT_VOLUME = 0.25;
  const WRONG_VOLUME = 0.25;
  const ANSWER_CONFETTI = { particleCount: 100, spread: 70, origin: { y: 0.6 } };
  const COLORS = ["#6B4EFF", "#24D29B", "#FFB84D", "#FF5E7E", "#00B2FF"];
  const POINTS_STORAGE_KEY = "buhowiseQuizPoints";

  function fallbackConfetti(options) {
    const settings = options || {};
    const colors = settings.colors || COLORS;
    const count = Math.min(settings.particleCount || 80, 180);
    const layer = document.createElement("div");
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:10000";
    document.body.appendChild(layer);

    for (let i = 0; i < count; i++) {
      const piece = document.createElement("span");
      const left = 15 + Math.random() * 70;
      const delay = Math.random() * 180;
      const duration = 750 + Math.random() * 650;
      piece.style.cssText = `position:absolute;left:${left}%;top:65%;width:${6 + Math.random() * 7}px;height:${8 + Math.random() * 9}px;background:${colors[i % colors.length]};border-radius:${Math.random() > 0.5 ? "50%" : "2px"};transform:translate(-50%,-50%) rotate(${Math.random() * 180}deg);opacity:1`;
      layer.appendChild(piece);
      piece.animate([
        { transform: "translate(-50%,-50%) translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(-50%,-50%) translate(${(Math.random() - 0.5) * 420}px,${-220 - Math.random() * 260}px) rotate(${360 + Math.random() * 540}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(-50%,-50%) translate(${(Math.random() - 0.5) * 520}px,${180 + Math.random() * 260}px) rotate(${720 + Math.random() * 540}deg)`, opacity: 0 }
      ], { duration, delay, easing: "cubic-bezier(.16,.7,.3,1)", fill: "forwards" });
    }

    setTimeout(function () { layer.remove(); }, 1800);
  }

  const confettiEngine = typeof window.confetti === "function"
    ? window.confetti.bind(window)
    : fallbackConfetti;

  let answering = false;
  let soundPlayed = false;
  let answerConfettiPlayed = false;

  function showPointsAnimation() {
    let style = document.getElementById("bw-points-animation-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "bw-points-animation-style";
      style.textContent = ".bw-points-pop{position:fixed;left:50%;top:42%;z-index:10001;pointer-events:none;padding:10px 18px;border-radius:999px;background:linear-gradient(135deg,#24d29b,#00b2ff);color:#fff;font:800 1.08rem/1 Segoe UI,sans-serif;letter-spacing:.02em;box-shadow:0 12px 30px rgba(0,178,255,.3);transform:translate(-50%,-50%) scale(.7);opacity:0}.bw-points-pop::before{content:\"✦\";margin-right:7px;color:#fff7ae}.bw-points-pop.bw-points-pop-show{animation:bwPointsPop .9s cubic-bezier(.16,.7,.3,1) forwards}@keyframes bwPointsPop{0%{opacity:0;transform:translate(-50%,-20%) scale(.7)}22%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}65%{opacity:1;transform:translate(-50%,-62%) scale(1)}100%{opacity:0;transform:translate(-50%,-105%) scale(.96)}}";
      document.head.appendChild(style);
    }
    const pop = document.createElement("div");
    pop.className = "bw-points-pop";
    pop.setAttribute("role", "status");
    pop.setAttribute("aria-live", "polite");
    pop.textContent = "+10 points";
    document.body.appendChild(pop);
    requestAnimationFrame(function () { pop.classList.add("bw-points-pop-show"); });
    setTimeout(function () { pop.remove(); }, 950);
    document.documentElement.dataset.bwLastPoints = "10";
  }
  function fireAnswerConfetti() {
    if (answerConfettiPlayed) return;
    answerConfettiPlayed = true;
    document.documentElement.dataset.bwLastEffect = "answer-confetti";
    confettiEngine(ANSWER_CONFETTI);
  }

  function fireFinalCelebration() {
    const duration = 2 * 1000;
    const end = Date.now() + duration;
    document.documentElement.dataset.bwLastEffect = "final-confetti";

    (function frame() {
      confettiEngine({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
      confettiEngine({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  }

  /* Normalize legacy answer confetti and suppress inconsistent final celebrations. */
  window.confetti = function () {
    if (answering) fireAnswerConfetti();
  };

  window.playSound = function (type) {
    if (type !== "correct" && type !== "wrong") return;
    if (answering && soundPlayed) return;
    soundPlayed = true;
    document.documentElement.dataset.bwLastSound = type;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const gain = audioCtx.createGain();
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    gain.connect(audioCtx.destination);

    if (type === "correct") {
      osc1.type = "square";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime);
      osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.25);
      osc2.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(CORRECT_VOLUME, audioCtx.currentTime);
      gain.gain.setValueAtTime(CORRECT_VOLUME, audioCtx.currentTime + 0.35);
    } else {
      osc1.type = "square";
      osc2.type = "sawtooth";
      osc1.frequency.setValueAtTime(240, audioCtx.currentTime);
      osc2.frequency.setValueAtTime(180, audioCtx.currentTime);
      osc1.frequency.linearRampToValueAtTime(140, audioCtx.currentTime + 0.55);
      osc2.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.55);
      gain.gain.setValueAtTime(WRONG_VOLUME, audioCtx.currentTime);
      gain.gain.setValueAtTime(WRONG_VOLUME, audioCtx.currentTime + 0.35);
    }

    osc1.connect(gain);
    osc2.connect(gain);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.60);
    osc1.start(audioCtx.currentTime);
    osc2.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.60);
    osc2.stop(audioCtx.currentTime + 0.60);
    setTimeout(function () { audioCtx.close().catch(function () {}); }, 750);
  };

  function shakeQuiz() {
    const quiz = document.getElementById("quiz");
    if (!quiz) return;
    quiz.classList.remove("shake-animation");
    void quiz.offsetWidth;
    quiz.classList.add("shake-animation");
    document.documentElement.dataset.bwLastEffect = "wrong-shake";
    setTimeout(function () { quiz.classList.remove("shake-animation"); }, 400);
  }

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".answer")) return;
    answering = true;
    soundPlayed = false;
    answerConfettiPlayed = false;
  }, true);

  document.addEventListener("click", function (event) {
    const answer = event.target.closest(".answer");
    if (!answer) return;

    if (answer.classList.contains("correct")) {
      if (!soundPlayed) window.playSound("correct");
      showPointsAnimation();
      fireAnswerConfetti();
    } else if (answer.classList.contains("wrong")) {
      if (!soundPlayed) window.playSound("wrong");
      shakeQuiz();
    }

    answering = false;
  });

  function quizStorageKey(value) {
    try {
      const url = new URL(value, window.location.href);
      const pathname = decodeURIComponent(url.pathname).replace(/\\/g, "/").replace(/\/+/, "/").toLowerCase();
      return pathname + decodeURIComponent(url.search).toLowerCase();
    } catch (error) {
      return String(value || "").toLowerCase();
    }
  }

  function saveQuizPoints(score, total) {
    if (!Number.isFinite(score) || !Number.isFinite(total)) return;
    try {
      const saved = JSON.parse(localStorage.getItem(POINTS_STORAGE_KEY) || "{}") || {};
      saved[quizStorageKey(window.location.href)] = Math.max(0, Math.min(total * 10, score * 10));
      localStorage.setItem(POINTS_STORAGE_KEY, JSON.stringify(saved));
    } catch (error) {}
  }
  function installFinalCelebration() {
    const scoreCard = document.getElementById("scoreCard");
    const scoreCircle = document.getElementById("scoreCircle");
    if (!scoreCard || !scoreCircle) return;

    let lastResult = "";
    const check = function () {
      const visible = getComputedStyle(scoreCard).display !== "none" && scoreCard.getClientRects().length > 0;
      if (!visible) {
        lastResult = "";
        return;
      }

      const match = scoreCircle.textContent.match(/(\d+)\s*\/\s*(\d+)/);
      if (!match) return;
      const result = `${match[1]}/${match[2]}`;
      if (result === lastResult) return;
      lastResult = result;
      saveQuizPoints(Number(match[1]), Number(match[2]));

      if (Number(match[1]) >= 8) fireFinalCelebration();
    };

    new MutationObserver(check).observe(scoreCard, { attributes: true, childList: true, subtree: true });
    check();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installFinalCelebration);
  } else {
    installFinalCelebration();
  }

  window.BuhoWiseQuizEffects = {
    version: "2.1",
    pointsAnimation: showPointsAnimation,
    answerConfetti: fireAnswerConfetti,
    finalCelebration: fireFinalCelebration,
    shake: shakeQuiz
  };
}());
