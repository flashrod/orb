export interface PickedCandidate {
  selector: string;
  score: number;
}

export interface PickedElement {
  selector: string;
  label: string;
  score: number;
  /** Ranked alternatives for the same element, best first. */
  candidates?: PickedCandidate[];
}

/**
 * Runs only after the user starts the picker, and returns a serializable
 * selection. Kept as a string so both the webview and the native
 * WebContentsView engine can execute the same script.
 *
 * The picker ranks stable selectors (test ids, aria labels, ids) above
 * generated utility classes, and lets the user widen to an ancestor or narrow
 * to a child before saving. Hovering is the live preview.
 */
export const PICK_ELEMENT_SCRIPT = String.raw`(() => new Promise((resolve) => {
    const style = document.createElement('style');
    style.dataset.orbPicker = 'true';
    style.textContent = '[data-orb-picker-hover="true"]{outline:2px solid #a0522d!important;outline-offset:2px!important;cursor:crosshair!important}[data-orb-picker-selected="true"]{outline:3px solid #a0522d!important;outline-offset:2px!important}';
    document.documentElement.appendChild(style);

    const tip = document.createElement('div');
    tip.dataset.orbPicker = 'true';
    tip.textContent = 'Click an element · Widen/Narrow in the panel · Esc to cancel';
    Object.assign(tip.style,{position:'fixed',top:'12px',right:'12px',zIndex:'2147483647',padding:'9px 12px',borderRadius:'7px',background:'#292524',color:'#faf9f6',font:'12px system-ui,sans-serif',pointerEvents:'none',boxShadow:'0 2px 8px rgba(0,0,0,.18)'});
    document.documentElement.appendChild(tip);

    const panel = document.createElement('div');
    panel.dataset.orbPicker = 'true';
    Object.assign(panel.style,{position:'fixed',right:'12px',bottom:'12px',zIndex:'2147483647',width:'320px',padding:'12px',borderRadius:'10px',background:'#292524',color:'#faf9f6',font:'12px/1.5 system-ui,sans-serif',boxShadow:'0 8px 24px rgba(0,0,0,.28)',display:'none'});
    document.documentElement.appendChild(panel);

    const panelTitle = document.createElement('div');
    panelTitle.textContent = 'Boost element';
    Object.assign(panelTitle.style,{fontWeight:'600',marginBottom:'6px'});
    panel.appendChild(panelTitle);

    const panelLabel = document.createElement('div');
    Object.assign(panelLabel.style,{opacity:'0.75',marginBottom:'6px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'});
    panel.appendChild(panelLabel);

    const panelCode = document.createElement('code');
    Object.assign(panelCode.style,{display:'block',padding:'6px 8px',borderRadius:'6px',background:'rgba(255,255,255,.08)',fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',fontSize:'11px',maxHeight:'88px',overflow:'auto',wordBreak:'break-all',marginBottom:'8px'});
    panel.appendChild(panelCode);

    const row = document.createElement('div');
    Object.assign(row.style,{display:'flex',flexWrap:'wrap',gap:'6px'});
    panel.appendChild(row);

    function makeButton(text, onClick, accent) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      Object.assign(button.style,{border:'0',borderRadius:'6px',padding:'6px 8px',font:'11px system-ui,sans-serif',cursor:'pointer',background:accent?'#a0522d':'#44403c',color:'#faf9f6'});
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      });
      return button;
    }

    let hovered = null;
    let locked = null;
    let anchor = null;
    let candidates = [];
    let candidateIndex = 0;
    let settled = false;
    const timer = setTimeout(() => finish(null), 60000);

    function clearAttribute(element, attribute) {
      if (element) element.removeAttribute(attribute);
    }

    function finish(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('pointerout', onPointerOut, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      clearAttribute(hovered, 'data-orb-picker-hover');
      clearAttribute(locked, 'data-orb-picker-selected');
      style.remove();
      tip.remove();
      panel.remove();
      try { window.orbPageApi?.reportPickedElement?.(result); } catch {}
      resolve(result);
    }

    function quote(value) { return JSON.stringify(value); }

    function classScore(name) {
      if (/(^|[-_])(?:[a-z]{1,2}\d{3,}|[a-f0-9]{8,})([-_]|$)|^(?:css|sc|jsx|emotion|styled|chakra)[-_]/i.test(name)) return -2;
      if (/(cookie|consent|banner|modal|dialog|popup|overlay|sidebar|nav|header|footer|menu|search|comment|card|article|content|promo|advert|sponsor|subscribe|newsletter|toolbar|dropdown|toast|notice)/i.test(name)) return 0.8;
      if (name.length >= 3 && name.length <= 28) return 0.1;
      return -0.5;
    }

    function selectorFor(element) {
      if (element === document.documentElement) return { selector: 'html', score: 0, candidates: [{ selector: 'html', score: 0 }] };
      if (element === document.body) return { selector: 'body', score: 0, candidates: [{ selector: 'body', score: 0 }] };

      const tag = element.tagName.toLowerCase();
      const found = [];
      const add = (selector, score) => {
        if (!selector) return;
        try {
          const matches = document.querySelectorAll(selector);
          if (matches.length === 1 && matches[0] === element && !found.some((candidate) => candidate.selector === selector)) {
            found.push({ selector, score });
          }
        } catch {}
      };

      for (const attribute of ['data-testid', 'data-test-id', 'data-test', 'data-qa', 'data-cy']) {
        const value = element.getAttribute(attribute);
        if (value) add('[' + attribute + '=' + quote(value) + ']', 3);
      }

      const id = element.getAttribute('id');
      if (id && /^[a-z][\w-]{0,48}$/i.test(id) && !/[a-f0-9]{8,}/i.test(id)) add('#' + CSS.escape(id), 2.8);

      const aria = element.getAttribute('aria-label');
      if (aria) add(tag + '[aria-label=' + quote(aria) + ']', 2.4);

      const name = element.getAttribute('name');
      if (name) add(tag + '[name=' + quote(name) + ']', 2.0);

      if (element instanceof HTMLAnchorElement && element.getAttribute('href')) add('a[href=' + quote(element.getAttribute('href')) + ']', 1.8);

      const role = element.getAttribute('role');
      if (role) add(tag + '[role=' + quote(role) + ']', 1.6);

      const semantic = /^(a|button|input|textarea|select|nav|header|footer|main|article|section|aside|dialog|form|label)$/.test(tag);
      if (semantic) add(tag, 1.2);

      const classes = Array.from(element.classList)
        .filter((className) => /^[a-z][a-z0-9_-]{1,40}$/i.test(className))
        .map((className) => ({ className, score: classScore(className) }))
        .sort((a, b) => b.score - a.score);
      const stable = classes.filter((item) => item.score >= 0).slice(0, 3);
      if (stable.length) {
        const selector = tag + '.' + stable.map((item) => CSS.escape(item.className)).join('.');
        add(selector, 1.0 + stable.reduce((sum, item) => sum + item.score, 0) / stable.length);
      }
      for (const item of classes.slice(0, 2)) {
        if (item.score > 0) add(tag + '.' + CSS.escape(item.className), 0.7 + item.score);
      }

      const chain = [];
      let node = element;
      while (node && node !== document.documentElement) {
        const nodeTag = node.tagName.toLowerCase();
        if (node.id && /^[a-z][\w-]{0,48}$/i.test(node.id) && !/[a-f0-9]{8,}/i.test(node.id)) {
          chain.unshift(nodeTag + '[id=' + quote(node.id) + ']');
        } else {
          const siblings = node.parentElement ? Array.from(node.parentElement.children).filter((sibling) => sibling.tagName === node.tagName) : [];
          chain.unshift(nodeTag + (siblings.length > 1 ? ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')' : ''));
        }
        const selector = chain.join(' > ');
        try {
          if (document.querySelectorAll(selector).length === 1 && !found.some((candidate) => candidate.selector === selector)) {
            found.push({ selector, score: 0.4 - chain.length * 0.02 });
          }
        } catch {}
        node = node.parentElement;
      }

      found.sort((a, b) => b.score - a.score || a.selector.length - b.selector.length);
      const defaultSelector = found[0]?.selector || tag;
      return { selector: defaultSelector, score: found[0]?.score || 0, candidates: found.slice(0, 5) };
    }

    function labelFor(element) {
      const label = element.getAttribute('aria-label') || element.textContent || element.tagName;
      return label.trim().replace(/\s+/g, ' ').slice(0, 80);
    }

    function renderPanel() {
      if (!locked) return;
      const candidate = candidates[candidateIndex] || candidates[0];
      panelLabel.textContent = labelFor(locked) || locked.tagName.toLowerCase();
      panelCode.textContent = candidate ? candidate.selector : locked.tagName.toLowerCase();
      row.textContent = '';
      row.appendChild(makeButton('Widen', () => {
        const parent = locked?.parentElement;
        if (parent && parent !== document.documentElement) selectElement(parent);
      }));
      row.appendChild(makeButton('Narrow', () => {
        const child = locked ? Array.from(locked.children).find((item) => item instanceof HTMLElement) : null;
        if (child) selectElement(child);
      }));
      row.appendChild(makeButton('Reset', () => { if (anchor) selectElement(anchor); }));
      row.appendChild(makeButton('Next match', () => {
        if (candidates.length < 2) return;
        candidateIndex = (candidateIndex + 1) % candidates.length;
        renderPanel();
      }));
      row.appendChild(makeButton('Save', save, true));
      row.appendChild(makeButton('Cancel', () => finish(null)));
      panel.style.display = 'block';
    }

    function selectElement(element) {
      if (!element || element.closest('[data-orb-picker]')) return;
      if (locked) locked.removeAttribute('data-orb-picker-selected');
      locked = element;
      locked.setAttribute('data-orb-picker-selected', 'true');
      const result = selectorFor(element);
      candidates = result.candidates && result.candidates.length ? result.candidates : [{ selector: result.selector, score: result.score }];
      candidateIndex = 0;
      renderPanel();
    }

    function save() {
      if (!locked) return;
      const candidate = candidates[candidateIndex] || candidates[0];
      finish({
        selector: candidate ? candidate.selector : selectorFor(locked).selector,
        label: labelFor(locked),
        score: candidate ? candidate.score : 0,
        candidates: candidates.map((item) => ({ selector: item.selector, score: item.score })),
      });
    }

    function onPointerOver(event) {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('[data-orb-picker]')) return;
      if (hovered && hovered !== target) hovered.removeAttribute('data-orb-picker-hover');
      hovered = target;
      hovered.setAttribute('data-orb-picker-hover', 'true');
    }

    function onPointerOut(event) {
      if (hovered && event.target === hovered) hovered.removeAttribute('data-orb-picker-hover');
    }

    function onClick(event) {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('[data-orb-picker]')) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      anchor = target;
      selectElement(target);
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        finish(null);
      } else if (event.key === 'Enter' && locked) {
        event.preventDefault();
        event.stopImmediatePropagation();
        save();
      }
    }

    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('pointerout', onPointerOut, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
  }))()`;
