let socket = io();

let foodList = [];
let userList = [];
let virusList = [];
let massFoodList = [];
let board = [];

let playerUser = null;

let xOffset = 0;
let yOffset = 0;

let prevX = 0;
let prevY = 0;

let mapX = -1;
let mapY = -1;

let target = null;

let isPlay = false;

function playStart()
{
    let name = document.getElementById("name").value;
    socket.emit("Start", name);
}

function disconnected()
{
    document.getElementById("Input").innerHTML = 
    `
    <input type="text" id = "name">
        <br>
        <button onclick="playStart()">게임 참가!</button>
    `;
}

socket.on("init", function(player){
    playerUser = player;

});

socket.on("Update", function(visibleFood, u, m, v, uList, leaderboard, X, Y){
    // console.log(visibleFood);
    foodList = visibleFood;
    playerUser = u;
    massFoodList = m;
    virusList = v;
    xOffset = prevX - u.x;
    yOffset = prevY - u.y;
    prevX = u.x;
    prevY = u.y;
    userList = uList;
    board = leaderboard;
    if(X != null && Y != null)
    {
        mapX = X;
        mapY = Y;
    }
    else
    {
        mapX = screenX;
        mapY = screenY;
    }
});

socket.on("ReadyToShow", function(){
    document.getElementById("Input").innerHTML = "";
    isPlay = true;
    console.log(socket);
    loop();
});

socket.on("disconnect", function(){
    console.log("disconnected");
    disconnected();
});

socket.on("die", function(){
    console.log("die");
    disconnected();
})