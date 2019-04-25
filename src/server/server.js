let express = require("express");
let app = express();
let http = require("http").Server(app);
let io = require("socket.io")(http);
let SAT = require("sat");

let userList = [];
let playerList = [];
let massFoodList = [];
let foodList = [];
let virusList = [];
let sockets = [];

let maxFood = 400;
let maxVirus = 5;

let mapX;
let mapY;

let V = SAT.Vector;
let C = SAT.Circle;

let defaultFoodMass = 1;
let defaultPlayerMass = 1;

app.use(express.static(__dirname + '/../client'));

function massToRadius(mass)
{
    return 4 + Math.sqrt(mass) * 6;
}

function init()
{
    mapX = 640;
    mapY = 0;
    for(let i = 0; i < maxFood; i++)
    {
        addFood();
    }
}

function addFood()
{
    let x = Math.random() * mapX + 1;
    let y = Math.random() * mapY + 1;
    let radius = massToRadius(defaultFoodMass);

    foodList.push({
        id: ((new Date()).getTime() + "" + Math.random()) >>> 0,
        x: x,
        y: y,
        radius : radius,
        mass: defaultFoodMass,
        hue: {
            r : Math.random() * 255,
            g : Math.random() * 255,
            b : Math.random() * 255
        }  
    });
}

function addPlayer(socket, player)
{
    
    let x = Math.random() * mapX + 1;
    let y = Math.random() * mapY + 1;
    let radius = massToRadius(defaultPlayerMass);
    let cells = [];

    cells = [{
        mass: defaultPlayerMass,
        x: x,
        y: y,
        hue: {
            r : Math.random() * 255,
            g : Math.random() * 255,
            b : Math.random() * 255
        },
        radius : radius
    }];
    player.cells = cells;
    player.x = cells[0].x;
    player.y = cells[0].y;
    

    
    playerList.push(player);
    sockets[socket.id] = socket;
}

function sendUpdates()
{
    playerList.forEach( function(u) {
        // center the view if x/y is undefined, this will happen for spectators
        u.x = u.x;
        u.y = u.y;

        let visibleFood  = foodList
            .map(function(f) {
                if ( f.x > u.x - u.width/2 - 20 &&
                    f.x < u.x + u.width/2 + 20 &&
                    f.y > u.y - u.height/2 - 20 &&
                    f.y < u.y + u.height/2 + 20) {
                    return f;
                }
            })
            .filter(function(f) { return f; });

        // let visibleVirus  = virusList
        //     .map(function(f) {
        //         if ( f.x > u.x - u.screenWidth/2 - f.radius &&
        //             f.x < u.x + u.screenWidth/2 + f.radius &&
        //             f.y > u.y - u.screenHeight/2 - f.radius &&
        //             f.y < u.y + u.screenHeight/2 + f.radius) {
        //             return f;
        //         }
        //     })
        //     .filter(function(f) { return f; });

        // let visibleMass = massFood
        //     .map(function(f) {
        //         if ( f.x+f.radius > u.x - u.screenWidth/2 - 20 &&
        //             f.x-f.radius < u.x + u.screenWidth/2 + 20 &&
        //             f.y+f.radius > u.y - u.screenHeight/2 - 20 &&
        //             f.y-f.radius < u.y + u.screenHeight/2 + 20) {
        //             return f;
        //         }
        //     })
        //     .filter(function(f) { return f; });

        let visibleCells  = userList
            .map(function(f) {
                for(let z=0; z<f.cells.length; z++)
                {
                    if ( f.cells[z].x+f.cells[z].mass > u.x - u.screenWidth/2 - 20 &&
                        f.cells[z].x-f.cells[z].mass < u.x + u.screenWidth/2 + 20 &&
                        f.cells[z].y+f.cells[z].mass > u.y - u.screenHeight/2 - 20 &&
                        f.cells[z].y-f.cells[z].mass < u.y + u.screenHeight/2 + 20) {
                        z = f.cells.lenth;
                        if(f.id !== u.id) {
                            return {
                                id: f.id,
                                x: f.x,
                                y: f.y,
                                cells: f.cells,
                                massTotal: Math.round(f.massTotal),
                                hue: f.hue,
                                name: f.name
                            };
                        } else {
                            //console.log("Nombre: " + f.name + " Es Usuario");
                            return {
                                x: f.x,
                                y: f.y,
                                cells: f.cells,
                                massTotal: Math.round(f.massTotal),
                                hue: f.hue,
                            };
                        }
                    }
                }
            })
            .filter(function(f) { return f; });

        // sockets[u.id].emit('Update', visibleCells, visibleFood, visibleMass, visibleVirus);
        sockets[u.id].emit('Update', visibleFood, u);
        // if (leaderboardChanged) {
        //     sockets[u.id].emit('leaderboard', {
        //         players: users.length,
        //         leaderboard: leaderboard
        //     });
        // }
    });
}

function tick() {
    // for (let i = 0; i < playerList.length; i++) {
    //     tickPlayer(playerList[i]);
    // }
    // for (i=0; i < massFoodList.length; i++) {
    //     if(massFoodList[i].speed > 0) moveMass(massFoodList[i]);
    // }
    for(let i = 0; i < playerList.length; i++)
    {
        tickPlayer(playerList[i]);
    }
}

function tickPlayer(player)
{
    checkcollision(player);
    movePlayer(player);
    
}

function movePlayer(player)
{
    let x = 0;
    let y = 0;
    for(let i = 0; i < player.cells.length; i++)
    {
        let target = 
        {
            x: player.x - player.cells[i].x + player.target.x,
            y: player.y - player.cells[i].y + player.target.y
        };

        let deg = Math.atan2(target.y, target.x);
        

        let deltaY = Math.sin(deg);
        let deltaX = Math.cos(deg);

        if(player.cells[i].x + deltaX >= mapX)
            player.cells[i].x = mapX;
        if(player.cells[i].x + deltaX <= 0)
            player.cells[i].x = 0;
        if(player.cells[i].y + deltaY >= mapY)
            player.cells[i].y = mapY;
        if(player.cells[i].y + deltaY <= 0)
            player.cells[i].y = 0;

        player.cells[i].x += deltaX;
        player.cells[i].y += deltaY;

        x += player.cells[i].x;
        y += player.cells[i].y;
    }
    player.x = x/player.cells.length;
    player.y = y/player.cells.length;
}

function checkcollision(player)
{
    function funcFood(f)
    {
        return SAT.pointInCircle(new V(f.x, f.y), playerCircle);
    }

    function eatFood(f, index, cell, collisionFoods)
    {
        if(f)
        {
            cell.mass += foodList[index].mass;
            foodList[index] = {};
            foodList.splice(index, 1);
            collisionFoods.splice(index, 1);
        }
    }

    for(let i = 0; i < player.cells.length; i++)
    {
        var playerCircle = new C(
            new V(player.cells[i].x, player.cells[i].y),
            player.cells[i].radius
        );

        //foodList를 순회하며 플레이어와 부딪힌 Food를 찾는다.
        let collisionFoods = [];
        foodList.forEach(food => {
            collisionFoods.push(funcFood(food));
        });
        
        collisionFoods.forEach((collision, index, arr) =>{
            eatFood(collision, index, player.cells[i], arr);
        });
        player.cells[i].radius = massToRadius(player.cells[i].mass);
    }
}




http.listen(3000, function(){
    init();

    console.log("listening on *:3000");
});

io.on("connection", function(socket){
    console.log("a player connected");
    let currentPlayer = {
        id: socket.id,
        type: "player",
        target: {
            x: 0,
            y: 0
        },
        width : 640,
        height : 320,
        x : 0,
        y : 0
    };

    addPlayer(socket, currentPlayer);
    socket.on("disconnect", function(){
        console.log("player disconnected");
    });
    
    socket.on("default", function(target){
        currentPlayer.target = target;
        // console.log(target);
    });
});


setInterval(tick, 1000 / 60);
setInterval(sendUpdates, 1000 / 60);
setInterval(tick, 1000 / 60);