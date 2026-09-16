import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import WebThreads from "../components/WebThreads";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="w-full overflow-x-hidden">
      {/* SECTION 1: HOME PAGE */}
      <div className="relative w-full h-screen">
        <div className="absolute inset-0 w-full h-full">
          <WebThreads
            color1="#000000"
            color2="#e7b10c"
            color3="#ffb47f"
            speed={0.2}
            threadCount={6}
            frequency={5.0}
            spread={0.18}
            taper={1.0}
            position={0.5}
            fanMode="center"
            glow={0.02}
            falloff={0.6}
            thickness={1.1}
            brightness={0.6}
            opacity={1.0}
            mirror={true}
            shimmer={false}
            grain={true}
            grainIntensity={0.05}
            mouseInteraction={true}
            mouseStrength={0.3}
          />
        </div>

        <div className="absolute inset-0 bg-black/40 pointer-events-none" />

        <div className="relative z-10">
          <Header />
          <section className="m-[12%] flex flex-col items-center text-center h-[calc(100%-120px)] justify-center">
            <div>
              <p className="text-2xl text-white font-extralight">
                NeuraCET x DRISHTI 26 presents
              </p>
              <p
                className="text-9xl text-white font-extrabold"
                style={{ fontFamily: 'Bietro' }}
              >
                AI ARENA
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* SECTION 2: MODEL SELECTION ARENA */}
      <div className="relative w-full h-screen bg-[#070709] flex flex-col items-center justify-center px-8 overflow-hidden border-t border-white/10">
         <div className="text-center mb-8">
            <h2 className="text-3xl font-light text-white tracking-widest uppercase mb-1">
              CHOOSE YOUR
            </h2>
            <h1 className="text-7xl font-bold tracking-wider drop-shadow-lg text-gold-gradient"
            style={{ fontFamily: 'Bietro' }}>
              MODEL
            </h1>
          </div>

        {/* Side-by-Side Model Cards Reveal */}
        <div className="flex flex-row justify-center items-center gap-10 w-full max-w-3xl">
          
          {/* QWEN CARD */}
          <div 
            onClick={() => navigate("/qwen")}
            className="cursor-pointer flex-1 h-[450px] bg-[#121212] border border-white/10 p-10  flex flex-col items-center justify-between text-center shadow-xl animate-mask-reveal transition-all duration-1000 hover:scale-[1.02] hover:border-[#FFDB86] hover:shadow-[0_0_40px_rgba(255,219,134,0.3)]"
          >
            <div className="w-24 h-24 mb-4 flex items-center justify-center">
              <img src="/qwen.png" alt="Qwen Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-white mb-1">QWEN 3 (4B)</h3>
              <span className="text-xs tracking-widest text-[#FFDB86] uppercase font-bold mb-3 block">Alibaba Cloud Node</span>
            </div>
          </div>

          {/* OR Divider */}
          <div className="text-2xl font-black italic text-gray-600 tracking-tighter">
            OR
          </div>

          {/* GEMMA CARD */}
          <div 
            onClick={() => navigate("/gemma")}
            className="cursor-pointer flex-1 h-[450px] bg-white border border-gray-200 p-10 flex flex-col items-center justify-between text-center shadow-xl animate-mask-reveal transition-all duration-1000 hover:scale-[1.02] hover:border-[#FFDB86] hover:shadow-[0_0_40px_rgba(255,219,134,0.4)]" style={{ animationDelay: '0.2s' }}
          >
            <div className="w-24 h-24 mb-4 flex items-center justify-center">
              <img src="/gemma.png" alt="Gemma Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-black mb-1">GEMMA 4 (E2B)</h3>
              <span className="text-xs tracking-widest text-[#B78000] uppercase font-bold mb-3 block">Google US Node</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}