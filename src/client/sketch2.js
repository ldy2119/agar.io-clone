var button;
function setup() {
  // let 
  let cellList = [];
  let cell = {
    id : "1",
    count : "3",
    asdf : "aa"
  };
  cellList.push(cell);
  cell = {
    id : "2",
    count : "-1",
    asdf : "bb"
  };
  cellList.push(cell);
  cell = {
    id : "3",
    count : "-1",
    asdf : "cc"
  };
  cellList.push(cell);
  cellList.forEach(function (cell){
    let index = cellList.indexOf(cell);
    cellList[index] = {};
    cellList.splice(index, 1);
    console.log(cell);
    console.log(cellList.toLocaleString);
  });
  console.log(cellList);

  noLoop();
}

function draw() {
}