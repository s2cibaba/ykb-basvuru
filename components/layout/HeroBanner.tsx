export function HeroBanner() {
  return (
    <div
      className="relative h-[252px] w-full overflow-hidden rounded-t-[10px] bg-[#004990] bg-no-repeat"
      style={{
        backgroundImage: "url(/assets/bik-banner.png)",
        backgroundPosition: "right bottom",
        backgroundSize: "auto",
      }}
    >
      <p className="absolute left-[30px] top-1/2 max-w-[52%] -translate-y-1/2 text-[26px] font-normal leading-[1.25] text-white sm:text-[30px]">
        Yüzde 0 faizli
        <br />
        bireysel ihtiyaç kredisi
        <br />
        fırsatı Yapı Kredi&apos;de.
      </p>
    </div>
  );
}
