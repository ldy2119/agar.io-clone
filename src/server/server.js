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

let maxFood = 50;
let maxVirus = 0;

let mapX;
let mapY;

let V = SAT.Vector;
let C = SAT.Circle;

let defaultFoodMass = 1;
let defaultVirusMass = 10;
let defaultPlayerMass = 3;
let defaultMassFoodMass = 3;
let defaultSpeed = 2;

let limitSplit = 16;

let defaultMassLog = Math.log(1) / 4;

let FoodTimer = 0;
let VirusTimer = 0;

app.use(express.static(__dirname + '/../client'));

//cell의 크기를 화면에 표시할 수 있게 바꾼다.
function massToRadius(mass)
{
    return 4 + Math.sqrt(mass) * 6;
}

//서버가 시작될 때 초기값을 설정한다.
function init()
{
    mapX = 600;
    mapY = 600;
    for(let i = 0; i < maxFood; i++)
    {
        addFood();
    }
    for(let i = 0; i < maxVirus; i++)
    {
        addVirus();
    }
}

//food를 추가한다.
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

//virus를 추가한다.
function addVirus()
{
    let x = Math.random() * mapX + 1;
    let y = Math.random() * mapY + 1;
    let radius = massToRadius(defaultVirusMass);

    virusList.push({
        id: (new Date()).getTime() + "" + Math.random(),
        x: x,
        y: y,
        radius : radius,
        mass: defaultVirusMass,
        hue: {
            r : 0,
            g : 255,
            b : 0
        }  
    });
}

//player를 추가한다.
function addPlayer(socket, player, name)
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
        speed : defaultSpeed,
        self_destroy_index : -1
    }];
    player.cells = cells;
    player.x = cells[0].x;
    player.y = cells[0].y;
    
    player.width = 640;
    player.height = 320;

    player.type = "player";
    player.name = name;
    player.score = defaultPlayerMass;

    player.splitTime = 0;
    player.count = 1;

    // playerList.push(player);
}

function playerDied(player)
{
    player.type = "observer";
}

//각 플레이어에게 화면에 표시될 food, cell, virus를 전송한다.
function sendUpdates()
{
    let leaderboard = [];

    for(let i = 0; i < playerList.length; i++)
    {
        if(playerList[i].type != "player")
            continue;
        let board = {
            name : playerList[i].name,
            score : playerList[i].score
        };
        leaderboard.push(board);
    }

    leaderboard.sort(function (a, b){
        return b.score - a.score;
    });

    playerList.forEach( function(u) {

        let visibleFood;
        let visibleMass;
        let visibleCells;
        let visibleVirus;

        if(u.type == "player")
        {
            visibleFood  = foodList
                .filter(function(f) {
                    if ( f.x > u.x - u.width/2 - 20 &&
                        f.x < u.x + u.width/2 + 20 &&
                        f.y > u.y - u.height/2 - 20 &&
                        f.y < u.y + u.height/2 + 20) {
                        return f;
                    }
                });
            visibleMass = massFoodList
                .filter(function(f) {
                    if ( f.x+f.radius > u.x - u.width/2 &&
                        f.x-f.radius < u.x + u.width/2 &&
                        f.y+f.radius > u.y - u.height/2 &&
                        f.y-f.radius < u.y + u.height/2)
                    {
                        return f;
                    }
                });
            visibleCells = playerList
                .filter(function (f){
                    if(f.type == "player" && f.cells != null)
                    {
                        for(let z = 0; z < f.cells.length; z++)
                        {
                            if(f.id != u.id)
                            {
                                if(f.cells[z].x + f.cells[z].radius > u.x - u.width/2 &&
                                    f.cells[z].x - f.cells[z].radius < u.x + u.width/2 &&
                                    f.cells[z].y + f.cells[z].radius > u.y - u.height/2 &&
                                    f.cells[z].y - f.cells[z].radius < u.y + u.height/2)
                                {
                                    return {
                                        id: f.id,
                                        x: f.x,
                                        y: f.y,
                                        cells: f.cells,
                                        name : f.name
                                        };
                                }
                            }
                        }
                    }
                });
            visibleVirus = virusList
                .filter(function (f){
                    if ( f.x+f.radius > u.x - u.width/2 &&
                        f.x-f.radius < u.x + u.width/2&&
                        f.y+f.radius > u.y - u.height/2 &&
                        f.y-f.radius < u.y + u.height/2)
                    {
                        return f;
                    }
                });
            if(u.cells.length > 0)
            {
                sockets[u.id].emit('Update', visibleFood, u, visibleMass, visibleVirus, visibleCells, leaderboard);
            }
            else
            {
                // let index = playerList.indexOf(u);
                // playerList.splice(index, 1);
                sockets[u.id].emit("die");
                playerDied(u);

            }
        }
        else if(u.type == "observer")
        {
            visibleFood = foodList;
            visibleMass = massFoodList;
            visibleCells = playerList
                .filter(function (f){
                    if(f.type == "player" && f.cells != null)
                    {
                        for(let z = 0; z < f.cells.length; z++)
                        {
                            if(f.id != u.id)
                            {
                                return {
                                    id: f.id,
                                    x: f.x,
                                    y: f.y,
                                    cells: f.cells,
                                    name : f.name
                                    };
                            }
                        }
                    }
                });
            visibleVirus = virusList;
            sockets[u.id].emit('Update', visibleFood, u, visibleMass, visibleVirus, visibleCells, leaderboard, mapX, mapY);
        }
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

    //3초에 1번씩 Food와 Virus를 재생성한다.
    if(FoodTimer < 180)
    {
        FoodTimer += 1;
    }
    if(VirusTimer < 180)
    {
        VirusTimer += 1;
    }
    if(foodList.length < maxFood && FoodTimer >= 180)
    {
        tickFood();
        FoodTimer = 0;
    }
    if(virusList.length < maxVirus && VirusTimer >= 180)
    {
        tickVirus();
        VirusTimer = 0;
    }
}

function tickFood()
{
    //(food의 최대 개수 - 현재 food의 개수) / 2 + 1을 추가합니다. 1을 더하는 이유는 최소 1개는 추가되어야 하기 때문
    let numberOfAddedFood = (maxFood - foodList.length) / 2 + 1;
    for(let i = 0; i < numberOfAddedFood; i++)
    {
        addFood();
    }
}

function tickVirus()
{
    //(Virus의 최대 개수 - 현재 Virus의 개수) / 2 + 1을 추가합니다. 1을 더하는 이유는 최소 1개는 추가되어야 하기 때문
    let numberOfAddedVirus = (maxVirus - virusList.length) / 2 + 1;
    for(let i = 0; i < numberOfAddedVirus; i++)
    {
        addVirus();
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
    if(player.type == "player")  
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

            // console.log(target.x, player.cells[i].x, player.x, target.y, player.cells[i].y, player.y);

            if(player.cells[i].speed > defaultSpeed)
                player.cells[i].speed -= 0.5;

            let deg = Math.atan2(target.y, target.x);

            let slowdown = 1;
            slowdown = Math.log(Math.pow(player.cells[i].mass, 9)) - defaultMassLog + 50;
            
            if(Math.abs(target.x) > 100)
            {
                target.x = target.x < 0 ? -100 : 100;
            }
            if(Math.abs(target.y) > 100)
            {
                target.y = target.y < 0 ? -100 : 100;
            }
            
            let deltaY = (target.y) / slowdown * player.cells[i].speed;
            let deltaX = (target.x) / slowdown * player.cells[i].speed;


            // let deltaY = player.cells[i].speed * Math.sin(deg) / slowdown;
            // let deltaX = player.cells[i].speed * Math.cos(deg) / slowdown;

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
    else if(player.type == "observer")  
    {
        
    }
}

function checkcollision(player)
{
    if(player.type != "player")
        return;
    let playerCircle;
    let playerScore = 0;
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
                    return SAT.testCircleCircle(playerCircle, new C(new V(cell.x, cell.y), cell.radius)) && currentCell.mass >= cell.mass;
                }
            }
        }
        else
        {
            return SAT.pointInCircle(new V(cell.x, cell.y), playerCircle) && currentCell.mass >= 1.2 * cell.mass;
        }
        return false;
    }

    function funcMass(mass)
    {
        if((mass.id.split(" "))[0] == player.id && mass.speed > 0)
            return false;
        return SAT.testCircleCircle(playerCircle, new C(new V(mass.x, mass.y), mass.radius));
    }

    function funcVirus(virus, currentCell)
    {
        return SAT.pointInCircle(new V(virus.x, virus.y), playerCircle) && currentCell.mass > 1.2 * virus.mass;
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
        if(f.id == this.id)
        {
            //자기 자신의 cell과 합쳐질 때 호출됨
            if(this.self_destroy_index != -1 || f.self_destroy_index != -1)
                return;
            f.self_destroy_index = this.count;
            
        }
        else
        {
            this.mass += f.mass;
            let otherPlayer = playerList.find(p => f.id == p.id);
            let index = otherPlayer.cells.findIndex(cell => cell.count == f.count);
            otherPlayer.cells[index] = {};
            otherPlayer.cells.splice(index, 1);
        }
    }

    //자기 자신의 cell과 합쳐질 때 호출됨
    function eatCellSelf()
    {
        if(player.splitTime > 0)
            return;

        // let size = player.cells.length;
        let i = 0;
        // player.cells.sort(function(a, b){
        //     if(a.self_destroy_index != -1)
        //         return -1;
        //     else
        //         return 1;
        // });
        // console.log(player.cells);
        for(let i = player.cells.length - 1; i >= 0; i--)
        {
            if(player.cells[i].self_destroy_index != -1)
            {
                let index = player.cells.findIndex(c => c.count == player.cells[i].self_destroy_index);

                //왜 생기는지 모르겠지만 
                let childCells = player.cells.filter((cell) => cell.self_destroy_index == player.cells[i].count);
                for(let j = 0; j < childCells.length; j++)
                {
                    player.cells.find((cell) => cell === childCells[j]).self_destroy_index = index;
                }

                player.cells[index].mass += player.cells[i].mass;
                player.cells[i] = {};
                player.cells.splice(i, 1);
            }
        }
        // player.cells.forEach(function (cell){
        //     if(cell.self_destroy_index != -1)
        //     {
        //         // console.log(cell.count + " -> " + cell.self_destroy_index);
        //         let index = player.cells.findIndex(c => c.count == cell.self_destroy_index);

        //         let destroyIndex = player.cells.indexOf(cell);

        //         player.cells[index].mass += player.cells[destroyIndex].mass;
        //         player.cells[destroyIndex] = {};
        //         player.cells.splice(destroyIndex, 1);
        //     }
        // });
    }

    function eatMass(m)
    {
        this.mass += m.mass;
        let index = massFoodList.findIndex(mass => mass.id == m.id);
        massFoodList[index] = {};
        massFoodList.splice(index, 1);
    }

    function eatVirus(v)
    {
        this.mass -= 2;
        let index = virusList.indexOf(v);
        virusList[index] = {};
        virusList.splice(index, 1);
        splitCell(this, player);
    }

    let cellList = [];

    for(let i = 0; i < playerList.length; i++)
    {
        if(playerList[i].type == "player" && playerList[i].cells != null)
        {
            for(let j = 0; j < playerList[i].cells.length; j++)
            {
                cellList.push(playerList[i].cells[j]);
            }
        }
    }

    player.cells.forEach(function(cell){
        playerCircle = new C(
            new V(cell.x, cell.y),
            cell.radius
        );

        //cellList를 순회하며 플레이어와 부딪힌 cell을 찾는다.
        let collisionUserCell = [];
        for(let j = 0; j < cellList.length; j++)
        {
            if(funcCell(cellList[j], cell))
            {
                collisionUserCell.push(cellList[j]);
            }
        }

        collisionUserCell.forEach(eatCell, cell);

        //foodList를 순회하며 플레이어와 부딪힌 food를 찾는다.
        let collisionFoodList = [];
        for(let j =0; j < foodList.length; j++)
        {
            if(funcFood(foodList[j]))
            {
                collisionFoodList.push(foodList[j]);
            }
        }

        collisionFoodList.forEach(eatFood, cell);

        //massFoodList를 순회하며 플레이어와 부딪힌 massFood를 찾는다.
        let collisionMassFoodList = [];
        for(let j = 0; j < massFoodList.length; j++)
        {
            if(funcMass(massFoodList[j]))
            {
                collisionMassFoodList.push(massFoodList[j]);
            }
        }

        collisionMassFoodList.forEach(eatMass, cell);

        let collisionVirusList = [];
        for(let j = 0; j < virusList.length; j++)
        {
            if(funcVirus(virusList[j], cell))
            {
                collisionVirusList.push(virusList[j]);
            }
        }

        collisionVirusList.forEach(eatVirus, cell);


        // for(let j = 0; j < massFoodList.length; j++)
        // {
        //     eatMass(isCollisionMassFoodList[j], j, cell, isCollisionMassFoodList);
        // }
        cell.radius = massToRadius(cell.mass);
        playerScore += cell.mass;
    });

    eatCellSelf();
    player.score = playerScore;

}

function splitCell(cell, player) {
    //분열할 수 있는 최소 조건은 cell의 크기가 기본 크기의 2배여야 한다
    if(cell.mass >= defaultPlayerMass*2) {
        cell.mass = cell.mass/2;
        cell.radius = massToRadius(cell.mass);
        player.cells.push({
            id : player.id,
            count : player.count,
            mass: cell.mass,
            x: cell.x,
            y: cell.y,
            hue: {
                r : cell.hue.r,
                g : cell.hue.g,
                b : cell.hue.b
            },
            radius: cell.radius,
            speed: defaultSpeed + 8,
            self_destroy_index : -1
        });
        player.count++;
        if(player.count > 300)
            player.count = 0;
        player.splitTime = 3000;
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
        type: "observer",
        target: {
            x: 0,
            y: 0
        },
        width : mapX,
        height : mapY,
        x : mapX/2,
        y : mapY/2,
    };

    playerList.push(currentPlayer);
    sockets[socket.id] = socket;

    socket.emit("init", currentPlayer);

    socket.on("disconnect", function(){
        console.log("player disconnected");
        let index = playerList.indexOf(currentPlayer);
        if(index == -1)
            return;
        currentPlayer = {};
        playerList.splice(index, 1);

        let id = socket.id;

        delete sockets[id];
    });

    socket.on("Start", function(name){
        
        addPlayer(socket, currentPlayer, name);
        socket.emit("ReadyToShow");
    });
    
    socket.on("default", function(target){
        currentPlayer.target = target;
    });

    
    socket.on("split", function(){

        if(currentPlayer.cells.length < limitSplit)
        {
            let size = currentPlayer.cells.length;
            for(let i = 0; i < size; i++)
            {
                splitCell(currentPlayer.cells[i], currentPlayer);
            }
        }
    });

    socket.on("splitVirus", function(cell){
        if(currentPlayer.cells.length < limitSplit)
        {
            splitCell(cell, currentPlayer);
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