

const projects = document.getElementsByClassName("project");

function onClickEvent(event) {
    let project = event.target.closest(".project");
    let state = project.getAttribute("state");
    for (let i = 0; i < projects.length; i++) {
        projects[i].setAttribute("state", "unfocused")
    }
    if (state === "unfocused") {
        project.setAttribute("state", "focused")
    }
}

nav_list_icon.addEventListener("click", onClickEvent);

for (let i = 0; i < projects.length; i++) {
    projects[i].addEventListener("click", onClickEvent);
}




