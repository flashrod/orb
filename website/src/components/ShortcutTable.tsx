'use client';

import Kbd from '@/components/Kbd';
import { shortcuts } from '@/lib/content';

export default function ShortcutTable() {
  return (
    <div className="space-y-8">
      {shortcuts.map((category) => (
        <section
          key={category.category}
          className="border-b border-line pb-6 last:border-0 last:pb-0"
        >
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
            {category.category}
          </h3>
          <table className="mt-4 w-full text-left border-collapse">
            <tbody>
              {category.items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-line/50 last:border-0"
                >
                  <td className="py-3 text-sm text-muted w-1/3">
                    {item.title}
                  </td>
                  <td className="py-3 text-sm text-ink text-right">
                    {item.bindings.length === 0 ? (
                      <span className="text-muted">unbound</span>
                    ) : (
                      item.bindings.map((b, i) => (
                        <Kbd key={i}>{b}</Kbd>
                      ))
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
