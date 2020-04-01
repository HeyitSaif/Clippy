const { ipcRenderer,clipboard } = require('electron');
const DataStore = require('../DataStore');
const items = new DataStore({name: 'Items Main'})
document.onkeydown = keydown;

function keydown(evt){
  if (!evt) evt = event;
  if (evt.metaKey && evt.keyCode==70){ //CMND+F
    document.getElementById("myInput").focus();
  }
  if (evt.ctrlKey && evt.keyCode==70){ //CTRL+F
    document.getElementById("myInput").focus();
  }

}
ipcRenderer.on("newItem",(event,item)=>{
    addElement(item);
})
ipcRenderer.on("clear",(event,item)=>{
    let ul = document.getElementById("myUL");
    for (element of ul.children) {
        element.remove();
    };
})
function myFunction() {
    var input, filter, ul, li, a, i, txtValue;
    input = document.getElementById("myInput");
    filter = input.value.toUpperCase();
    ul = document.getElementById("myUL");
    li = ul.getElementsByTagName("li");
    for (i = 0; i < li.length; i++) {
        a = li[i].getElementsByTagName("a")[0];
        txtValue = a.textContent || a.innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            li[i].style.display = "";
        } else {
            li[i].style.display = "none";
        }
    }
}
function addElement(element){
    let ul = document.getElementById("myUL");
    let li= document.createElement("li")
    if(element.type!='text'){
        let img=document.createElement("img")
        li.appendChild(img)
        const nativeImage = require('electron').nativeImage
        li.onclick=()=>{
            clipboard.writeImage(nativeImage.createFromDataURL(element.thumbBuffer));
        }
        img.id=element.hash
        img.src=element.thumbBuffer
        ul.prepend(li)
    }else{
        let a=document.createElement("a")
        li.appendChild(a)
        li.onclick=()=>{
            clipboard.writeText(items.getitems(element.hash).text);
        }
        a.id=element.hash
        a.text=element.text;
        ul.prepend(li)
    }
}
function loaditems() {
    items.getall().forEach(element => {
        addElement(element)
    });
}