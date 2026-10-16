const Logo = () => (
  <div className="flex items-center gap-2">
    <div className="relative flex rounded">
      <div className="absolute top-0 left-full flex size-5 items-center justify-center rounded-full bg-[#f0da4e]">
        <span className="text-[10px] font-semibold text-black">JS</span>
      </div>
      <span className="text-2xl">Package</span>
      <span className="text-2xl text-[#c12336] italic">Pulse</span>
    </div>
  </div>
);

export default Logo;
