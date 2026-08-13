// Cloudflare Turnstile 全局类型声明
interface TurnstileObject {
  render: (
    element: HTMLElement | null,
    options: {
      sitekey: string;
      callback?: (token: string) => void;
      'error-callback'?: () => void;
      'expired-callback'?: () => void;
    }
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileObject;
  }
}

export {};
