let screenX = 640;
let screenY = 320;

function setup() {
    background(0);
    let canvas = createCanvas(screenX, screenY);
    canvas.parent("holder");

    //FPS 설정
    frameRate(60);
}

function draw() {
    try
    {
        if(socket == null || !socket.connected)
        {
            isPlay = false;
            return;
        }
    }
    catch(err)
    {
        isPlay = false;
        console.log(err);
        return;
    }
    if(playerUser == null)
        return;
    background(230);

    if(playerUser != null)
    {
        drawGrid();


        if(userList.length != 0)
        {
            for(let i = 0; i < userList.length; i++)
            {
                drawPlayer(userList[i]);
            }
        }

        if(foodList.length != 0)
        {
            for(let i = 0; i < foodList.length; i++)
            {
                drawFood(foodList[i]);
            }
        }

        if(massFoodList.length != 0)
        {
            for(let i = 0; i < massFoodList.length; i++)
            {
                drawMass(massFoodList[i]);
            }
        }
        if(virusList.length != 0)
        {
            for(let i = 0; i < virusList.length; i++)
            {
                drawVirus(virusList[i]);
            }
        }

        drawPlayer(playerUser);

    }

    // console.log(playe)
    drawLeaderBoard();
    if(playerUser.type != "player")
        return;
    target = {
        x : mouseX - screenX/2,
        y : mouseY - screenY/2
    };
    socket.emit("default", target);
}

function drawFood(food)
{
    
    fill(food.hue.r, food.hue.g, food.hue.b);
    
    // let x = food.x * mapX /  - playerUser.x + screenX / 2;
    // let y = food.y - playerUser.y + screenY / 2;

    // let x = food.x - playerUser.x * mapX / screenX;
    circle(food.x - playerUser.x + screenX / 2, food.y - playerUser.y + screenY / 2, food.radius * 2);

}

function drawMass(mass)
{
    fill(mass.hue.r, mass.hue.g, mass.hue.b);
    circle(mass.x - playerUser.x + screenX / 2, mass.y - playerUser.y + screenY / 2, mass.radius * 2);
}

function drawVirus(virus)
{
    fill(virus.hue.r, virus.hue.g, virus.hue.b);
    let angle = TWO_PI / 40;
    let halfAngle = angle / 2.0;
    beginShape();
    for (let a = 0; a < TWO_PI; a += angle) {
        let sx = virus.x - playerUser.x + screenX / 2 + cos(a) * 25;
        let sy = virus.y - playerUser.y + screenY / 2 + sin(a) * 25;
        vertex(sx, sy);
        sx = virus.x - playerUser.x + screenX / 2 + cos(a + halfAngle) * 20;
        sy = virus.y - playerUser.y + screenY / 2 + sin(a + halfAngle) * 20;
        vertex(sx, sy);
    }
    endShape(CLOSE);
}

function drawPlayer(player)
{
    if(player.cells != null)
        for(let i = 0; i < player.cells.length; i++)
        {
            fill(player.cells[i].hue.r, player.cells[i].hue.g, player.cells[i].hue.b);
            circle(player.cells[i].x - playerUser.x + screenX / 2, player.cells[i].y - playerUser.y + screenY / 2, player.cells[i].radius * 2);
            fill(255 - player.cells[i].hue.r, 255 - player.cells[i].hue.g, 255 - player.cells[i].hue.b);
            textAlign(CENTER);
            noStroke();
            text(player.name, player.cells[i].x - playerUser.x + screenX / 2, player.cells[i].y - playerUser.y + screenY / 2);
            stroke(255);
        }
}

function drawGrid()
{
    stroke(255);
    
    for (var x = xOffset - playerUser.x; x < screenX; x += 10) {
        line(x, 0, x, screenY);
    }

    for (var y = yOffset - playerUser.y; y < screenY; y += 10) {
        line(0, y, screenX, y);
    }
}

function drawLeaderBoard()
{
    textAlign(LEFT);
    text("LEADERBOARD", 10, 10);
    for(let i = 0; i < board.length; i++)
    {
        text(board[i].name + " : " + board[i].score, 10, 30 + i * 20);
    }
}

function keyPressed()
{
    if(!isPlay)
        return;
    if (key == ' ') 
    {
        socket.emit("split");
    }
    else if(key == 'w')
    {
        socket.emit("fireMass");
    }
}