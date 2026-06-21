import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TourStep {
  targetId: string;
  mobileTargetId?: string;
  title: string;
  description: string;
  placement: 'bottom' | 'top' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-add-school',
    mobileTargetId: 'tour-add-school-mobile',
    title: 'Add your first school',
    description:
      'Tap here to add a graduate school and start tracking your application.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-nav-applications',
    mobileTargetId: 'tour-nav-applications-mobile',
    title: 'All your applications',
    description:
      'See every application you have added, with search, filter, and sort.',
    placement: 'right',
  },
  {
    targetId: 'tour-nav-deadlines',
    mobileTargetId: 'tour-nav-deadlines-mobile',
    title: 'Never miss a deadline',
    description:
      'Track every deadline in one place and export them to your calendar.',
    placement: 'right',
  },
  {
    targetId: 'tour-nav-documents',
    mobileTargetId: 'tour-nav-documents-mobile',
    title: 'Your document library',
    description:
      'Upload your SOP, CV, and transcripts once — reuse them across every application.',
    placement: 'right',
  },
  {
    targetId: 'tour-nav-settings',
    mobileTargetId: 'tour-nav-settings-mobile',
    title: 'Settings and support',
    description:
      'Manage your account, get help, and export your application data anytime.',
    placement: 'right',
  },
];

function getVisibleElement(step: TourStep): HTMLElement | null {
  const isMobile = window.innerWidth < 768;

  const tryId = (id: string): HTMLElement | null => {
    const el = document.getElementById(id);
    if (!el) return null;
    // offsetParent is null when an element or an ancestor has display: none
    if (el.offsetParent === null) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return el;
  };

  if (isMobile && step.mobileTargetId) {
    const mobileEl = tryId(step.mobileTargetId);
    if (mobileEl) return mobileEl;
  }

  return tryId(step.targetId);
}

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
      .select('onboarding_completed, product_tour_completed')
      .eq('id', user.id)
      .maybeSingle();

    // Only show tour if onboarding IS complete AND tour has NOT been seen
    if (
      profile?.onboarding_completed === true &&
      profile?.product_tour_completed !== true
    ) {
      setTimeout(() => {
        setIsActive(true);
        setCurrentStep(0);
      }, 800);
    }
  };

  // Step change: scroll to element then measure after scroll settles
  useEffect(() => {
    if (!isActive) return;

    const step = TOUR_STEPS[currentStep];

    // Small delay to ensure layout has settled after any previous scroll
    const timer = setTimeout(() => {
      const element = getVisibleElement(step);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Wait for scroll animation to finish before measuring position
        setTimeout(() => {
          const rect = element.getBoundingClientRect();
          setTargetRect(rect);
        }, 350);
      } else {
        // No visible element for this step on this screen size — skip to next step
        if (currentStep < TOUR_STEPS.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          handleFinish();
        }
      }
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep]);

  // Recalculate position on window resize or scroll
  useEffect(() => {
    if (!isActive || !targetRect) return;

    const updateRect = () => {
      const step = TOUR_STEPS[currentStep];
      const element = getVisibleElement(step);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
    };

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isActive, currentStep, targetRect]);

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

  // Calculate tooltip position based on placement, clamped within viewport
  const getTooltipStyle = (): React.CSSProperties => {
    const gap = 12;
    const tooltipWidth = 288; // w-72
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (step.placement) {
      case 'bottom':
        top = targetRect.bottom + gap;
        left = targetRect.left;
        break;
      case 'right':
        top = targetRect.top;
        left = targetRect.right + gap;
        break;
      case 'top':
        top = targetRect.top - gap - 160;
        left = targetRect.left;
        break;
      case 'left':
        top = targetRect.top;
        left = targetRect.left - gap - tooltipWidth;
        break;
    }

    // Clamp within viewport with 16px margin
    left = Math.max(16, Math.min(left, viewportWidth - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, viewportHeight - 200));

    return { top, left };
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
