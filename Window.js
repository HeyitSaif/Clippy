'use strict'

const { BrowserWindow } = require('electron')

// default window settings
const defaultProps = {
  width: 350,
  height: 400,
  // show: false,
  // center: true,
  resizable: false,
  minimizable: false,
  maximizable: false,
  closable: true,
  fullscreenable: false,
  skipTaskbar: false,
  frame: false,
  // transparent: true,
  title: 'Clippy',
  alwaysOnTop: true,
  // update for electron V5+
  webPreferences: {
    nodeIntegration: true
  }
}

class Window extends BrowserWindow {
  constructor ({ file, ...windowSettings }) {
    // calls new BrowserWindow with these props
    super({ ...defaultProps, ...windowSettings })

    // load the html and open devtools
    this.loadFile(file)
    // this.webContents.openDevTools()

    // gracefully show when ready to prevent flickering
    this.once('ready-to-show', () => {
      this.show()
    })
  }
}

module.exports = Window
