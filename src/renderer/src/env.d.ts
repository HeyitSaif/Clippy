import type { ClippyAPI } from '../../preload/index'

declare global {
  interface Window {
    clippy: ClippyAPI
  }
}

export {}
