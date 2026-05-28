import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

let handler: WebWorkerMLCEngineHandler | null = null;

// Initialize WebWorkerMLCEngineHandler inside the worker
try {
  handler = new WebWorkerMLCEngineHandler();
} catch (error) {
  console.error("Failed to initialize WebWorkerMLCEngineHandler:", error);
}

self.onmessage = (msg: MessageEvent) => {
  if (handler) {
    handler.onmessage(msg);
  } else {
    console.warn("WebWorkerMLCEngineHandler is not initialized. Message ignored:", msg);
  }
};
