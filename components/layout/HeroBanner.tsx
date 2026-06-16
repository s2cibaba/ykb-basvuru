export function HeroBanner() {
  return (
    <div
      className="relative h-[150px] w-full overflow-hidden rounded-t-[6px] bg-[#004990] bg-[length:auto_90%] bg-[position:right_bottom] bg-no-repeat md:h-[252px] md:rounded-t-[10px] md:bg-[length:auto]"
      style={{
        backgroundImage: "url(/assets/bik-banner.png)",
      }}
    >
      <p className="absolute left-[15px] top-1/2 max-w-[58%] -translate-y-1/2 text-[17px] font-normal leading-[1.25] text-white md:left-[30px] md:max-w-[52%] md:text-[26px] lg:text-[30px]">
        Yüzde 0 faizli
        <br />
        bireysel ihtiyaç kredisi
        <br />
        fırsatı Yapı Kredi&apos;de.
      </p>
    </div>
  );
}
