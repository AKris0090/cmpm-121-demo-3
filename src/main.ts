// todo
const button = document.createElement("button");
button.innerHTML = "Click me";

document.body.appendChild(button);

button.onclick = () => {
  alert("you clicked the button!");
};
