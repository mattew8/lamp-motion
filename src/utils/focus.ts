const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "details",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type MaybeHTMLElement = HTMLElement | null;

type FocusTarget = HTMLElement | SVGElement;

export function focusFirst(element: MaybeHTMLElement) {
  if (!element) return;
  const focusable = getFocusableElements(element);
  const node = focusable[0];
  if (node && "focus" in node) {
    node.focus();
  } else {
    element.focus({ preventScroll: true });
  }
}

export function restoreFocus(target: Element | null) {
  if (target && "focus" in target) {
    (target as FocusTarget).focus({ preventScroll: true });
  }
}

export function getFocusableElements(container: MaybeHTMLElement) {
  if (!container) return [] as FocusTarget[];
  return Array.from(container.querySelectorAll<FocusTarget>(focusableSelector));
}

export function containsFocus(container: MaybeHTMLElement) {
  if (!container) return false;
  return container.contains(document.activeElement);
}
