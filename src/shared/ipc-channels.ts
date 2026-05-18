export const IPC = {
  CLIPS_LIST: 'clips:list',
  CLIPS_SEARCH: 'clips:search',
  CLIPS_GET: 'clips:get',
  CLIPS_GET_IMAGE: 'clips:get-image',
  CLIPS_GET_THUMB: 'clips:get-thumb',
  CLIPS_GET_THUMBS: 'clips:get-thumbs',
  CLIPS_GET_LIST_ITEM: 'clips:get-list-item',
  CLIPS_COPY: 'clips:copy',
  CLIPS_PASTE: 'clips:paste',
  CLIPS_DELETE: 'clips:delete',
  CLIPS_TOGGLE_PIN: 'clips:toggle-pin',
  CLIPS_TOGGLE_SNIPPET: 'clips:toggle-snippet',
  CLIPS_UPDATE_TAGS: 'clips:update-tags',
  CLIPS_CLEAR: 'clips:clear',
  CLIPS_EXPORT: 'clips:export',
  CLIPS_IMPORT: 'clips:import',
  CLIPS_PASTE_SLOT: 'clips:paste-slot',
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  WINDOW_HIDE: 'window:hide',
  WINDOW_SHOW: 'window:show',
  WINDOW_TOGGLE: 'window:toggle',
  APP_GET_VERSION: 'app:get-version',
  APP_GET_PLATFORM: 'app:get-platform',
  ACCESSIBILITY_GET_STATUS: 'accessibility:get-status',
  ACCESSIBILITY_REQUEST: 'accessibility:request'
} as const

export const IPC_EVENTS = {
  CLIPS_UPDATED: 'clips:updated',
  CLIP_ADDED: 'clip:added',
  SETTINGS_CHANGED: 'settings:changed',
  WINDOW_FOCUSED: 'window:focused',
  ACCESSIBILITY_REQUIRED: 'accessibility:required'
} as const
