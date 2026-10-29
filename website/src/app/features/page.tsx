import FeatureGrid from '@/components/FeatureGrid';
import SectionHeader from '@/components/SectionHeader';

export default function FeaturesPage() {
  return (
    <main className="px-6 pb-24 pt-24 md:pb-32 md:pt-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          label="Features"
          title="Everything Orb ships."
          description=
            {'No feature grid for its own sake. These are the parts of Orb that remove friction, each one real and already in the build.'}
        />
        <FeatureGrid />
      </div>
    </main>
  );
}
