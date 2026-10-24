export interface PickedElement {
  selector: string;
  label: string;
  score: number;
}

/**
 * Runs only after the user starts the picker, and returns a serializable
 * selection. Kept as a string so both the webview and the native
 * WebContentsView engine can execute the same script.
 */
export const PICK_ELEMENT_SCRIPT = String.raw`(() => new Promise((resolve) => {
    const style = document.createElement('style');
    style.dataset.orbPicker = 'true';
    style.textContent = '[data-orb-picker-hover="true"]{outline:2px solid #a0522d!important;outline-offset:2px!important;cursor:crosshair!important}';
    document.documentElement.appendChild(style);
    const tip = document.createElement('div');
    tip.dataset.orbPicker = 'true';
    tip.textContent = 'Choose an element to hide · Esc to cancel';
    Object.assign(tip.style,{position:'fixed',top:'12px',right:'12px',zIndex:'2147483647',padding:'9px 12px',borderRadius:'7px',background:'#292524',color:'#faf9f6',font:'12px system-ui,sans-serif',pointerEvents:'none',boxShadow:'0 2px 8px rgba(0,0,0,.18)'});
    document.documentElement.appendChild(tip);

    let hovered = null;
    let priorOutline = null;
    let settled = false;
    const timer = setTimeout(() => finish(null), 60000);
    function finish(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('pointerout', onPointerOut, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      if (hovered) {
        if (priorOutline.value) hovered.style.setProperty('outline', priorOutline.value, priorOutline.priority);
        else hovered.style.removeProperty('outline');
        hovered.removeAttribute('data-orb-picker-hover');
      }
      style.remove();
      tip.remove();
      try { window.orbPageApi?.reportPickedElement?.(result); } catch {}
      resolve(result);
    }
    function onPointerOver(event) {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('[data-orb-picker]')) return;
      if (hovered && hovered !== target) hovered.removeAttribute('data-orb-picker-hover');
      hovered = target;
      priorOutline = { value: hovered.style.getPropertyValue('outline'), priority: hovered.style.getPropertyPriority('outline') };
      hovered.setAttribute('data-orb-picker-hover', 'true');
    }
    function onPointerOut(event) {
      if (hovered && event.target === hovered) hovered.removeAttribute('data-orb-picker-hover');
    }
    function quote(value) { return JSON.stringify(value); }
    function selectorFor(element) {
      if (element === document.documentElement) return { selector: 'html', score: 0 };
      if (element === document.body) return { selector: 'body', score: 0 };
      const candidates = [];
      const testId = element.getAttribute('data-testid') || element.getAttribute('data-test-id');
      if (testId) candidates.push({ selector: '[data-testid=' + quote(testId) + ']', score: 1 });
      const aria = element.getAttribute('aria-label');
      if (aria) candidates.push({ selector: element.tagName.toLowerCase() + '[aria-label=' + quote(aria) + ']', score: 0.8 });
      if (element instanceof HTMLAnchorElement && element.getAttribute('href')) candidates.push({ selector: 'a[href=' + quote(element.getAttribute('href')) + ']', score: 0.6 });
      const role = element.getAttribute('role');
      const tag = element.tagName.toLowerCase();
      const semantic = /^(a|button|input|textarea|select|nav|header|footer|main|article|section|aside|dialog|form|label)$/.test(tag);
      if (role) candidates.push({ selector: tag + '[role=' + quote(role) + ']', score: 0.5 });
      if (semantic) candidates.push({ selector: tag, score: 0.5 });
      const classes = Array.from(element.classList).filter(name => /^[a-z][a-z0-9_-]{1,40}$/i.test(name));
      if (classes.length) {
        const selector = tag + '.' + classes.map(name => CSS.escape(name)).join('.');
        const looksGenerated = classes.some(name => /[a-f0-9]{8,}|^[a-z]{1,2}\d{3,}/i.test(name));
        candidates.push({ selector, score: looksGenerated ? -1 : 0.2 });
      }
      candidates.sort((a,b) => b.score - a.score);
      for (const candidate of candidates) {
        try { if (document.querySelectorAll(candidate.selector).length === 1 && document.querySelector(candidate.selector) === element) return candidate; } catch {}
      }

      // Fall back to the shortest unique semantic ancestry plus a positional segment.
      const chain = [];
      let node = element;
      while (node && node !== document.documentElement) {
        const nodeTag = node.tagName.toLowerCase();
        if (node.id && /^[a-z][\w-]{0,48}$/i.test(node.id) && !/[a-f0-9]{8,}/i.test(node.id)) {
          chain.unshift(nodeTag + '[id=' + quote(node.id) + ']');
        } else {
          const siblings = node.parentElement ? Array.from(node.parentElement.children).filter(sibling => sibling.tagName === node.tagName) : [];
          chain.unshift(nodeTag + (siblings.length > 1 ? ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')' : ''));
        }
        const selector = chain.join(' > ');
        try { if (document.querySelectorAll(selector).length === 1) return { selector, score: 0 }; } catch {}
        node = node.parentElement;
      }
      return { selector: chain.join(' > '), score: 0 };
    }
    function onClick(event) {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('[data-orb-picker]')) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const candidate = selectorFor(target);
      finish({ selector: candidate.selector, label: (target.getAttribute('aria-label') || target.textContent || target.tagName).trim().replace(/\s+/g, ' ').slice(0, 80), score: candidate.score });
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); finish(null); }
    }
    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('pointerout', onPointerOut, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
  }))()`;
