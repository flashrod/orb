import { PICK_ELEMENT_SCRIPT, type PickedElement } from '../../shared/elementPicker';

export type { PickedElement } from '../../shared/elementPicker';

/** Runs only after the user starts the picker, and returns a serializable selection. */
export function pickPageElement(webview: HTMLWebViewElement): Promise<PickedElement | null> {
  return (webview as any).executeJavaScript(PICK_ELEMENT_SCRIPT, true) as Promise<PickedElement | null>;
}
