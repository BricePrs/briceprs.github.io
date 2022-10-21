
function createParagraph() {
    const para = document.createElement("p");
    para.textContent = "Salut !";
    document.getElementById("spawner").appendChild(para);
}

const button = document.querySelector("button")
button.addEventListener("click", createParagraph);

