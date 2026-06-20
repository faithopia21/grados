import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  placement: 'bottom' | 'top' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-add-school',
    title: 'Add your first school',
    description:
      'Click here to add a graduate school and start tracking your application.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-nav-applications',
    title: 'All your applications',
    description:
      'See every application you have added, with search, filter, and sort.',
    placement: 'right',
  },
  {
    targetId: 'tour-nav-deadlines',
    title: 'Never miss a deadline',
    description:
      'Track every deadline in one place and export them to your calendar.',
    placement: 'right',
  },
  {
    targetId: 'tour-nav-documents',
    title: 'Your document library',
    description:
      'Upload your SOP, CV, and transcripts once — reuse them across every application.',
    placement: 'right',
  },
  {
    targetId: 'tour-nav-settings',
    title: 'Settings and support',
    description:
      'Manage your account, get help, and export your application data anytime.',
    placement: 'right',
  },
];

export function ProductTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    checkShouldShowTour();
  }, []);

  const checkShouldShowTour = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('product_tour_completed')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && !profile.product_tour_completed) {
      // Small delay to let the dashboard fully render first
      setTimeout(() => {
        setIsActive(true);
        setCurrentStep(0);
      }, 800);
    }
  };

  useEffect(() => {
    if (!isActive) return;

    const step = TOUR_STEPS[currentStep];
    const element = document.getElementById(step.targetId);

    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // Element not found (e.g. mobile sidebar hidden) — skip to next available step
      if (currentStep < TOUR_STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleFinish();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = async () => {
    setIsActive(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ product_tour_completed: true })
        .eq('id', user.id);
    }
  };

  if (!isActive || !targetRect) return null;

  const step = TOUR_STEPS[currentStep];

  // Calculate tooltip position based on placement
  const getTooltipStyle = (): React.CSSProperties => {
    const gap = 12;
    switch (step.placement) {
      case 'bottom':
        return {
          top: targetRect.bottom + gap,
          left: Math.max(16, targetRect.left),
        };
      case 'right':
        return {
          top: targetRect.top,
          left: targetRect.right + gap,
        };
      case 'top':
        return {
          top: targetRect.top - gap - 140,
          left: targetRect.left,
        };
      case 'left':
        return {
          top: targetRect.top,
          left: targetRect.left - gap - 280,
        };
      default:
        return { top: targetRect.bottom + gap, left: targetRect.left };
    }
  };

  return (
    <>
      {/* Dimmed backdrop with spotlight cutout */}
      <div
        className="fixed inset-0 z-[100]"
        style={{
          background: 'rgba(0,0,0,0.6)',
          clipPath: `polygon(
            0% 0%, 0% 100%,
            ${targetRect.left - 4}px 100%,
            ${targetRect.left - 4}px ${targetRect.top - 4}px,
            ${targetRect.right + 4}px ${targetRect.top - 4}px,
            ${targetRect.right + 4}px ${targetRect.bottom + 4}px,
            ${targetRect.left - 4}px ${targetRect.bottom + 4}px,
            ${targetRect.left - 4}px 100%,
            100% 100%, 100% 0%
          )`,
        }}
        onClick={handleSkip}
      />

      {/* Highlight ring around target */}
      <div
        className="fixed z-[101] border-2 border-indigo-500 rounded-lg pointer-events-none transition-all duration-300"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
        }}
      />

      {/* Tooltip card */}
      <div
        className="fixed z-[102] w-72 bg-background border border-border rounded-xl shadow-2xl p-4 transition-all duration-300"
        style={getTooltipStyle()}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
          <button
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground flex-shrink-0 ml-2"
            aria-label="Close tour"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">{step.description}</p>

        <div className="flex items-center justify-between">
          {/* Step dots */}
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentStep ? 'bg-indigo-600' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="p-1.5 rounded-lg hover:bg-accent"
                aria-label="Previous step"
              >
                <ChevronLeft size={14} />
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
              {currentStep < TOUR_STEPS.length - 1 && <ChevronRight size={12} />}
            </button>
          </div>
        </div>

        <button
          onClick={handleSkip}
          className="text-xs text-muted-foreground hover:underline mt-3 block"
        >
          Skip tour
        </button>
      </div>
    </>
  );
}
