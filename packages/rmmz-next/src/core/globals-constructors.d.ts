/// <reference no-default-lib="true" />

/* eslint-disable no-var */

// TypeScript keeps the first variable declaration; load engine constructors before DOM.
declare var StorageManager: typeof import('.').StorageManager
declare var Window: typeof import('.').Window
