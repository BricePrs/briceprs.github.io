
function unbindAnimation() {
    const nav_list_icon = document.getElementById("nav-list");
    nav_list_icon.style.animation = "";
}

function onClickEvent() {
    const header = document.getElementsByTagName("header");
    const nav = document.getElementById("nav");
    const nav_list_icon = document.getElementById("nav-list");
    let menu_state = nav.getAttribute("state");
    if (menu_state === "shown") {
        nav.setAttribute("state", "hidden");
        nav.setAttribute("style","height:0");
    } else {
        nav.setAttribute("state", "shown");
        nav.setAttribute("style","height:100");

    }
    nav_list_icon.style.animation = "a_scale 0.14s linear";
    window.setTimeout(unbindAnimation, 140);

    console.log("Menu is " + menu_state);
}

const nav_list_icon = document.getElementById("nav-list");
nav_list_icon.addEventListener("click", onClickEvent);

const nav = document.getElementById("nav");
let menu_state = nav.getAttribute("state");
if (menu_state === "shown") {
    nav.setAttribute("style", "height:0");
}

