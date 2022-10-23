
function unbindAnimation() {
    const nav_list_icon = document.getElementById("nav-list");
    nav_list_icon.style.animation = "";
}

function onClickEvent() {
    const nav = document.getElementById("nav");
    const nav_list_icon = document.getElementById("nav-list");
    let menu_state = nav.getAttribute("state");
    if (menu_state === "hidden") {
        nav.setAttribute("state", "shown");
    } else {
        nav.setAttribute("state", "hidden");
    }
    nav_list_icon.style.animation = "a_scale 0.3s linear";
    window.setTimeout(unbindAnimation, 300);

    console.log("Menu is " + menu_state);
}

const nav_list_icon = document.getElementById("nav-list");
nav_list_icon.addEventListener("click", onClickEvent);

