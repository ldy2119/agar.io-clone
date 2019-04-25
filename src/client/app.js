let player;

let socket = io();

let foodList = [];
let userList = [];
let virusList = [];
let messFoodList = [];

let playerUser = null;

let target = null;

socket.on("Update", function(visibleFood, u){
    // console.log(visibleFood);
    foodList = visibleFood;
    playerUser = u;
});