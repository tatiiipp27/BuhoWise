(function () {
  'use strict';

  const STORAGE_KEY = 'buhowiseSelectedAvatar';
  const scriptUrl = document.currentScript && document.currentScript.src
    ? document.currentScript.src
    : new URL('buhowise-avatar.js', window.location.href).href;
  const siteRoot = new URL('.', scriptUrl);
  const avatars = [
    ['classic', 'Classic', 'avatar-01-classic.png'],
    ['mathematics', 'Mathematics', 'avatar-02-mathematics.png'],
    ['reading', 'Reading', 'avatar-03-reading.png'],
    ['science', 'Science', 'avatar-04-science.png'],
    ['technology', 'Technology', 'avatar-05-technology.png'],
    ['artist', 'Artist', 'avatar-06-artist.png'],
    ['explorer', 'Explorer', 'avatar-07-explorer.png'],
    ['sports', 'Sports', 'avatar-08-sports.png']
  ].map(function (avatar) {
    return { id: avatar[0], name: avatar[1], src: new URL('avatars/' + avatar[2], siteRoot).href };
  });

  let overlay;
  let lastFocusedElement;

  function getSavedAvatar() {
    const savedId = localStorage.getItem(STORAGE_KEY);
    return avatars.find(function (avatar) { return avatar.id === savedId; }) || null;
  }

  function buildSelector() {
    overlay = document.createElement('div');
    overlay.className = 'bw-avatar-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<section class="bw-avatar-dialog" role="dialog" aria-modal="true" aria-labelledby="bwAvatarTitle">' +
      '<div class="bw-avatar-heading"><h2 id="bwAvatarTitle">Choose your avatar</h2>' +
      '<p>Pick the BuhoWise guide that will join you on your learning journey.</p></div>' +
      '<div class="bw-avatar-grid">' + avatars.map(function (avatar) {
        return '<button class="bw-avatar-option" type="button" data-avatar-id="' + avatar.id + '" aria-pressed="false">' +
          '<img src="' + avatar.src + '" alt="' + avatar.name + ' owl avatar"><span>' + avatar.name + '</span></button>';
      }).join('') + '</div>' +
      '<div class="bw-avatar-actions"><button class="bw-avatar-close" type="button">Keep my current avatar</button></div>' +
      '</section>';
    document.body.appendChild(overlay);

    overlay.querySelectorAll('.bw-avatar-option').forEach(function (button) {
      button.addEventListener('click', function () {
        saveAvatar(button.dataset.avatarId);
        closeSelector();
      });
    });
    overlay.querySelector('.bw-avatar-close').addEventListener('click', closeSelector);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay && getSavedAvatar()) closeSelector();
    });
    overlay.addEventListener('keydown', handleDialogKeys);
  }

  function handleDialogKeys(event) {
    if (event.key === 'Escape' && getSavedAvatar()) closeSelector();
    if (event.key !== 'Tab') return;
    const controls = Array.from(overlay.querySelectorAll('button:not([disabled])'));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openSelector() {
    if (!overlay) buildSelector();
    lastFocusedElement = document.activeElement;
    const saved = getSavedAvatar();
    overlay.querySelectorAll('.bw-avatar-option').forEach(function (button) {
      button.setAttribute('aria-pressed', String(Boolean(saved && saved.id === button.dataset.avatarId)));
    });
    const closeButton = overlay.querySelector('.bw-avatar-close');
    closeButton.hidden = !saved;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('bw-avatar-modal-open');
    window.setTimeout(function () {
      const selected = overlay.querySelector('[aria-pressed="true"]');
      (selected || overlay.querySelector('.bw-avatar-option')).focus();
    }, 50);
  }

  function closeSelector() {
    if (!getSavedAvatar()) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('bw-avatar-modal-open');
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
  }

  function saveAvatar(id) {
    const avatar = avatars.find(function (item) { return item.id === id; });
    if (!avatar) return;
    localStorage.setItem(STORAGE_KEY, avatar.id);
    updateMenuAvatar();
    window.dispatchEvent(new CustomEvent('buhowise:avatar-changed', { detail: avatar }));
  }

  function updateMenuAvatar() {
    const accountButton = document.querySelector('.btn-nav-account');
    if (!accountButton) return;
    const accountItem = accountButton.closest('.nav-item');
    if (accountItem && !document.querySelector('.bw-profile-nav-item')) {
      const profileItem = document.createElement('li');
      profileItem.className = 'nav-item bw-profile-nav-item';
      profileItem.innerHTML = '<a class="nav-link" href="' + new URL('profile.html', siteRoot).href + '"><i class="bi bi-person-circle me-1"></i>My Profile</a>';
      accountItem.parentNode.insertBefore(profileItem, accountItem);
    }
    const saved = getSavedAvatar();
    accountButton.removeAttribute('onclick');
    accountButton.setAttribute('href', '#');
    if (saved) {
      accountButton.classList.add('bw-avatar-trigger');
      accountButton.setAttribute('aria-label', 'Change avatar. Current avatar: ' + saved.name);
      accountButton.innerHTML = '<img src="' + saved.src + '" alt=""><span>My Avatar</span>';
    } else {
      accountButton.classList.remove('bw-avatar-trigger');
      accountButton.removeAttribute('aria-label');
      accountButton.textContent = 'Choose Avatar';
    }
    accountButton.onclick = function (event) {
      event.preventDefault();
      openSelector();
    };
  }

  function initialize() {
    buildSelector();
    updateMenuAvatar();
    if (!getSavedAvatar()) openSelector();
  }

  window.BuhoWiseAvatar = { open: openSelector, selected: getSavedAvatar };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
