'use strict';

const path = require('path');
const { app, Tray, Menu, globalShortcut, clipboard, nativeImage } = require('electron');
const Window = require('./Window');
const DataStore = require('./DataStore');
const ClipboardWatcher = require('./clipboard-watcher.js');
const runApplescript = require('run-applescript');
const ks = require('node-key-sender');
let dontSave = false,
  dontBlur = false,
  dontPaste = true;
const items = DataStore.getInstance();
var template = [];
var tray = null;
function main() {
  let mainWindow = new Window({
    file: path.join('renderer', 'list.html'),
  });
  // mainWindow.webContents.openDevTools(); //debugging
  mainWindow.on('blur', () => {
    if (!dontBlur) mainWindow.hide();
  });

  mainWindow.webContents.once('dom-ready', () => {
    const clipboardWatcher = new ClipboardWatcher();
    mainWindow.webContents.send('ready', items);

    clipboardWatcher.on('item', (item) => {
      if (dontSave) dontSave = false;
      else {
        items.additem(item);
        mainWindow.webContents.send('newItem', item, items);
      }
    });
    clipboardWatcher.startListening();
  });

  tray = new Tray(path.join(__dirname, '/img/organize.png'));
  tray.setToolTip('Click to open clippy!');
  tray.on('click', () => {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
  });
  tray.on('double-click', () => {
    dontBlur = !dontBlur;
    toggleWIndow();
  });

  let unchecked = false;

  template.push({
    label: 'Enable Auto paste from Hotkeys',
    click: () => {
      dontPaste = !dontPaste;
    },
    type: 'checkbox',
    unchecked,
  });
  template.push({
    label: 'Clear Cliboard',
    click: () => {
      items.clear();
      mainWindow.webContents.send('clear', {});
    },
  });
  template.push({
    label: "Don't hide",
    click: () => {
      dontBlur = !dontBlur;
      toggleWIndow();
    },
    type: 'checkbox',
    unchecked,
  });
  // template.push({
  //   label: 'About',
  //   click: () => {
  //     win.show() //need to implement
  //   }
  // })
  template.push({
    label: 'Exit',
    click: () => {
      app.exit();
    },
  });
  let contextMenu = Menu.buildFromTemplate(template);
  tray.setContextMenu(contextMenu);

  globalShortcut.register('alt+space', () => {
    if (mainWindow.isVisible()) mainWindow.hide();
    else mainWindow.show();
  });

  globalShortcut.register('CommandOrControl+1', () => {
    trigger_paste(1);
  });
  globalShortcut.register('CommandOrControl+2', () => {
    trigger_paste(2);
  });
  globalShortcut.register('CommandOrControl+3', () => {
    trigger_paste(3);
  });
  globalShortcut.register('CommandOrControl+4', () => {
    trigger_paste(4);
  });
  globalShortcut.register('CommandOrControl+5', () => {
    trigger_paste(5);
  });

  function toggleWIndow() {
    if (dontBlur) mainWindow.show();
    else mainWindow.hide();
  }
  function trigger_paste(index) {
    let list = items.getall();
    dontSave = true;
    let tuple=list[list.length - index]
    if (tuple.type=='image')
      clipboard.writeImage(nativeImage.createFromDataURL(tuple.buffer));
    else
      clipboard.writeText(tuple.text);
    if (!dontPaste)
      if (process.platform === 'darwin')
        runApplescript(
          'tell application "System Events" to keystroke "v" using command down'
        ).then().catch();
      else
        ks.sendCombination(['control', 'v']);
  }
}

app.on('ready', main);

app.on('window-all-closed', function () {
  app.quit();
});
