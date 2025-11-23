import Layout from "@/components/layout";
import TypingTest from "@/components/typing-test";
import generatedImage from '@assets/generated_images/subtle_dark_geometric_pattern_background_for_typing_app.png';

export default function Home() {
  return (
    <Layout>
      <div className="relative">
         {/* Ambient Background */}
        <div className="fixed inset-0 z-[-1] opacity-20 pointer-events-none">
           <img src={generatedImage} alt="" className="w-full h-full object-cover" />
           <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
        </div>

        <div className="flex flex-col items-center gap-4 mb-12">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-center bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/40">
            Master the Flow
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl text-center">
            Test your typing speed, track your progress, and compete with others in a distraction-free environment.
          </p>
        </div>

        <TypingTest />
      </div>
    </Layout>
  );
}
