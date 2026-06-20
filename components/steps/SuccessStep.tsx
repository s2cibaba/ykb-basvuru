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
              <p className="text-sm text-[#1F1F1F]">
                Müşteri temsilcilerimiz en kısa sürede size ulaşacaktır.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
