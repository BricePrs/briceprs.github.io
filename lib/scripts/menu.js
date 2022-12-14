
function unbindAnimation() {
    const nav_list_icon = document.getElementById("nav-list");
    nav_list_icon.style.animation = "";
}

function onClickEvent() {
    const nav = document.getElementById("nav");
    const nav_list_icon = document.getElementById("nav-list");
    let menu_state = nav.getAttribute("state");
    if (menu_state === "shown") {
        nav.setAttribute("state", "hidden");
    } else {
        nav.setAttribute("state", "shown");
    }
    nav_list_icon.style.animation = "a_scale 0.14s linear";
    window.setTimeout(unbindAnimation, 140);

    console.log("Menu is " + menu_state);
}

const nav_list_icon = document.getElementById("nav-list");
nav_list_icon.addEventListener("click", onClickEvent);

