let express = require("express");
let app = express();
let http = require("http").Server(app);
let io = require("socket.io")(http);
let SAT = require("sat");

let playerList = [];
let massFoodList = [];
let foodList = [];
let virusList = [];
let sockets = [];

let maxFood = 10;
let maxVirus = 5;

let mapX;
let mapY;

let V = SAT.Vector;
let C = SAT.Circle;

let defaultFoodMass = 1;
let defaultPlayerMass = 3;
let defaultMassFoodMass = 3;

let limitSplit = 16;

let defaultMassLog = Math.log(1) / 4;

app.use(express.static(__dirname + '/../client'));

function massToRadius(mass)
{
    return 4 + Math.sqrt(mass) * 6;
}

function init()
{
    mapX = 200;
    mapY = 200;
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
        id: (new Date()).getTime() + "" + Math.random(),
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
        id : player.id,
        count : cells.length,
        mass: defaultPlayerMass,
        x: x,
        y: y,
        hue: {
            r : Math.random() * 255,
            g : Math.random() * 255,
            b : Math.random() * 255
        },
        radius : radius,
        speed : 6
    }];
    player.cells = cells;
    player.x = cells[0].x;
    player.y = cells[0].y;
    
    sockets[socket.id] = socket;
}

function sendUpdates()
{
    playerList.forEach( function(u) {

        u.x = u.x;
        u.y = u.y;

        let visibleFood  = foodList
            .filter(function(f) {
                if ( f.x > u.x - u.width/2 - 20 &&
                    f.x < u.x + u.width/2 + 20 &&
                    f.y > u.y - u.height/2 - 20 &&
                    f.y < u.y + u.height/2 + 20) {
                    return f;
                }
            });

        let visibleMass = massFoodList
            .filter(function(f) {
                if ( f.x+f.radius > u.x - u.width/2 &&
                    f.x-f.radius < u.x + u.width/2&&
                    f.y+f.radius > u.y - u.height/2 &&
                    f.y-f.radius < u.y + u.height/2)
                {
                    return f;
                }
            });
        let visibleCells = playerList
            .map(function (f){
                for(let z = 0; z < f.cells.length; z++)
                {
                    if(f.id != u.id)
                    {
                        if(f.cells[z].x + f.cells[z].mass > u.x - u.width/2 &&
                            f.cells[z].x + f.cells[z].mass < u.x + u.width/2 &&
                            f.cells[z].y + f.cells[z].mass > u.y - u.height/2 &&
                            f.cells[z].y + f.cells[z].mass < u.y + u.height/2)
                         {
                             return {
                                id: f.id,
                                x: f.x,
                                y: f.y,
                                cells: f.cells
                                };
                         }
                    }
                }
            })
            .filter(function (f){return f});

        sockets[u.id].emit('Update', visibleFood, u, visibleMass, visibleCells);
        // if (leaderboardChanged) {
        //     sockets[u.id].emit('leaderboard', {
        //         players: users.length,
        //         leaderboard: leaderboard
        //     });
        // }
    });
}

function tick() {
    for(let i = 0; i < playerList.length; i++)
    {
        tickPlayer(playerList[i]);
    }
    for(let i = 0; i < massFoodList.length; i++)
    {
        moveMass(massFoodList[i]);
    }
}

function tickPlayer(player)
{
    checkcollision(player);
    movePlayer(player);
}

function moveMass(mass)
{
    if(mass.speed == undefined)
        return;
    if(mass.speed <= 0)
        return;
    let target = mass.target;

    let deg = Math.atan2(target.y, target.x);

    let deltaY = mass.speed * Math.sin(deg);
    let deltaX = mass.speed * Math.cos(deg);

    if(mass.x + deltaX >= mapX)
        mass.x = mapX;
    if(mass.x + deltaX <= 0)
        mass.x = 0;
    if(mass.y + deltaY >= mapY)
        mass.y = mapY;
    if(mass.y + deltaY <= 0)
        mass.y = 0;

    mass.x += deltaX;
    mass.y += deltaY;
    mass.speed -= 0.5;

}

function movePlayer(player)
{
    let x = 0;
    let y = 0;
    if(player.splitTime >= 0)
        player.splitTime -= 1000/60;
    for(let i = 0; i < player.cells.length; i++)
    {
        let target = 
        {
            x: player.x - player.cells[i].x + player.target.x,
            y: player.y - player.cells[i].y + player.target.y
        };

        if(player.cells[i].speed > 6)
            player.cells[i].speed -= 0.5;

        let deg = Math.atan2(target.y, target.x);

        let slowdown = 1;
        slowdown = Math.log(player.cells[i].mass) / 2 - defaultMassLog + 1;
        

        let deltaY = player.cells[i].speed * Math.sin(deg) / slowdown;
        let deltaX = player.cells[i].speed * Math.cos(deg) / slowdown;

        if(player.cells[i].x + deltaX >= mapX)
            player.cells[i].x = mapX;
        if(player.cells[i].x + deltaX <= 0)
            player.cells[i].x = 0;
        if(player.cells[i].y + deltaY >= mapY)
            player.cells[i].y = mapY;
        if(player.cells[i].y + deltaY <= 0)
            player.cells[i].y = 0;

        if(!isNaN(deltaX))
            player.cells[i].x += deltaX;
        if(!isNaN(deltaY))
            player.cells[i].y += deltaY;

        x += player.cells[i].x;
        y += player.cells[i].y;


    }
    player.x = x/player.cells.length;
    player.y = y/player.cells.length;
    
}

function checkcollision(player)
{
    let playerCircle;
    function funcFood(food)
    {
        if(food.mass == undefined)
            return false;
        return SAT.pointInCircle(new V(food.x, food.y), playerCircle);
    }

    function funcCell(cell, currentCell) {
        if(cell.id == currentCell.id)
        {
            if(cell.count == currentCell.count)
            {
                return false;
            }
            else
            {
                if(player.splitTime <= 0)
                {
                    return SAT.testCircleCircle(playerCircle, new C(new V(cell.x, cell.y), cell.radius));
                }
            }
        }
        else
        {
            return SAT.testCircleCircle(playerCircle, new C(new V(cell.x, cell.y), cell.radius)) && currentCell.mass >= 1.2 * cell.mass;
        }
        return false;
    }

    function funcMass(mass)
    {
        if((mass.id.split(" "))[0] == player.id && mass.speed > 0)
            return false;
        return SAT.testCircleCircle(playerCircle, new C(new V(mass.x, mass.y), mass.radius));
    }

    function eatFood(f)
    {
        this.mass += f.mass;
        let index = foodList.findIndex(food => food.id == f.id);
        foodList[index] = {};
        foodList.splice(index, 1);

    }
    

    function eatCell(f)
    {
        this.mass += f.mass;
        if(f.id == this.id)
        {
            let index = player.cells.findIndex(cell => cell.count == f.count);
            console.log(player.cells[index]);
            player.cells[index] = {};
            player.cells.splice(index, 1);
        }
        else
        {
            let otherPlayer = playerList.find(p => f.id == p.id);
            let index = otherPlayer.cells.findIndex(cell => cell.count == f.count);
            otherPlayer.cells[index] = {};
            otherPlayer.cells.splice(index, 1);
        }
    }

    function eatMass(m)
    {
        this.mass += m.mass;
        let index = massFoodList.findIndex(mass => mass.id == m.id);
        massFoodList[index] = {};
        massFoodList.splice(index, 1);
    }

    let cellList = [];

    for(let i = 0; i < playerList.length; i++)
    {
        for(let j = 0; j < playerList[i].cells.length; j++)
        {
            cellList.push(playerList[i].cells[j]);
        }
    }

    for(let i = 0; i < player.cells.length; i++)
    {
        playerCircle = new C(
            new V(player.cells[i].x, player.cells[i].y),
            player.cells[i].radius
        );

        //cellList를 순회하며 플레이어와 부딪힌 cell을 찾는다.
        let isCollisionUserCell = [];
        let collisionUserCell = [];
        for(let j = 0; j < cellList.length; j++)
        {
            if(cellList[j].id == player.cells[i].id && cellList[j].count == player.cells[i].count)
                continue;
            isCollisionUserCell.push(funcCell(cellList[j], player.cells[i]));
            if(funcCell(cellList[j], player.cells[i]))
            {
                collisionUserCell.push(cellList[j]);
            }
        }

        collisionUserCell.forEach(eatCell, player.cells[i]);

        //foodList를 순회하며 플레이어와 부딪힌 food를 찾는다.
        let collisionFoodList = [];
        for(let j =0; j < foodList.length; j++)
        {
            if(funcFood(foodList[j]))
            {
                collisionFoodList.push(foodList[j]);
            }
        }

        collisionFoodList.forEach(eatFood, player.cells[i]);

        //massFoodList를 순회하며 플레이어와 부딪힌 massFood를 찾는다.
        let isCollisionMassFoodList = [];
        let collisionMassFoodList = [];
        for(let j = 0; j < massFoodList.length; j++)
        {
            isCollisionMassFoodList.push(funcMass(massFoodList[j]));
            if(funcMass(massFoodList[j]))
            {
                collisionMassFoodList.push(massFoodList[j]);
            }
        }

        collisionMassFoodList.forEach(eatMass, player.cells[i]);


        // for(let j = 0; j < massFoodList.length; j++)
        // {
        //     eatMass(isCollisionMassFoodList[j], j, player.cells[i], isCollisionMassFoodList);
        // }
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
        y : 0,
        splitTime : 0
    };

    playerList.push(currentPlayer);

    addPlayer(socket, currentPlayer);
    socket.on("disconnect", function(){
        console.log("player disconnected");
        let index = playerList.indexOf(currentPlayer);
        currentPlayer = {};
        playerList.splice(index, 1);
    });
    
    socket.on("default", function(target){
        currentPlayer.target = target;
    });

    socket.on("split", function(){
        function splitCell(cell) {
            //분열할 수 있는 최소 조건은 cell의 크기가 기본 크기의 2배여야 한다
            if(cell.mass >= defaultPlayerMass*2) {
                cell.mass = cell.mass/2;
                cell.radius = massToRadius(cell.mass);
                currentPlayer.cells.push({
                    id : currentPlayer.id,
                    count : currentPlayer.cells.length,
                    mass: cell.mass,
                    x: cell.x,
                    y: cell.y,
                    hue: {
                        r : cell.hue.r,
                        g : cell.hue.g,
                        b : cell.hue.b
                    },
                    radius: cell.radius,
                    speed: 25
                });
                currentPlayer.splitTime = 3000;
            }
        }

        if(currentPlayer.cells.length < limitSplit)
        {
            let size = currentPlayer.cells.length;
            for(let i = 0; i < size; i++)
            {
                splitCell(currentPlayer.cells[i]);
            }
        }
    });

    socket.on("fireMass", function(){
        for(var i=0; i<currentPlayer.cells.length; i++)
        {
            if(currentPlayer.cells[i].mass >= defaultPlayerMass + defaultMassFoodMass)
            {
                mass = defaultFoodMass;
                currentPlayer.cells[i].mass -= defaultMassFoodMass + 2;
                massFoodList.push({
                    id : currentPlayer.id + " " + Math.random(),
                    mass : mass,
                    hue : currentPlayer.cells[i].hue,
                    target :
                    {
                        x : currentPlayer.x - currentPlayer.cells[i].x + currentPlayer.target.x,
                        y : currentPlayer.y - currentPlayer.cells[i].y + currentPlayer.target.y
                    },
                    x : currentPlayer.cells[i].x,
                    y : currentPlayer.cells[i].y,
                    radius : massToRadius(mass),
                    speed : 15
                });
            }
        }
    });
});


setInterval(sendUpdates, 1000 / 60);
setInterval(tick, 1000 / 60);