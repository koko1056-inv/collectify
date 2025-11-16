import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useNavigate } from 'react-router-dom';
import { Search, Heart, CheckCircle, Sparkles } from 'lucide-react';
import { InitialInterestSelection } from '@/components/InitialInterestSelection';

interface OnboardingWalkthroughProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingWalkthrough({ open, onClose }: OnboardingWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { completeWalkthrough } = useOnboarding();
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    completeWalkthrough();
    onClose();
    navigate('/search');
  };

  const handleSkip = () => {
    completeWalkthrough();
    onClose();
  };

  const steps = [
    {
      id: 'interests',
      title: 'ようこそ！',
      component: <InterestStep onComplete={handleNext} />,
      showNavigation: false,
    },
    {
      id: 'search',
      title: 'グッズを探そう',
      icon: Search,
      description: '好きな作品のグッズを検索して見つけることができます。検索バーから作品名やキャラクター名で探してみましょう。',
      image: '🔍',
      showNavigation: true,
    },
    {
      id: 'collection',
      title: 'コレクションに追加',
      icon: Heart,
      description: 'ハートアイコンをタップすると、グッズをあなたのコレクションに追加できます。持っているグッズを記録しましょう！',
      image: '❤️',
      showNavigation: true,
    },
    {
      id: 'complete',
      title: '準備完了！',
      icon: CheckCircle,
      description: 'これで準備は完了です！グッズの検索、コレクション管理、他のコレクターとの交流を楽しんでください。',
      image: '🎉',
      showNavigation: true,
    },
  ];

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {currentStepData.showNavigation ? (
          <div className="p-6 space-y-6">
            <div className="text-center space-y-4">
              <div className="text-6xl">{currentStepData.image}</div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
                <p className="text-muted-foreground">{currentStepData.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-primary'
                      : 'w-2 bg-muted'
                  }`}
                />
              ))}
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                スキップ
              </Button>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" onClick={handleBack}>
                    戻る
                  </Button>
                )}
                <Button onClick={handleNext}>
                  {currentStep === steps.length - 1 ? '始める' : '次へ'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          currentStepData.component
        )}
      </DialogContent>
    </Dialog>
  );
}

function InterestStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="p-6 space-y-4">
      <div className="text-center space-y-2 mb-6">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">ようこそ Collectify へ！</h2>
        </div>
        <p className="text-muted-foreground">
          まずは、あなたの好きな作品を教えてください
        </p>
      </div>
      
      <InitialInterestSelection onComplete={onComplete} />
    </div>
  );
}
