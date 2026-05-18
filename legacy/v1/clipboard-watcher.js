const { clipboard } = require('electron');
const EventEmitter = require('events');
const crypto = require('crypto');

function getHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function generateThumb(nativeImageData) {
  const aspectRatio = nativeImageData.getAspectRatio();

  const resizeOptions = {
    width: 70,
    height: 70,
  };

  if (aspectRatio > 1) {
    // Landscape image
    resizeOptions.width /= aspectRatio;
  } else {
    // Portrait image
    resizeOptions.height /= aspectRatio;
  }

  const thumb = nativeImageData.resize(resizeOptions);
  return {
    thumbWidth: resizeOptions.width,
    thumbHeight: resizeOptions.height,
    thumbBuffer: thumb.toDataURL(),
  };
}

function getImageItem(nativeImageData) {
  return {
    type: 'image',
    ...nativeImageData.getSize(),
    buffer: nativeImageData.toBitmap(),
  };
}

function areItemsEqual(oldItem, newItem) {
  if (oldItem && newItem) {
    if (oldItem.type === newItem.type) {
      if (oldItem.type === 'image') {
        return oldItem.buffer.equals(newItem.buffer);
      }

      if (oldItem.type === 'text') {
        return (
          oldItem.text === newItem.text &&
          oldItem.html === newItem.html &&
          oldItem.rtf === newItem.rtf
        );
      }
    }
  }

  return false;
}

class ClipboardWatcher extends EventEmitter {
  constructor() {
    super();

    this._isListening = false;
    this._recentClipItem = null;

    this._watchLoop = this._watchLoop.bind(this);
  }

  startListening() {
    this._isListening = true;
    this._watchLoop();
  }

  _watchLoop() {
    if (!this._isListening) {
      return;
    }

    this._scrapeClipboard();

    setTimeout(this._watchLoop, 500);
  }

  _scrapeClipboard() {
    const availableFormats = clipboard.availableFormats();

    if (availableFormats.length === 0) {
      return;
    }

    let newClipItem = {};
    let clipboardImage = null;

    if (availableFormats.find((pattern) => pattern.startsWith('image/'))) {
      clipboardImage = clipboard.readImage();
      newClipItem = getImageItem(clipboardImage);
    } else if (
      availableFormats.find((pattern) => pattern.startsWith('text/'))
    ) {
      newClipItem = {
        type: 'text',
        text: clipboard.readText(),
        html: clipboard.readHTML(),
        rtf: clipboard.readRTF(),
      };

      if (!newClipItem.text.trim()) {
        return;
      }
    }

    if (areItemsEqual(this._recentClipItem, newClipItem)) {
      return;
    }

    newClipItem.timestamp = Date.now();
    this._recentClipItem = newClipItem;

    if (newClipItem.type === 'image') {
      const thumb = generateThumb(clipboardImage);
      Object.assign(newClipItem, thumb);
      newClipItem.hash = getHash(newClipItem.thumbBuffer);

      this.emit('item', {
        ...newClipItem,
        buffer: clipboardImage.toDataURL(),
      });
    } else {
      newClipItem.hash = getHash(newClipItem.text);
      this.emit('item', newClipItem);
    }
  }
}

module.exports = ClipboardWatcher;
