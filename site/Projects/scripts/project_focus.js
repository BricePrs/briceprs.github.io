(function () {
    "use strict";

    const projects = document.getElementsByClassName("project");
    const header = document.getElementById("top-bar");
    const navListIcon = document.getElementById("nav-list");

    let current_focus = null;
    let focus_time = Date.now();
    let scroll_offset_unfocus = 0;

    function unfocus_current() {
        if (!current_focus) return;
        current_focus.setAttribute("state", "unfocused");
        const hide_able_elts = current_focus.getElementsByClassName("hide-able");
        for (let j = 0; j < hide_able_elts.length; j++) {
            hide_able_elts[j].setAttribute("state", "hidden");
        }
        current_focus = null;
    }

    function unfocus_all() {
        for (let i = 0; i < projects.length; i++) {
            projects[i].setAttribute("state", "unfocused");
            const hide_able_elts = projects[i].getElementsByClassName("hide-able");
            for (let j = 0; j < hide_able_elts.length; j++) {
                hide_able_elts[j].setAttribute("state", "hidden");
            }
        }
    }

    function scroll_event() {
        if (!current_focus || (Date.now() - focus_time) < 100) return;
        if (Math.abs(current_focus.offsetTop - window.scrollY + scroll_offset_unfocus) > window.outerHeight / 2.) {
            unfocus_current();
        }
    }

    if (navListIcon) {
        navListIcon.addEventListener("click", function () {
            unfocus_current();
        });
    }
    document.addEventListener("scroll", scroll_event);

    unfocus_all();

    window.addEventListener("load", () => {
        const mobile = !!window.siteIsMobile;
        scroll_offset_unfocus = mobile ? 0 : 2. * window.outerHeight / 3.;
    });

    // ===== Image carousels =====
    const wrappers = document.querySelectorAll(".slider-wrapper");
    wrappers.forEach(initCarousel);

    function initCarousel(wrapper) {
        const container = wrapper.querySelector(".slides-container");
        const slides = container ? Array.from(container.children) : [];
        const prev = wrapper.querySelector(".slide-arrow-prev");
        const next = wrapper.querySelector(".slide-arrow-next");

        if (!container || slides.length === 0) return;

        // Hide controls entirely if there is only one image
        if (slides.length <= 1) {
            wrapper.setAttribute("data-single", "");
            return;
        }

        // Build dot indicators
        const dotsContainer = document.createElement("div");
        dotsContainer.className = "slide-dots";
        dotsContainer.setAttribute("role", "tablist");
        slides.forEach((_, idx) => {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "slide-dot";
            dot.setAttribute("role", "tab");
            dot.setAttribute("aria-label", `Go to image ${idx + 1} of ${slides.length}`);
            dot.addEventListener("click", () => goTo(idx));
            dotsContainer.appendChild(dot);
        });
        wrapper.appendChild(dotsContainer);
        const dots = Array.from(dotsContainer.children);

        // Counter "n / total"
        const counter = document.createElement("div");
        counter.className = "slide-counter";
        counter.setAttribute("aria-hidden", "true");
        wrapper.appendChild(counter);

        let currentIndex = 0;
        let userScrolling = false;
        let scrollEndTimer = null;

        function goTo(index, smooth = true) {
            const n = slides.length;
            currentIndex = ((index % n) + n) % n;
            container.scrollTo({
                left: currentIndex * container.clientWidth,
                behavior: smooth ? "smooth" : "auto",
            });
            updateUI();
        }

        function updateUI() {
            dots.forEach((dot, i) => {
                const active = i === currentIndex;
                dot.classList.toggle("is-active", active);
                dot.setAttribute("aria-selected", active ? "true" : "false");
            });
            counter.textContent = `${currentIndex + 1} / ${slides.length}`;
        }

        prev.setAttribute("type", "button");
        next.setAttribute("type", "button");
        prev.addEventListener("click", () => goTo(currentIndex - 1));
        next.addEventListener("click", () => goTo(currentIndex + 1));

        // Sync index when the user scrolls (touch swipe, trackpad)
        container.addEventListener("scroll", () => {
            userScrolling = true;
            clearTimeout(scrollEndTimer);
            scrollEndTimer = setTimeout(() => {
                userScrolling = false;
                const w = container.clientWidth;
                if (w <= 0) return;
                const newIndex = Math.round(container.scrollLeft / w);
                if (newIndex !== currentIndex && newIndex >= 0 && newIndex < slides.length) {
                    currentIndex = newIndex;
                    updateUI();
                }
            }, 90);
        }, { passive: true });

        // Keyboard navigation when carousel has focus
        wrapper.tabIndex = 0;
        wrapper.addEventListener("keydown", (e) => {
            if (e.key === "ArrowLeft")       { goTo(currentIndex - 1); e.preventDefault(); }
            else if (e.key === "ArrowRight") { goTo(currentIndex + 1); e.preventDefault(); }
            else if (e.key === "Home")       { goTo(0);                e.preventDefault(); }
            else if (e.key === "End")        { goTo(slides.length - 1);e.preventDefault(); }
        });

        // On resize the slide width changes — snap back to current slide without animation
        let resizeTimer;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (!userScrolling) goTo(currentIndex, false);
            }, 100);
        });

        // First image might decode after init — re-snap once it does so layout settles
        const firstImg = slides[0].querySelector("img");
        if (firstImg && !firstImg.complete) {
            firstImg.addEventListener("load", () => goTo(currentIndex, false), { once: true });
        }

        updateUI();
    }
})();
