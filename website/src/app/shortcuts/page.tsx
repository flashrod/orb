import SectionHeader from '@/components/SectionHeader';
import ShortcutTable from '@/components/ShortcutTable';

export default function ShortcutsPage() {
  return (
    <main className="px-6 pb-24 pt-24 md:pb-32">
      <div className="mx-auto max-w-4xl">
        <SectionHeader
          label="Shortcuts"
          title="Keyboard shortcuts."
          description=
            {'Every action lives in a single registry. Defaults ship for Chrome, Safari, and Arc, and every binding can be remapped in Settings.'}
        />
        <ShortcutTable />
      </div>
    </main>
  );
}
