let player;

let socket = io();

let foodList = [];
let userList = [];
let virusList = [];
let massFoodList = [];

let playerUser = null;

let xOffset = 0;
let yOffset = 0;

let prevX = 0;
let prevY = 0;

let target = null;

socket.on("Update", function(visibleFood, u, m, uList){
    // console.log(visibleFood);
    foodList = visibleFood;
    playerUser = u;
    massFoodList = m;
    xOffset = prevX - u.x;
    yOffset = prevY - u.y;
    prevX = u.x;
    prevY = u.y;
    userList = uList;
});