import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';

const DailyQuest = () => {
  const { isLoaded, user } = useUser();
  const { getToken } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(null);
  const [error, setError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
const percentage = (score !== null && questions.length > 0)
  ? (score / questions.length) * 100
  : 0;
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Unauthorized. Please log in.');

        const res = await fetch('http://localhost:4000/api/daily-quest', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          },
          credentials: 'include'
        });

        // Handle already submitted case
        if (res.status === 403 || res.status === 409) {
          const data = await res.json();
          if (data.alreadySubmitted && typeof data.score === 'number') {
            setScore(data.score);
            setStarted(true); // Important: Set started to true to show score screen
            return;
          }
          throw new Error('Already submitted today or unauthorized.');
        }

        if (!res.ok) throw new Error('Failed to fetch questions.');

        const data = await res.json();
        setQuestions(data.questions || []);
        setAnswers(new Array(data.questions?.length || 5).fill(null)); // Pre-initialize answers array
      } catch (err) {
        setError(err.message || 'Error fetching questions.');
      }
    };

    if (isLoaded && user) {
      fetchQuestions();
    }
  }, [isLoaded, user, getToken]);

  const handleSelect = (val) => {
    const updated = [...answers];
    updated[currentQuestionIndex] = val;
    setAnswers(updated);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const token = await getToken();

      const res = await fetch('http://localhost:4000/api/daily-quest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ answers })
      });

      if (!res.ok) throw new Error('Submission failed. Please try again.');

      const { score } = await res.json();
      setScore(score);
    } catch (err) {
      setError(err.message || 'Failed to submit answers.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleClaimReward = () => {
    setRewardClaimed(true);
  };

  const goHome = () => {
    window.location.href = '/';
  };

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center pt-24">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-6 h-6 bg-emerald-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-slate-300 text-lg font-medium mb-1">Loading your quest...</h3>
            <p className="text-slate-500 text-sm">Preparing environmental challenges</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error only if score is not set
  if (error && score === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 pt-24">
        <div className="bg-slate-800/90 border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center backdrop-blur-sm">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-semibold text-white mb-3">Quest Unavailable</h3>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={goHome}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Start screen
  if (!started && score === null && questions.length > 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 pt-24">
        <div className="max-w-lg w-full animate-fade-in">
          {/* Header with brain icon */}
          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/30 transform hover:scale-105 transition-transform duration-300">
              <span className="text-4xl">🧠</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Daily Quest
            </h1>
            <p className="text-slate-400 text-xl">Test your environmental knowledge and earn rewards</p>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 text-center backdrop-blur-sm hover:bg-slate-800/80 transition-all duration-300">
              <div className="text-3xl mb-3">🎯</div>
              <div className="text-slate-300 text-sm font-medium">Questions</div>
              <div className="text-white font-bold text-xl">{questions.length}</div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 text-center backdrop-blur-sm hover:bg-slate-800/80 transition-all duration-300">
              <div className="text-3xl mb-3">⏱️</div>
              <div className="text-slate-300 text-sm font-medium">Duration</div>
              <div className="text-white font-bold text-xl">~3 min</div>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={() => setStarted(true)}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-5 px-8 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50"
          >
            <span className="flex items-center justify-center space-x-3">
              <span className="text-lg">Start Quest</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Score/result screen
  if (score !== null) {
    const percentage = (score / questions.length) * 100;
    const isGoodScore = score >= Math.ceil(questions.length * 0.8); // 80% or more is good
    
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 pt-24">
        <div className="max-w-lg w-full text-center animate-fade-in">
          {/* Score Circle */}
          <div className="relative w-40 h-40 mx-auto mb-10">
            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-700"
                strokeWidth="3"
                stroke="currentColor"
                fill="transparent"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${isGoodScore ? 'text-emerald-400' : 'text-yellow-400'} transition-all duration-1000 ease-out`}
                strokeWidth="3"
                strokeDasharray={`${percentage}, 100`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                style={{
                  strokeDasharray: `${percentage}, 100`,
                  animation: 'progressFill 2s ease-out forwards'
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-1">{score}</div>
                <div className="text-slate-400">/ {questions.length}</div>
              </div>
            </div>
          </div>

          {/* Result Message */}
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-white mb-4">
              {isGoodScore ? '🎉 Excellent!' : '💪 Good Try!'}
            </h2>
            <p className="text-slate-400 text-xl leading-relaxed">
              {isGoodScore 
                ? 'You\'re an BinGo-warrior! Your environmental knowledge is impressive.'
                : 'Keep learning about sustainability. Every step counts!'
              }
            </p>
          </div>

          {/* Reward Section */}
          {!rewardClaimed ? (
            <button
              onClick={handleClaimReward}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-5 px-8 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] shadow-2xl shadow-yellow-500/30 hover:shadow-yellow-500/50 mb-8"
            >
              <span className="flex items-center justify-center space-x-3">
                <span className="text-2xl">🎁</span>
                <span className="text-lg">Claim Your Reward</span>
              </span>
            </button>
          ) : (
            <div className="bg-slate-800/60 border-2 border-emerald-500/50 rounded-2xl p-8 mb-8 backdrop-blur-sm">
              <div className="flex items-center justify-center space-x-4 text-emerald-400 mb-2">
                <span className="text-3xl">✅</span>
                <span className="font-bold text-xl">Reward Claimed!</span>
              </div>
              <p className="text-slate-400">Check your profile for updated points</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button 
              onClick={goHome}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200"
            >
              Back to Home
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200"
            >
              Try Again Tomorrow
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz in progress - Guard against empty questions
  if (!questions.length) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center pt-24">
        <div className="text-center text-slate-400">
          <p>No questions available. Please try again later.</p>
        </div>
      </div>
    );
  }

  const q = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header with Progress */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Daily Quest</h1>
              <p className="text-slate-400">Environmental Knowledge Challenge</p>
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-sm">Question</span>
              <div className="text-2xl font-bold text-white">
                {currentQuestionIndex + 1}
                <span className="text-slate-500 text-lg font-normal">/{questions.length}</span>
              </div>
            </div>
          </div>
          
          {/* Enhanced Progress Bar */}
          <div className="relative">
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-3 rounded-full transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="absolute -top-8 left-0 text-xs text-slate-500">Start</div>
            <div className="absolute -top-8 right-0 text-xs text-slate-500">Finish</div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-slate-800/90 border border-slate-700/50 rounded-3xl p-8 shadow-2xl backdrop-blur-sm animate-slide-up">
          {/* Question */}
          <div className="mb-10">
            <h2 className="text-2xl font-semibold text-white leading-relaxed">
              {currentQuestionIndex + 1}. {q.question}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-4 mb-10">
            {q.options.map((opt, idx) => (
              <label
                key={idx}
                className={`
                  group flex items-center p-5 rounded-2xl cursor-pointer transition-all duration-300 border-2 transform hover:scale-[1.01]
                  ${answers[currentQuestionIndex] === idx
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-700/40 border-slate-600/50 text-slate-300 hover:bg-slate-700/60 hover:border-slate-500 hover:shadow-lg'
                  }
                `}
              >
                <input
                  type="radio"
                  name={`q${currentQuestionIndex}`}
                  id={`q${currentQuestionIndex}_opt${idx}`}
                  value={idx}
                  checked={answers[currentQuestionIndex] === idx}
                  onChange={() => handleSelect(idx)}
                  className="sr-only" // Hide default radio, we'll use custom styling
                />
                
                {/* Custom Radio Button */}
                <div className={`
                  w-6 h-6 rounded-full border-2 mr-5 flex items-center justify-center transition-all duration-300 flex-shrink-0
                  ${answers[currentQuestionIndex] === idx
                    ? 'border-emerald-500 bg-emerald-500 shadow-lg shadow-emerald-500/30'
                    : 'border-slate-500 group-hover:border-slate-400'
                  }
                `}>
                  {answers[currentQuestionIndex] === idx && (
                    <div className="w-3 h-3 bg-white rounded-full animate-scale-in" />
                  )}
                </div>
                
                <span className="flex-1 font-medium text-lg">{opt}</span>
              </label>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            {/* Previous Button */}
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className={`
                px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2
                ${currentQuestionIndex > 0
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              <span>Previous</span>
            </button>

            {/* Next/Submit Button */}
            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={answers[currentQuestionIndex] == null || isSubmitting}
                className={`
                  px-8 py-3 rounded-xl font-bold transition-all duration-200 flex items-center space-x-3
                  ${answers[currentQuestionIndex] != null && !isSubmitting
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-xl shadow-emerald-500/30 transform hover:scale-[1.02]'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }
                `}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Quest</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={answers[currentQuestionIndex] == null}
                className={`
                  px-8 py-3 rounded-xl font-bold transition-all duration-200 flex items-center space-x-3
                  ${answers[currentQuestionIndex] != null
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-xl shadow-blue-500/30 transform hover:scale-[1.02]'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }
                `}
              >
                <span>Next Question</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes progressFill {
          from { stroke-dasharray: 0, 100; }
          to { stroke-dasharray: ${percentage}, 100; }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes scale-in {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default DailyQuest;
