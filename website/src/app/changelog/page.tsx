import SectionHeader from '@/components/SectionHeader';
import Changelog from '@/components/Changelog';

export default function ChangelogPage() {
  return (
    <main className="px-6 pb-24 pt-24 md:pb-32">
      <div className="mx-auto max-w-4xl">
        <SectionHeader
          label="Changelog"
          title="What has shipped."
          description=
            {'Orb is built in the open. This is the honest record of what has landed, in the order it landed.'}
        />
        <Changelog />
      </div>
    </main>
  );
}
