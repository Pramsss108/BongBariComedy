import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

const FreeTools = () => {
  const [, setLocation] = useLocation();
  // Basic head update
  if (typeof document !== 'undefined') {
    document.title = 'Free Tools – Bong Kahini | বং বাড়ি';
  }
  return (
    <div className="pt-36 pb-24 px-6 max-w-5xl mx-auto">
      <div className="text-center mb-14">
        <h1 className="text-4xl md:text-5xl font-extrabold text-brand-blue mb-4 tracking-tight" data-testid="free-tools-title">
          Bong Kahini — <span className="bangla-text">ঘরের গল্প</span>
        </h1>
        <p className="text-lg md:text-xl text-neutral-700 max-w-2xl mx-auto leading-relaxed" data-testid="free-tools-subline">
          A playful corner for the community: soon you can submit real, funny family stories, react, and help curate the top kahini of the week.
        </p>
      </div>
      <div className="flex justify-center">
        <Button size="lg" className="bg-[#0E47FF] hover:bg-[#0c3bd1] text-white px-10 py-6 text-lg rounded-full shadow-lg" onClick={() => setLocation('/community/submit')} data-testid="free-tools-start-story">
          Start Story
        </Button>
      </div>
      <div className="mt-20 text-center text-sm text-neutral-500" data-testid="free-tools-coming-soon">
        Phase 1 stub – submission & moderation flow coming next.
      </div>
    </div>
  );
};

export default FreeTools;
