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

    text(mouseX + " " + mouseY, mouseX, mouseY);
    

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

        drawPlayer(playerUser);

    }


    target = {
        x : mouseX - screenX/2,
        y : mouseY - screenY/2
    };
    socket.emit("default", target);
}

function drawFood(food)
{
    fill(food.hue.r, food.hue.g, food.hue.b);
    circle(food.x - playerUser.x + screenX / 2, food.y - playerUser.y + screenY / 2, food.radius * 2);
}

function drawMass(mass)
{
    fill(mass.hue.r, mass.hue.g, mass.hue.b);
    circle(mass.x - playerUser.x + screenX / 2, mass.y - playerUser.y + screenY / 2, mass.radius * 2);
}

function drawPlayer(player)
{
    for(let i = 0; i < player.cells.length; i++)
    {
        fill(player.cells[i].hue.r, player.cells[i].hue.g, player.cells[i].hue.b);
        circle(player.cells[i].x - playerUser.x + screenX / 2, player.cells[i].y - playerUser.y + screenY / 2, player.cells[i].radius * 2);
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

function keyPressed()
{
    if (key == ' ') 
    {
        socket.emit("split");
    }
    else if(key == 'w')
    {
        socket.emit("fireMass");
    }
}