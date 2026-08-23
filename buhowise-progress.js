/* BuhoWise lesson completion: saved locally in the student's browser. */
(function () {
  const STORAGE_KEY = 'buhowiseCompletedLessons';

  function lessonKey(value) {
    try {
      const url = new URL(value, window.location.href);
      return decodeURIComponent(url.pathname).replace(/\\/g, '/').replace(/\/+/, '/').toLowerCase();
    } catch (error) {
      return String(value || '').replace(/\\/g, '/').toLowerCase();
    }
  }

  function readProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return saved && typeof saved === 'object' ? saved : {};
    } catch (error) {
      return {};
    }
  }

  function completeCurrentLesson() {
    const progress = readProgress();
    progress[lessonKey(window.location.href)] = { completed: true, completedAt: new Date().toISOString() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (error) {}
  }

  function watchQuizCompletion() {
    const scoreCard = document.getElementById('scoreCard');
    if (!scoreCard) return;
    let saved = false;
    const check = function () {
      if (saved) return;
      const visible = getComputedStyle(scoreCard).display !== 'none' && scoreCard.getClientRects().length > 0;
      if (visible && scoreCard.textContent.trim()) {
        completeCurrentLesson();
        saved = true;
      }
    };
    new MutationObserver(check).observe(scoreCard, { attributes: true, childList: true, subtree: true });
    check();
  }

  function decoratePath() {
    const progress = readProgress();
    document.querySelectorAll('.lesson-node').forEach(function (node, index) {
      node.dataset.short = `Lesson ${index + 1}`;
      const target = node.dataset.url || node.getAttribute('href');
      if (!target || target.startsWith('#')) return;
      if (progress[lessonKey(target)] && progress[lessonKey(target)].completed) {
        node.classList.add('lesson-completed');
        node.setAttribute('aria-label', `${node.getAttribute('aria-label') || `Lesson ${index + 1}`} - Completed`);
        const icon = node.querySelector('i');
        if (icon) icon.className = 'bi bi-check-lg';
      }
    });
  }

  window.BuhoWiseProgress = { completeCurrentLesson, decoratePath };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { watchQuizCompletion(); decoratePath(); });
  } else {
    watchQuizCompletion(); decoratePath();
  }
})();