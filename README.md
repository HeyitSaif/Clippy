# Clippy
Clipboard manager that makes sense

A clipboard manger that support text and images for now.
This cliboard is inspired by Ditto for Windows.
if you on windows use ditto instead of this. Hence it is far better than this at current stage.
i needed a same solution for linux and mac so i built it for myself.

Since it is not configurable right now so let me give you a tour.
  It allows you to copy and paste images/text while keeping your cliboard histroy as well. voila!
  You can search through your texts using pannel.
  You can hide/show tha app using alt+space for mac/windows/linux.

The main thing i wanted was to be able to have a hot key for recent copied commands.

So,
  You have ctrl+1 to ... ctrl + 5 for your most recent 5 copied text or images at your disposal.
  if your are on mac use cmnd + 1 to achieve the desire effect.
  there is a catch here Ditto allows you to paste using the hot keys as well. Since it is writter on electron i was unable to get the funcationality. i have found the way around but it's not that good.
  So, to be able to use that functionality you need to have the jdk (java) installed on your computer since it uses the node module that uses the jar file to trigerr keys.
  The above solution is kind a slow and unresponsive espacially for mac.
  So, for mac i have used the apple script within this app. so you have to allow this application accesbility feature in order to use this functionality. other wise you can use the defualt settingss which is to press the desired hot key and then press ctrl/cmnd+ v manually to paste the text on that number.
  
- Todo Design a fine logo ;-)
- Add about Window.
- Allow user to change keys for hiding and pasting shortcuts through gui.
- Find a perfect way to trigger pasting using hot keys without delay.

                         Any suggestion hit me up or create a pull request if you want in on fun!
