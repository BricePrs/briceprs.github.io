const nbrOfTry = 7;
const randomRange = 128;

var randomNbr;
var nbrOfTryLeft = nbrOfTry;

var game_over = false;

// Setting  variables
randomNbr = getRandomNumber();

// Display set up
let gameDiv = document.getElementById("Game");

const _header = document.createElement("h1");
_header.textContent = "Let's play a little game !";
gameDiv.appendChild(_header);

const rules = document.createElement("p");
rules.textContent = `This is quite simple: guess the number between 0 and ${randomRange-1}.`;
gameDiv.appendChild(rules);

const displayNbrOfTry = document.createElement("p");
displayNbrOfTry.textContent = `You have ${nbrOfTry} tries left.`;
gameDiv.appendChild(displayNbrOfTry);


const player_input = document.createElement("div");

const player_input_label = document.createElement("span");
player_input_label.textContent = "Enter a number : ";
const player_input_text_area = document.createElement("input");
const player_input_validate = document.createElement("button");
player_input_validate.textContent = "Validate";
player_input_validate.addEventListener("click", answer_callback);

player_input.appendChild(player_input_label);
player_input.appendChild(player_input_text_area);
player_input.appendChild(player_input_validate);

gameDiv.appendChild(player_input);

const additional_info = document.createElement("p");
additional_info.textContent = " ";

gameDiv.appendChild(additional_info);

function answer_callback() {
    if (game_over) {
        return;
    }
    const answer = player_input_text_area.value;
    nbrOfTryLeft -= 1;
    displayNbrOfTry.textContent = `You have ${nbrOfTryLeft} tries left.`;

    if (answer < randomNbr) {
        additional_info.textContent = `The secret number is greater than ${answer}.`;
    }
    if (answer === randomNbr.toString()) {
        additional_info.textContent = `You found it ! The number was ${randomNbr}.`;
        game_over = true;
    }
    if (answer > randomNbr) {
        additional_info.textContent = `The secret number is less than ${answer}.`;
    }
    if (nbrOfTryLeft === 0) {
        additional_info.textContent = `Game over! The secret number was ${randomNbr}.`;
        game_over = true;
    }

}

function getRandomNumber() {
    return Math.floor(Math.random()*randomRange);
}
