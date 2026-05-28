(function () {
    "use strict";

    const nav = document.getElementById("nav");
    const navListIcon = document.getElementById("nav-list");
    if (!nav || !navListIcon) return;

    function setExpanded(isOpen) {
        nav.setAttribute("state", isOpen ? "shown" : "hidden");
        navListIcon.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    function unbindAnimation() {
        navListIcon.style.animation = "";
    }

    function toggleMenu(forceState) {
        const currentlyOpen = nav.getAttribute("state") === "shown";
        const nextOpen = typeof forceState === "boolean" ? forceState : !currentlyOpen;
        setExpanded(nextOpen);

        navListIcon.style.animation = "a_scale 0.14s linear";
        window.setTimeout(unbindAnimation, 140);
    }

    navListIcon.addEventListener("click", function () {
        toggleMenu();
    });

    // Close menu after clicking a nav link (mobile UX)
    nav.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
            if (window.matchMedia("(max-width: 500px)").matches) {
                setExpanded(false);
            }
        });
    });

    // Close on Escape key
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && nav.getAttribute("state") === "shown") {
            setExpanded(false);
            navListIcon.focus();
        }
    });

    // Close when clicking outside the header on mobile
    document.addEventListener("click", function (e) {
        if (!window.matchMedia("(max-width: 500px)").matches) return;
        if (nav.getAttribute("state") !== "shown") return;
        const header = document.querySelector("header");
        if (header && !header.contains(e.target)) {
            setExpanded(false);
        }
    });

    // Ensure initial state is properly set
    if (nav.getAttribute("state") === "shown") {
        setExpanded(true);
    } else {
        setExpanded(false);
    }
})();
