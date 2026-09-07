(function () {
  'use strict';

  const STORAGE_KEY = 'buhowiseSelectedAvatar';
  const scriptUrl = document.currentScript && document.currentScript.src
    ? document.currentScript.src
    : new URL('buhowise-avatar.js', window.location.href).href;
  const siteRoot = new URL('.', scriptUrl);

  const uiCopy = {
    en: {
      title: 'Choose your avatar',
      introduction: 'Pick the BuhoWise guide that will join you on your learning journey.',
      accessibility: 'Accessibility tools',
      close: 'Continue without changing',
      profile: 'My Profile',
      myAvatar: 'My Avatar',
      chooseAvatar: 'Choose Avatar',
      currentAvatar: 'Change avatar. Current avatar: '
    },
    es: {
      title: 'Elige tu avatar',
      introduction: 'Elige al guía de BuhoWise que te acompañará en tu aprendizaje.',
      accessibility: 'Herramientas de accesibilidad',
      close: 'Continuar sin cambiar',
      profile: 'Mi perfil',
      myAvatar: 'Mi avatar',
      chooseAvatar: 'Elegir avatar',
      currentAvatar: 'Cambiar avatar. Avatar actual: '
    }
  };

  const avatars = [
    ['classic', 'Classic', 'avatar-01-classic.png', 'A friendly owl holding a pencil, ready to learn with you.', 'Clásico', 'Un búho amigable que sostiene un lápiz, listo para aprender contigo.'],
    ['mathematics', 'Mathematics', 'avatar-02-mathematics.png', 'A clever owl with glasses, a calculator, and a geometry tool.', 'Matemáticas', 'Un búho ingenioso con lentes, una calculadora y una herramienta de geometría.'],
    ['reading', 'Reading', 'avatar-03-reading.png', 'A calm owl enjoying an open purple book.', 'Lectura', 'Un búho tranquilo que disfruta de un libro morado abierto.'],
    ['science', 'Science', 'avatar-04-science.png', 'A curious owl wearing safety glasses and holding a green flask.', 'Ciencia', 'Un búho curioso con gafas de seguridad y un matraz verde.'],
    ['technology', 'Technology', 'avatar-05-technology.png', 'A modern owl wearing headphones and holding a tablet.', 'Tecnología', 'Un búho moderno con audífonos y una tableta.'],
    ['artist', 'Artist', 'avatar-06-artist.png', 'A creative owl with a purple beret, paintbrush, and colorful palette.', 'Artista', 'Un búho creativo con boina morada, pincel y paleta de colores.'],
    ['explorer', 'Explorer', 'avatar-07-explorer.png', 'An adventurous owl with a safari hat, magnifying glass, and map.', 'Explorador', 'Un búho aventurero con sombrero de safari, lupa y mapa.'],
    ['sports', 'Sports', 'avatar-08-sports.png', 'An energetic owl with a headband, trophy, and basketball.', 'Deportes', 'Un búho enérgico con cinta deportiva, trofeo y balón de baloncesto.']
  ].map(function (avatar) {
    return {
      id: avatar[0],
      name: avatar[1],
      src: new URL('avatars/' + avatar[2], siteRoot).href,
      description: avatar[3],
      nameEs: avatar[4],
      descriptionEs: avatar[5]
    };
  });

  let overlay;
  let lastFocusedElement;

  function getLanguage() {
    return document.documentElement.lang.toLowerCase().startsWith('es') ? 'es' : 'en';
  }

  function getAvatarText(avatar, language) {
    return language === 'es'
      ? { name: avatar.nameEs, description: avatar.descriptionEs }
      : { name: avatar.name, description: avatar.description };
  }

  function getSavedAvatar() {
    const savedId = localStorage.getItem(STORAGE_KEY);
    return avatars.find(function (avatar) { return avatar.id === savedId; }) || null;
  }

  function buildSelector() {
    overlay = document.createElement('div');
    overlay.className = 'bw-avatar-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('translate', 'no');
    overlay.dataset.bwTranslationIgnore = 'true';
    overlay.innerHTML = '<section class="bw-avatar-dialog" role="dialog" aria-modal="true" aria-labelledby="bwAvatarTitle">' +
      '<div class="bw-avatar-heading"><h2 id="bwAvatarTitle">Choose your avatar</h2>' +
      '<p class="bw-avatar-introduction">Pick the BuhoWise guide that will join you on your learning journey.</p>' +
      '<button class="bw-avatar-accessibility" type="button" data-bw-accessibility="toggle-panel"><i class="bi bi-universal-access" aria-hidden="true"></i> Accessibility tools</button></div>' +
      '<div class="bw-avatar-grid">' + avatars.map(function (avatar) {
        return '<button class="bw-avatar-option" type="button" data-avatar-id="' + avatar.id + '" aria-pressed="false" aria-describedby="bwAvatarDescription-' + avatar.id + '">' +
          '<img src="' + avatar.src + '" alt="' + avatar.description + '"><span class="bw-avatar-name">' + avatar.name + '</span><span class="bw-avatar-description" id="bwAvatarDescription-' + avatar.id + '">' + avatar.description + '</span></button>';
      }).join('') + '</div>' +
      '<div class="bw-avatar-actions"><button class="bw-avatar-close" type="button">Continue without changing</button></div>' +
      '</section>';
    document.body.appendChild(overlay);
    updateAvatarLanguage();

    overlay.querySelectorAll('.bw-avatar-option').forEach(function (button) {
      button.addEventListener('click', function () {
        saveAvatar(button.dataset.avatarId);
        closeSelector();
      });
    });
    overlay.querySelector('.bw-avatar-close').addEventListener('click', closeSelector);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeSelector();
    });
    overlay.addEventListener('keydown', handleDialogKeys);
  }

  function updateAvatarLanguage() {
    const language = getLanguage();
    const copy = uiCopy[language];

    if (overlay) {
      overlay.querySelector('#bwAvatarTitle').textContent = copy.title;
      overlay.querySelector('.bw-avatar-introduction').textContent = copy.introduction;
      overlay.querySelector('.bw-avatar-accessibility').innerHTML =
        '<i class="bi bi-universal-access" aria-hidden="true"></i> ' + copy.accessibility;
      overlay.querySelector('.bw-avatar-close').textContent = copy.close;

      overlay.querySelectorAll('.bw-avatar-option').forEach(function (button) {
        const avatar = avatars.find(function (item) { return item.id === button.dataset.avatarId; });
        if (!avatar) return;
        const localized = getAvatarText(avatar, language);
        button.querySelector('img').alt = localized.description;
        button.querySelector('.bw-avatar-name').textContent = localized.name;
        button.querySelector('.bw-avatar-description').textContent = localized.description;
      });
    }

    updateMenuAvatar();
  }

  function handleDialogKeys(event) {
    if (event.key === 'Escape') closeSelector();
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
    updateAvatarLanguage();
    lastFocusedElement = document.activeElement;
    const saved = getSavedAvatar();
    overlay.querySelectorAll('.bw-avatar-option').forEach(function (button) {
      button.setAttribute('aria-pressed', String(Boolean(saved && saved.id === button.dataset.avatarId)));
    });
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('bw-avatar-modal-open');
    window.setTimeout(function () {
      const selected = overlay.querySelector('[aria-pressed="true"]');
      (selected || overlay.querySelector('.bw-avatar-option')).focus();
    }, 50);
  }

  function closeSelector() {
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
    const localized = getAvatarText(avatar, getLanguage());
    window.dispatchEvent(new CustomEvent('buhowise:avatar-changed', {
      detail: Object.assign({}, avatar, localized)
    }));
  }

  function updateMenuAvatar() {
    const accountButton = document.querySelector('.btn-nav-account');
    if (!accountButton) return;
    const language = getLanguage();
    const copy = uiCopy[language];
    const accountItem = accountButton.closest('.nav-item');
    if (accountItem && !document.querySelector('.bw-profile-nav-item')) {
      const profileItem = document.createElement('li');
      profileItem.className = 'nav-item bw-profile-nav-item';
      profileItem.innerHTML = '<a class="nav-link" href="' + new URL('profile.html', siteRoot).href + '"><i class="bi bi-person-circle me-1" aria-hidden="true"></i><span class="bw-profile-label"></span></a>';
      const changeRoleItem = document.querySelector('.bw-change-role')?.closest('.nav-item');
      accountItem.parentNode.insertBefore(profileItem, changeRoleItem || accountItem);
    }
    const profileLabel = document.querySelector('.bw-profile-label');
    if (profileLabel) profileLabel.textContent = copy.profile;
    const saved = getSavedAvatar();
    accountButton.removeAttribute('onclick');
    accountButton.setAttribute('href', '#');
    if (saved) {
      const localized = getAvatarText(saved, language);
      accountButton.classList.add('bw-avatar-trigger');
      accountButton.setAttribute('aria-label', copy.currentAvatar + localized.name);
      accountButton.innerHTML = '<img src="' + saved.src + '" alt=""><span>' + copy.myAvatar + '</span>';
    } else {
      accountButton.classList.remove('bw-avatar-trigger');
      accountButton.removeAttribute('aria-label');
      accountButton.textContent = copy.chooseAvatar;
    }
    accountButton.onclick = function (event) {
      event.preventDefault();
      openSelector();
    };
  }

  function initialize() {
    buildSelector();
    updateMenuAvatar();
  }

  window.BuhoWiseAvatar = { open: openSelector, selected: getSavedAvatar };
  document.addEventListener('buhowise:language-change', updateAvatarLanguage);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
