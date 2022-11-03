

const projects = document.getElementsByClassName("project");
const main = document.getElementsByTagName("main")[0];
const header = document.getElementById("top-bar");

function onClickEvent(event) {
    let project = event.target.closest(".project");
    let state = project.getAttribute("state");
    unfocus_all();
    if (state === "unfocused") {
        project.setAttribute("state", "focused")
        window.scrollBy({
            top: +project.getBoundingClientRect().top - header.offsetHeight*1.2,
            behavior: 'smooth'
        });
    }
}

nav_list_icon.addEventListener("click", onClickEvent);

for (let i = 0; i < projects.length; i++) {
    projects[i].addEventListener("click", onClickEvent);
}

if(document.addEventListener){
      document.addEventListener('wheel',mouseScroll,false);
 }


function mouseScroll(e) {
    unfocus_all();
}

function unfocus_all() {
    for (let i = 0; i < projects.length; i++) {
        projects[i].setAttribute("state", "unfocused")
    }
}