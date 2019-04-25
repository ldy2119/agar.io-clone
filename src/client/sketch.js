let screenX = 640;
let screenY = 320;

function setup() {
    let canvas = createCanvas(screenX, screenY);
    canvas.parent("holder");

    //FPS 설정
    frameRate(20);
}

function draw() {
    try
    {
        if(socket == null || !socket.connected)
            return;
    }
    catch(err)
    {
        console.log(err);
        return;
    }
    background(230);

    // noStroke();
    drawGrid();

    text(mouseX + " " + mouseY, mouseX, mouseY);
    if(foodList.length != 0)
    {
        for(let i = 0; i < foodList.length; i++)
        {
            drawFood(foodList[i]);
        }
    }

    if(playerUser != null)
    {
        drawPlayer(playerUser);
    }

    target = {
        x : mouseX - screenX/2,
        y : mouseY - screenY/2
    };
    socket.emit("default", target);
    // console.log(foodList);
    // console.log("EE");
}

function drawFood(food)
{
    fill(food.hue.r, food.hue.g, food.hue.b);
    circle(food.x - playerUser.x + screenX / 2, food.y - playerUser.y + screenY / 2, food.radius * 2);
}

function drawPlayer(player)
{
    // ellipse(player.x - playerUser.x + screenX/2, player.y - playerUser.y + screenY/2, player.mass);
    
    for(let i = 0; i < player.cells.length; i++)
    {
        fill(player.cells[i].hue.r, player.cells[i].hue.g, player.cells[i].hue.b);
        circle(player.cells[i].x - playerUser.x + screenX / 2, player.cells[i].y - playerUser.y + screenY / 2, player.cells[i].radius * 2);
        console.log(player.cells[i].radius);
    }
}

function drawGrid()
{
    stroke(255);
    for (var x = 0; x < screenX; x += 10) {
        line(x, 0, x, screenY);
    }

    for (var y = 0; y < screenY; y += 10) {
        line(0, y, screenX, y);
    }
}