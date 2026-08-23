/* Shared BuhoWise quiz sound, based on the Mathematics 7 lesson template. */
(function () {
  const CORRECT_VOLUME = 0.25;
  const WRONG_VOLUME = 0.25;
  if (typeof window.confetti !== 'function') {
    window.confetti = function (options) {
      options = options || {};
      const colors = options.colors || ['#6B4EFF','#24D29B','#FFB84D','#FF5E7E','#00B2FF'];
      const count = Math.min(options.particleCount || 80, 180);
      const layer = document.createElement('div');
      layer.setAttribute('aria-hidden', 'true');
      layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:10000';
      document.body.appendChild(layer);
      for (let i = 0; i < count; i++) {
        const piece = document.createElement('span');
        const left = 15 + Math.random() * 70;
        const delay = Math.random() * 180;
        const duration = 750 + Math.random() * 650;
        piece.style.cssText = `position:absolute;left:${left}%;top:65%;width:${6+Math.random()*7}px;height:${8+Math.random()*9}px;background:${colors[i%colors.length]};border-radius:${Math.random()>.5?'50%':'2px'};transform:translate(-50%,-50%) rotate(${Math.random()*180}deg);opacity:1`;
        layer.appendChild(piece);
        piece.animate([
          { transform: `translate(-50%,-50%) translate(0,0) rotate(0deg)`, opacity: 1 },
          { transform: `translate(-50%,-50%) translate(${(Math.random()-.5)*420}px,${-220-Math.random()*260}px) rotate(${360+Math.random()*540}deg)`, opacity: 1, offset: .55 },
          { transform: `translate(-50%,-50%) translate(${(Math.random()-.5)*520}px,${180+Math.random()*260}px) rotate(${720+Math.random()*540}deg)`, opacity: 0 }
        ], { duration, delay, easing: 'cubic-bezier(.16,.7,.3,1)', fill: 'forwards' });
      }
      setTimeout(() => layer.remove(), 1800);
    };
  }
  window.playSound = function (type) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const gain = audioCtx.createGain();
    gain.connect(audioCtx.destination);
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    if (type === 'correct') {
      osc1.type = 'square'; osc2.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime);
      osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.25);
      osc2.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(CORRECT_VOLUME, audioCtx.currentTime);
      gain.gain.setValueAtTime(CORRECT_VOLUME, audioCtx.currentTime + 0.35);
    } else {
      osc1.type = 'square'; osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(240, audioCtx.currentTime);
      osc2.frequency.setValueAtTime(180, audioCtx.currentTime);
      osc1.frequency.linearRampToValueAtTime(140, audioCtx.currentTime + 0.55);
      osc2.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.55);
      gain.gain.setValueAtTime(WRONG_VOLUME, audioCtx.currentTime);
      gain.gain.setValueAtTime(WRONG_VOLUME, audioCtx.currentTime + 0.35);
    }
    osc1.connect(gain); osc2.connect(gain);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.60);
    osc1.start(audioCtx.currentTime); osc2.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.60); osc2.stop(audioCtx.currentTime + 0.60);
  };
})();