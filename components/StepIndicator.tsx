
import React from 'react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
  return (
    <div className="flex items-center space-x-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div 
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            i <= currentStep ? 'bg-blue-500 w-12' : 'bg-zinc-800 w-6'
          }`}
        />
      ))}
    </div>
  );
};
