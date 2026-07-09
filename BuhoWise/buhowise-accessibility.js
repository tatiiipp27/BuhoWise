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
        panel.style.display = panel.style.display === "block" ? "none" : "block";
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
            }
        });
        syncFromBody();
        applyState();
    });
})();
