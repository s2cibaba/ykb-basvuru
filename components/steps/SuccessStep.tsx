import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroBanner } from "@/components/layout/HeroBanner";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

export function SuccessStep() {
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

            <div className="mt-6 rounded bg-[#f0f0f0] p-4 md:mt-8 md:p-6">
              <div className="flex gap-3 md:gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4caf50] text-lg font-bold text-white">
                  ✓
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1F1F1F] md:text-base">
                    Kredi başvurunuz alınmıştır.
                  </p>
                  <p className="mt-2 text-sm text-[#1F1F1F]">
                    Başvuru sonucunuz size SMS ile bildirilecektir.
                  </p>
                  <p className="mt-3 text-sm text-[#1F1F1F]">
                    • Başvurunuzu takip etmek için Yapı Kredi Mobil
                    uygulamasını indirebilirsiniz.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
              <button type="button" className="ykb-btn-primary w-full sm:w-auto">
                Hemen Müşteri Ol
              </button>
              <button type="button" className="ykb-btn-primary w-full sm:w-auto">
                Yapı Kredi Mobil İndir
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
