'use client'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const percentage = (currentStep / totalSteps) * 100

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-text-secondary">
          Paso {currentStep} de {totalSteps}
        </span>
        <span className="text-sm font-medium text-text-secondary">
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="w-full bg-bg-tertiary rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}




