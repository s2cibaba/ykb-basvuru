"use client";

import { useEffect, useRef, useState } from "react";
import Lottie from "lottie-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface ProcessingStepProps {
  duration?: number;
  onComplete: () => void;
}

export function ProcessingStep({
  duration = 15,
  onComplete,
}: ProcessingStepProps) {
  const [seconds, setSeconds] = useState(duration);
  const [animationData, setAnimationData] = useState<object | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    setSeconds(duration);
    completedRef.current = false;
  }, [duration]);

  useEffect(() => {
    fetch("/assets/processing-lottie.json")
      .then((res) => res.json())
      .then(setAnimationData)
      .catch(() => setAnimationData(null));
  }, []);

  useEffect(() => {
    if (seconds <= 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, onComplete]);

  return (
    <div className="min-h-screen bg-ykb-page">
      <Header />
      <div className="flex min-h-[calc(100vh-100px)] items-center justify-center px-[10px] py-6 md:min-h-[calc(100vh-120px)] md:py-10">
        <div className="processing-card w-full max-w-[640px] rounded-[6px] bg-white px-5 py-10 text-center md:rounded-[10px] md:px-12 md:py-14">
          <div className="mx-auto mb-8 flex h-[200px] w-[200px] items-center justify-center rounded-full bg-[#E8F0FE] md:mb-10 md:h-[280px] md:w-[280px]">
            {animationData ? (
              <Lottie
                animationData={animationData}
                loop
                autoplay
                className="h-[170px] w-[170px] md:h-[240px] md:w-[240px]"
              />
            ) : (
              <div className="h-[170px] w-[170px] animate-pulse rounded-full bg-[#d6e4f7] md:h-[240px] md:w-[240px]" />
            )}
          </div>

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-ykb-primary text-lg font-medium text-white md:mb-8 md:h-[72px] md:w-[72px] md:text-xl">
            {seconds} sn
          </div>

          <p className="text-base font-medium text-[#1F1F1F] md:text-lg">
            Başvurunuz değerlendiriliyor, lütfen bekleyiniz.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
