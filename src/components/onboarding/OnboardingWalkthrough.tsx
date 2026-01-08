import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Heart, 
  CheckCircle, 
  Sparkles, 
  FolderOpen, 
  Users, 
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
  Gift,
  Home,
  ArrowRightLeft,
  Plus
} from 'lucide-react';
import { InitialInterestSelection } from '@/components/InitialInterestSelection';
import { motion, AnimatePresence } from 'framer-motion';

// スクリーンショット画像
import guideSearchImg from "@/assets/guide-search.png";
import guideCommunityImg from "@/assets/guide-community.png";
import guideCollectionImg from "@/assets/guide-collection.png";
import guideHomeImg from "@/assets/guide-home.png";
import guidePostsImg from "@/assets/guide-posts.png";

interface OnboardingWalkthroughProps {
  open: boolean;
  onClose: () => void;
}

interface WalkthroughStep {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  image?: string;
  icon?: React.ComponentType<{ className?: string }>;
  color: string;
  tips?: string[];
  showNavigation: boolean;
  component?: React.ReactNode;
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

  const steps: WalkthroughStep[] = [
    {
      id: 'welcome',
      title: 'Collectify へようこそ！',
      subtitle: '推しグッズを記録・管理・共有',
      description: 'まずは、あなたの好きな作品を教えてください。おすすめのグッズを表示します！',
      icon: Sparkles,
      color: 'from-primary to-primary/60',
      showNavigation: false,
      component: <InterestStep />,
    },
    {
      id: 'search',
      title: 'グッズを発見しよう',
      subtitle: 'STEP 1',
      description: '作品名やタグで検索して、欲しいグッズを簡単に発見。ハートアイコンでウィッシュリストに追加できます。',
      image: guideSearchImg,
      icon: Search,
      color: 'from-blue-500 to-cyan-500',
      tips: [
        '検索バーでキーワード入力',
        'コンテンツやタグでフィルター',
        '気になるグッズをタップ'
      ],
      showNavigation: true,
    },
    {
      id: 'collection',
      title: 'コレクションを管理',
      subtitle: 'STEP 2',
      description: '持っているグッズを登録して一覧で管理。購入日や価格、思い出の写真も一緒に保存できます。',
      image: guideCollectionImg,
      icon: FolderOpen,
      color: 'from-green-500 to-emerald-500',
      tips: [
        'グッズをコレクションに追加',
        '詳細情報やメモを記録',
        'タグで整理して検索しやすく'
      ],
      showNavigation: true,
    },
    {
      id: 'community',
      title: 'コミュニティで交流',
      subtitle: 'STEP 3',
      description: '投稿でグッズを紹介したり、他のコレクターと交流。いいねやコメントで盛り上がろう！',
      image: guideCommunityImg,
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      tips: [
        '写真付きで投稿を作成',
        'いいね・コメントで交流',
        '気になるユーザーをフォロー'
      ],
      showNavigation: true,
    },
    {
      id: 'features',
      title: '便利な機能がいっぱい！',
      subtitle: 'もっと楽しく',
      description: 'グッズの交換やマイルーム、AIアバター生成など、コレクションをもっと楽しくする機能が満載です。',
      icon: Gift,
      color: 'from-amber-500 to-orange-500',
      showNavigation: true,
    },
    {
      id: 'complete',
      title: '準備完了！',
      subtitle: 'さっそく始めましょう',
      description: 'グッズの検索、コレクション管理、他のコレクターとの交流を楽しんでください。詳しい使い方は「使い方」ページでいつでも確認できます。',
      icon: CheckCircle,
      color: 'from-primary to-primary/60',
      showNavigation: true,
    },
  ];

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === 0 ? (
              // 興味選択ステップ
              <div className="p-6 space-y-4">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${currentStepData.color}`}>
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
                  <p className="text-muted-foreground">{currentStepData.description}</p>
                </div>
                
                <InitialInterestSelection onComplete={handleNext} standalone />
              </div>
            ) : currentStepData.id === 'features' ? (
              // 便利な機能ステップ
              <FeaturesStep stepData={currentStepData} />
            ) : currentStepData.image ? (
              // 画像付きステップ
              <ImageStep stepData={currentStepData} />
            ) : (
              // 完了ステップ
              <CompleteStep stepData={currentStepData} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* ナビゲーション */}
        {currentStepData.showNavigation && (
          <div className="p-4 border-t bg-muted/30">
            {/* プログレスドット */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-primary'
                      : index < currentStep
                      ? 'w-2 bg-primary/50'
                      : 'w-2 bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>

            <div className="flex justify-between items-center">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                スキップ
              </Button>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" onClick={handleBack} size="icon">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}
                <Button onClick={handleNext} className={`bg-gradient-to-r ${currentStepData.color}`}>
                  {currentStep === steps.length - 1 ? (
                    <>
                      始める
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      次へ
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// 興味選択ステップ
function InterestStep() {
  return null; // InitialInterestSelectionを直接使用
}

// 画像付きステップ
function ImageStep({ stepData }: { stepData: WalkthroughStep }) {
  const Icon = stepData.icon;
  
  return (
    <div className="flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 pb-2">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={`p-2 rounded-xl bg-gradient-to-br ${stepData.color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            {stepData.subtitle && (
              <Badge variant="secondary" className="mb-1 text-xs">
                {stepData.subtitle}
              </Badge>
            )}
            <h2 className="text-xl font-bold">{stepData.title}</h2>
          </div>
        </div>
      </div>

      {/* 画像 */}
      <div className="relative mx-4 rounded-xl overflow-hidden border shadow-lg">
        <div className={`absolute inset-0 bg-gradient-to-br ${stepData.color} opacity-5`} />
        <img 
          src={stepData.image} 
          alt={stepData.title}
          className="w-full h-auto max-h-[40vh] object-cover object-top"
        />
      </div>

      {/* 説明とヒント */}
      <div className="p-4 space-y-3">
        <p className="text-muted-foreground text-sm">{stepData.description}</p>
        
        {stepData.tips && stepData.tips.length > 0 && (
          <div className="space-y-2">
            {stepData.tips.map((tip, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${stepData.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {index + 1}
                </div>
                <span className="text-sm">{tip}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 便利な機能ステップ
function FeaturesStep({ stepData }: { stepData: WalkthroughStep }) {
  const Icon = stepData.icon;
  
  const features = [
    { icon: Plus, title: 'グッズを追加', description: '発見ページからワンタップで追加', color: 'bg-blue-500' },
    { icon: Heart, title: 'ウィッシュリスト', description: '欲しいグッズをブックマーク', color: 'bg-pink-500' },
    { icon: ArrowRightLeft, title: 'トレード', description: 'グッズを交換できる機能', color: 'bg-orange-500' },
    { icon: Home, title: 'マイルーム', description: 'グッズを飾れるバーチャル空間', color: 'bg-purple-500' },
    { icon: Sparkles, title: 'AIアバター', description: 'オリジナルアバターを生成', color: 'bg-cyan-500' },
    { icon: Gift, title: 'ポイント', description: '活動でポイントが貯まる', color: 'bg-amber-500' },
  ];

  return (
    <div className="p-6 space-y-4">
      {/* ヘッダー */}
      <div className="text-center space-y-2">
        {Icon && (
          <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${stepData.color}`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
        )}
        <h2 className="text-2xl font-bold">{stepData.title}</h2>
        <p className="text-muted-foreground text-sm">{stepData.description}</p>
      </div>

      {/* 機能グリッド */}
      <div className="grid grid-cols-2 gap-3">
        {features.map((feature) => (
          <div 
            key={feature.title}
            className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className={`p-2 rounded-lg ${feature.color} shrink-0`}>
              <feature.icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-sm">{feature.title}</h3>
              <p className="text-xs text-muted-foreground truncate">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 完了ステップ
function CompleteStep({ stepData }: { stepData: WalkthroughStep }) {
  const Icon = stepData.icon;
  const navigate = useNavigate();

  return (
    <div className="p-8 text-center space-y-6">
      {Icon && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className={`inline-flex p-4 rounded-3xl bg-gradient-to-br ${stepData.color}`}
        >
          <Icon className="w-12 h-12 text-white" />
        </motion.div>
      )}
      
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">{stepData.title}</h2>
        <p className="text-muted-foreground">{stepData.description}</p>
      </div>

      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/how-to-use')}
          className="text-muted-foreground"
        >
          詳しい使い方を見る
        </Button>
      </div>
    </div>
  );
}
