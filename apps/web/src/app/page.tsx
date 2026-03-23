import { Hero } from "@/components/hero";
import { Architecture } from "@/components/architecture";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Architecture />
      <Footer />
    </main>
  );
}
