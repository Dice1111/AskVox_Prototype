import { contextBridge, ipcRenderer } from "electron/renderer";
import { finished } from "node:stream";

enum MODEL_TYPE {
  ASKVOX = "ASKVOX",
  GPT_4o = "GPT_4o",
}

contextBridge.exposeInMainWorld("nodeAPI", {
  Buffer: (base64String: string) => Buffer.from(base64String, "base64"), // Buffer conversion function
});

contextBridge.exposeInMainWorld("electron", {
  getEnv: () => ipcRenderer.invoke("get-env"),
  openWindows: () => ipcRenderer.send("open-windows"),
  killWindows: () => ipcRenderer.send("kill-windows"),
  quitApp: () => ipcRenderer.send("quit-app"),
  startSync: (window: string) => ipcRenderer.send("start-sync", window),
});

contextBridge.exposeInMainWorld("tokenManagerApi", {
  calculateCost: (text: { input: string; output: string }, model: MODEL_TYPE) =>
    ipcRenderer.invoke("calculate-cost", text, model),
});

contextBridge.exposeInMainWorld("llmAPI", {
  toggleRecording: (recording: boolean) =>
    ipcRenderer.send("toggle-recording", recording),
  sendText: (text: string, window: string) =>
    ipcRenderer.send("text-input", text, window),
  sendAudioToElectron: (base64Audio: string) =>
    ipcRenderer.invoke("send-audio", base64Audio),

  //Listeners

  onStreamStart: (callback: () => void) =>
    ipcRenderer.on("stream-start", () => callback()),

  onStreamText: (callback: (textChunk: string) => void) =>
    ipcRenderer.on("stream-text", (_, textChunk) => callback(textChunk)),

  onStreamComplete: (callback: (fullText: string) => void) =>
    ipcRenderer.on("stream-complete", (_, fullText) => callback(fullText)),

  onPlayAudio: (callback: (audioBase64: string) => void) =>
    ipcRenderer.on("play-audio", (_, audioBase64) => callback(audioBase64)),

  notTextListener: (callback: () => void) =>
    ipcRenderer.on("not-text", () => callback()),

  syncLLMDataListener: (callback: () => void) =>
    ipcRenderer.on("sync-llm-data", () => callback()),

  // Remove listeners to prevent memory leaks
  removeStreamStartListener: () =>
    ipcRenderer.removeAllListeners("stream-start"),
  removeStreamTextListener: () => ipcRenderer.removeAllListeners("stream-text"),
  removeStreamCompleteListener: () =>
    ipcRenderer.removeAllListeners("stream-complete"),
  removePlayAudioListener: () => ipcRenderer.removeAllListeners("play-audio"),
  removeNotTextListener: () => ipcRenderer.removeAllListeners("not-text"),
  removesyncLLMDataListener: () =>
    ipcRenderer.removeAllListeners("sync-llm-data"),
});

// Expose a new audioManagerAPI
contextBridge.exposeInMainWorld("audioManagerAPI", {
  playAudio: (audioBase64: string) =>
    ipcRenderer.send("play-audio", audioBase64),
  stopAudio: () => ipcRenderer.send("stop-audio"),

  endAudio: () => {
    console.log("🚀 finishAudio() called in preload!");
    ipcRenderer.send("end-audio");
  },

  // Event listeners for play and stop audio
  onPlayAudio: (callback: (audioBase64: string) => void) =>
    ipcRenderer.on("play-audio", (_, audioBase64) => callback(audioBase64)),
  onStopAudio: (callback: () => void) =>
    ipcRenderer.on("stop-audio", () => callback()),
  onEndAudio: (callback: () => void) =>
    ipcRenderer.on("end-audio", () => callback()),

  // Remove listeners to prevent memory leaks
  removePlayAudioListener: () => ipcRenderer.removeAllListeners("play-audio"),
  removeStopAudioListener: () => ipcRenderer.removeAllListeners("stop-audio"),
  removeEndAudioListener: () => ipcRenderer.removeAllListeners("end-audio"),
});

contextBridge.exposeInMainWorld("overlayManagerAPI", {
  resumeWakeUp: () => ipcRenderer.invoke("resume-wakeup"),

  //Event listeners
  onToggleOverlay: (callback: () => void) =>
    ipcRenderer.on("toggle-overlay", () => callback()),

  onWakeUpCommand: (callback: () => void) =>
    ipcRenderer.on("wake-up-command", () => callback()),

  //remove listeners
  removeToggleOverlayListener: () =>
    ipcRenderer.removeAllListeners("toggle-overlay"),

  removeWakeUpCommandListener: () =>
    ipcRenderer.removeAllListeners("wake-up-command"),
});
