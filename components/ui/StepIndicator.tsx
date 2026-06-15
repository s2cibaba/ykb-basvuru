interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { num: 1, label: "Kimlik Bilgileri" },
  { num: 2, label: "Kişisel Bilgiler" },
  { num: 3, label: "Başvuru Tamamlama" },
] as const;

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="mb-10 flex items-start justify-center">
      {STEPS.map((step, index) => {
        const isActive = step.num === currentStep;
        const isDone = step.num < currentStep;

        return (
          <div key={step.num} className="flex items-start">
            <div className="flex w-[140px] flex-col items-center sm:w-[180px]">
              <div className="relative flex w-full items-center justify-center">
                {index > 0 && (
                  <div
                    className={`absolute right-1/2 h-px w-full ${
                      isDone || isActive ? "bg-ykb-primary" : "bg-ykb-step-inactive"
                    }`}
                    style={{ top: "12px" }}
                  />
                )}
                <div
                  className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-normal ${
                    isActive || isDone
                      ? "bg-ykb-primary text-white"
                      : "bg-ykb-step-inactive text-[#1F1F1F]"
                  }`}
                >
                  {step.num}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`absolute left-1/2 h-px w-full ${
                      isDone ? "bg-ykb-primary" : "bg-ykb-step-inactive"
                    }`}
                    style={{ top: "12px" }}
                  />
                )}
              </div>
              <span
                className={`mt-2 text-center text-[13px] leading-tight ${
                  isActive
                    ? "font-medium text-[#1F1F1F]"
                    : "font-normal text-[#60646C]"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
