const { ipcRenderer, clipboard } = require('electron');
const DataStore = require('../DataStore');
var debounce = require('debounce');
const items = DataStore.getInstance();
document.onkeydown = keydown;

function keydown(evt) {
  if (!evt) evt = event;
  if (evt.metaKey && evt.keyCode == 70) {
    //CMND+F
    // document.getElementById('myInput').focus();
    $('#myInput').focus();

  }
  if (evt.ctrlKey && evt.keyCode == 70) {
    //CTRL+F
    $('#myInput').focus();
  }
}
ipcRenderer.on('newItem', (event, item) => {
  addElement(item);
});
ipcRenderer.on('clear', (event, item) => {
  $('#myUL').empty();
});

function search() {
  var input, filter, ul, li, a, i, txtValue;
  input = document.getElementById('myInput');
  filter = input.value.toUpperCase();
  ul = document.getElementById('myUL');
  li = ul.getElementsByTagName('li');
  for (i = 0; i < li.length; i++) {
    a = li[i].getElementsByTagName('a')[0];
    if (a){
      txtValue = a.value || a.textContent || a.innerText;
      if (txtValue.toUpperCase().includes(filter)) {
        li[i].style.display = 'block';
      } else {
        li[i].style.display = 'none';
      }
    }
    else {
      li[i].style.display = 'none';
    }
  }
}
function addElement(element) {
  //   var that = this;
  let ul = document.getElementById('myUL');
  let li = document.createElement('li');
  if (element.type != 'text') {
    let img = document.createElement('img');
    let a = document.createElement('a');
    li.appendChild(img);
    li.appendChild(a);
    a.value = "pic";
    const nativeImage = require('electron').nativeImage;
    li.onclick = () => {
      // clipboard.writeImage(nativeImage.createFromDataURL(element.thumbBuffer));
      let image=nativeImage.createFromDataURL(element.buffer)
        clipboard.writeImage(image);
    };
    img.id = element.hash;
    img.src = element.thumbBuffer;
    ul.prepend(li);
  } else {
    let a = document.createElement('a');
    li.appendChild(a);
    li.onclick = () => {
      clipboard.writeText(items.getitems(element.hash).text);
    };
    a.id = element.hash;
    a.value = element.text;
    if (element.text.length > 255)
      element.text = element.text.substring(0, 255) + '.........';
    a.text = element.text;
    ul.prepend(li);
  }
}

function loaditems() {
  items.getall().forEach((element) => {
    addElement(element);
  });
}
