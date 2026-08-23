(function () {
    const STORAGE_KEY = "buhowiseAccessibility";
    let state = {
        fontSize: 100,
        darkMode: false,
        highContrast: false,
        dyslexia: false
    };

    function loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (saved && typeof saved === "object") {
                state = Object.assign(state, saved);
            }
        } catch (error) {
            state = { fontSize: 100, darkMode: false, highContrast: false, dyslexia: false };
        }
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function applyState() {
        document.body.classList.toggle("dark-mode", !!state.darkMode);
        document.body.classList.toggle("high-contrast", !!state.highContrast);
        document.body.classList.toggle("dyslexia", !!state.dyslexia);
        document.body.style.fontSize = (state.fontSize || 100) + "%";
        const pressedStates = {
            dark: !!state.darkMode,
            contrast: !!state.highContrast,
            dyslexia: !!state.dyslexia
        };
        Object.entries(pressedStates).forEach(function ([action, pressed]) {
            document.querySelectorAll(`[data-bw-accessibility="${action}"]`).forEach(function (button) {
                button.setAttribute("aria-pressed", String(pressed));
            });
        });
    }

    function syncFromBody() {
        state.darkMode = document.body.classList.contains("dark-mode");
        state.highContrast = document.body.classList.contains("high-contrast");
        state.dyslexia = document.body.classList.contains("dyslexia");
        const size = parseInt((document.body.style.fontSize || "100").replace("%", ""), 10);
        state.fontSize = Number.isFinite(size) ? size : 100;
        saveState();
    }

    loadState();

    window.toggleAccessibility = function () {
        const panel = document.getElementById("accessibilityPanel");
        if (!panel) return;
        const open = panel.style.display !== "block";
        panel.style.display = open ? "block" : "none";
        const button = document.querySelector(".accessibility-btn");
        if (button) button.setAttribute("aria-expanded", String(open));
    };

    window.readPage = function () {
        window.speechSynthesis.cancel();
        const main = document.querySelector("main") || document.querySelector(".hero") || document.body;
        const speech = new SpeechSynthesisUtterance(main.innerText || document.body.innerText);
        speech.lang = "en-US";
        window.speechSynthesis.speak(speech);
    };

    window.stopReading = function () {
        window.speechSynthesis.cancel();
    };

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
        window.speechSynthesis.cancel();
        state = { fontSize: 100, darkMode: false, highContrast: false, dyslexia: false };
        applyState();
        saveState();
    };

    const actions = {
        "toggle-panel": function () { window.toggleAccessibility(); },
        read: function () { window.readPage(); },
        stop: function () { window.stopReading(); },
        "text-up": function () { window.increaseText(); },
        "text-down": function () { window.decreaseText(); },
        dark: function () { window.toggleDarkMode(); },
        contrast: function () { window.toggleContrast(); },
        dyslexia: function () { window.toggleDyslexia(); },
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

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applyState);
    } else {
        applyState();
    }

    document.addEventListener("DOMContentLoaded", function () {
        applyState();
        document.addEventListener("click", function (event) {
            const panel = document.getElementById("accessibilityPanel");
            const button = document.querySelector(".accessibility-btn");
            if (panel && button && panel.style.display === "block" && !panel.contains(event.target) && !button.contains(event.target)) {
                panel.style.display = "none";
                button.setAttribute("aria-expanded", "false");
            }
        });
        syncFromBody();
        applyState();
    });
})();
