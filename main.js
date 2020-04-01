'use strict'

const path = require('path')
const { app,Tray, Menu, globalShortcut,clipboard } = require('electron')
const Window = require('./Window')
const DataStore = require('./DataStore')
const ClipboardWatcher = require('./clipboard-watcher.js')
const runApplescript = require('run-applescript');
const ks = require('node-key-sender');
let dontSave=false,dontBlur=false,dontPaste=true;
const items = new DataStore({name: 'Items Main'})
var template=[];
var tray=null;
function main () {
  let mainWindow = new Window({
    file: path.join('renderer', 'list.html')
  })
  // mainWindow.webContents.openDevTools(); //debugging
  mainWindow.on('blur',()=>{
    if (!dontBlur)
      mainWindow.hide()
  })

  mainWindow.webContents.once('dom-ready', () => {
    const clipboardWatcher = new ClipboardWatcher();
    clipboardWatcher.on('item', item => {

      if (dontSave)
        dontSave=false
      else{
        items.additem(item)
        mainWindow.webContents.send("newItem",item)
      }
    });
    clipboardWatcher.startListening();
  })

  tray = new Tray(path.join(__dirname,'/img/organize.png'));
  tray.setToolTip("Click to open clippy!")
  tray.on('click',()=>{
    if (!mainWindow.isVisible()){
      mainWindow.show()
    }
  })
  tray.on('double-click',()=>{
    dontBlur=!dontBlur;
    toggleWIndow();
    })

  let unchecked=false;

  template.push({
    label: 'Enable Auto paste from Hotkeys',
    click: () => {
      dontPaste=!dontPaste
      },
    type: 'checkbox',
    unchecked
  })
  template.push({
    label: 'Clear Cliboard',
    click: () => {
      items.clear();
      mainWindow.webContents.send("clear",{})
    }
  })
  template.push({
    label: "Don't hide",
    click: () => {
        dontBlur=!dontBlur;
        toggleWIndow();
    },
    type: 'checkbox',
    unchecked
  })
  // template.push({
  //   label: 'About',
  //   click: () => {
  //     win.show() //need to implement
  //   }
  // })
  template.push({
    label: 'Exit',
    click: () => {
      app.exit()
    }
  })
  let contextMenu = Menu.buildFromTemplate(template)
  tray.setContextMenu(contextMenu);

  globalShortcut.register('alt+space', () => {
    if(mainWindow.isVisible())
      mainWindow.hide()
    else
      mainWindow.show()
  })
  if(process.platform === 'darwin'){
    globalShortcut.register('Command+1', () => {
      let list=items.getall()
      dontSave=true
      clipboard.writeText(list[list.length-1].text);
      if (!dontPaste)
      runApplescript('tell application "System Events" to keystroke "v" using command down').then().catch();
    })
    globalShortcut.register('Command+2', () => {
      let list=items.getall()
      dontSave=true
      clipboard.writeText(list[list.length-2].text);
      if (!dontPaste)
      runApplescript('tell application "System Events" to keystroke "v" using command down').then().catch();
    })
    globalShortcut.register('Command+3', () => {
      let list=items.getall()
      dontSave=true
      clipboard.writeText(list[list.length-3].text);
      if (!dontPaste)
      runApplescript('tell application "System Events" to keystroke "v" using command down').then().catch();
    })
    globalShortcut.register('Command+4', () => {
      let list=items.getall()
      dontSave=true
      clipboard.writeText(list[list.length-4].text);
      if (!dontPaste)
      runApplescript('tell application "System Events" to keystroke "v" using command down').then().catch();
    })
    globalShortcut.register('Command+5', () => {
      let list=items.getall()
      dontSave=true
      clipboard.writeText(list[list.length-5].text);
      if (!dontPaste)
      runApplescript('tell application "System Events" to keystroke "v" using command down').then().catch();
    })
  }else{
    globalShortcut.register('control+1', () => {
      let list=items.getall()
      dontSave=true
      clipboard.writeText(list[list.length-1].text);
      if (!dontPaste)
      ks.sendCombination(['control','v']);
    })
    globalShortcut.register('control+2', () => {
      let list=items.getall()
      dontSave=true
      clipboard.writeText(list[list.length-2].text);
      if (!dontPaste)
      ks.sendCombination(['control','v']);
    })
    globalShortcut.register('control+3', () => {
      let list=items.getall()
      dontSave=true
      clipboard.writeText(list[list.length-3].text);
      if (!dontPaste)
      ks.sendCombination(['control','v']);

    })
    globalShortcut.register('control+4', () => {
      let list=items.getall()
      dontSave=true
      clipboard.writeText(list[list.length-4].text);
      if (!dontPaste)
      ks.sendCombination(['control','v']);
    })
    globalShortcut.register('control+5', () => {
      let list=items.getall()
      dontSave=true
      clipboard.writeText(list[list.length-5].text);
      if (!dontPaste)
      ks.sendCombination(['control','v']);
    })
  }
  function toggleWIndow(){
    if (dontBlur)
      mainWindow.show()
    else
      mainWindow.hide()
  }
}


app.on('ready', main)

app.on('window-all-closed', function () {
  app.quit()
})
