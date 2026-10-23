import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Privacy from '@/components/Privacy';
import Waitlist from '@/components/Waitlist';
import Footer from '@/components/Footer';

export default function Page() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <Features />
      <Privacy />
      <Waitlist />
      <Footer />
    </main>
  );
}
