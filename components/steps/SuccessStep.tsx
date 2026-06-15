import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroBanner } from "@/components/layout/HeroBanner";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

export function SuccessStep() {
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

            <div className="mt-8 rounded bg-[#f0f0f0] p-6">
              <div className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4caf50] text-lg font-bold text-white">
                  ✓
                </div>
                <div>
                  <p className="text-base font-bold text-[#1F1F1F]">
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

            <div className="mt-8 flex flex-wrap justify-end gap-3">
              <button type="button" className="ykb-btn-primary">
                Hemen Müşteri Ol
              </button>
              <button type="button" className="ykb-btn-primary">
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
