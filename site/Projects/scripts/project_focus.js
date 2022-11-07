

const projects = document.getElementsByClassName("project");
const main = document.getElementsByTagName("main")[0];
const header = document.getElementById("top-bar");

let current_focus = null;
let date = new Date();
let focus_time = date.getTime()

function onClickEvent(event) {
    let project = event.target.closest(".project");
    let state = project.getAttribute("state");
    console.log(project.clientTop);
    unfocus_current()

    if (state === "unfocused") {
        current_focus = project;
        date = new Date();
        focus_time = date.getTime()

        project.setAttribute("state", "focused")
        window.scrollBy({
            top: project.getBoundingClientRect().top - header.offsetHeight,
            behavior: 'smooth'
        });
        let hide_able_elts = project.getElementsByClassName("hide-able");
        for (let j = 0; j < hide_able_elts.length; j++) {
            hide_able_elts[j].setAttribute("state", "shown");
        }
    }
}

nav_list_icon.addEventListener("click", onClickEvent);

for (let i = 0; i < projects.length; i++) {
    projects[i].addEventListener("click", onClickEvent);
}

document.addEventListener("scroll", scroll_event);

function scroll_event(event) {
    //console.log(current_focus);
    date = new Date();
    if (!current_focus || (date.getTime()-focus_time) < 100) { return; }
    console.log(current_focus.offsetTop, window.scrollY, window.outerHeight, Math.abs(current_focus.offsetTop - window.scrollY + 2.*window.outerHeight/3.));
    if (Math.abs(current_focus.offsetTop - window.scrollY + scroll_offset_unfocus) > window.outerHeight/2.) {
        console.log("oui");
        unfocus_current();
    }
}

function unfocus_current() {
    if (!current_focus) {return;}
    current_focus.setAttribute("state", "unfocused");
    let hide_able_elts = current_focus.getElementsByClassName("hide-able");
    for (let j = 0; j < hide_able_elts.length; j++) {
        hide_able_elts[j].setAttribute("state", "hidden");
    }
    current_focus = null;
}

function unfocus_all() {
    for (let i = 0; i < projects.length; i++) {
        projects[i].setAttribute("state", "unfocused")
        let hide_able_elts = projects[i].getElementsByClassName("hide-able");
        for (let j = 0; j < hide_able_elts.length; j++) {
            hide_able_elts[j].setAttribute("state", "hidden");
        }
    }
}

unfocus_all();

let scroll_offset_unfocus = 0
window.addEventListener("load", () => {
    if (isMobile) {
        scroll_offset_unfocus = 0;
    }
    else {
        scroll_offset_unfocus = 2.*window.outerHeight/3.;
    }
});
