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
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-[10px] py-10">
        <div className="processing-card w-full max-w-[640px] rounded-[10px] bg-white px-8 py-14 text-center sm:px-12">
          <div className="mx-auto mb-10 flex h-[280px] w-[280px] items-center justify-center rounded-full bg-[#E8F0FE]">
            {animationData ? (
              <Lottie
                animationData={animationData}
                loop
                autoplay
                className="h-[240px] w-[240px]"
              />
            ) : (
              <div className="h-[240px] w-[240px] animate-pulse rounded-full bg-[#d6e4f7]" />
            )}
          </div>

          <div className="mx-auto mb-8 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-ykb-primary text-xl font-medium text-white">
            {seconds} sn
          </div>

          <p className="text-lg font-medium text-[#1F1F1F]">
            Başvurunuz değerlendiriliyor, lütfen bekleyiniz.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
