import { useState, useRef } from "react";
import Header from "../components/Header";
import WebThreads from "../components/WebThreads";

export interface DebateConfig {
  topic: string;
  position: "for" | "against" | "";
  duration: number;
  rounds: number;
}

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const arenaRef = useRef<HTMLDivElement>(null);

  // Parallax mouse offset state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    // Calculate offset from center (-1 to 1)
    const x = (clientX / innerWidth - 0.5) * 20;
    const y = (clientY / innerHeight - 0.5) * 20;
    setMousePos({ x, y });
  };

  const handleSubmit = () => {
    if (!topic.trim()) {
      alert("Please enter a topic.");
      return;
    }

    const payload: DebateConfig = {
      topic: topic.trim(),
      position: "for",
      duration: 5,
      rounds: 3,
    };

    console.log("Starting debate with config:", payload);
    arenaRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

      {/* SECTION 2: TOPIC SELECTION PAGE WITH PARALLAX */}
      <div 
        onMouseMove={handleMouseMove}
        className="relative w-full h-screen bg-black flex flex-col items-center justify-center px-8 overflow-hidden"
      >
        
        {/* LAYER 1: BACKGROUND (Hands & Atmosphere) - Moves with Parallax */}
        <div 
          className="absolute inset-0 pointer-events-none flex justify-between items-center z-0 px-4 transition-transform duration-100 ease-out"
          style={{ transform: `translate(${-mousePos.x * 0.5}px, ${-mousePos.y * 0.5}px)` }}
        >
          {/* Robot Hand */}
          <div className="absolute -left-10 bottom-20 w-[42vw] max-w-xl transform scale-y-[1] rotate-12 opacity-80">
            <img src="/robo.png" alt="Robot hand" className="w-full h-auto object-contain" />
          </div>

          {/* Human Hand */}
          <div className="absolute -right-10 bottom-7 w-[42vw] max-w-xl opacity-80">
            <img src="/human.png" alt="Human hand" className="w-full h-auto object-contain" />
          </div>
        </div>

        {/* LAYER 2: FOREGROUND (Text, Input & Button) - Static / Slightly Counter-moves */}
        <div 
          className="relative z-10 w-full max-w-2xl flex flex-col items-center transition-transform duration-100 ease-out"
          style={{ transform: `translate(${mousePos.x * 0.2}px, ${mousePos.y * 0.2}px)` }}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-light text-white tracking-widest uppercase mb-1">
              Dive Into A
            </h2>
            <h1 className="text-7xl font-bold tracking-wider drop-shadow-lg text-gold-gradient"
            style={{ fontFamily: 'Bietro' }}>
              DEBATE
            </h1>
          </div>

          <div className="w-full mb-6">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter debate topic"
              className="w-full px-6 py-4 bg-black/60 backdrop-blur-md border border-white/30 rounded-lg text-white placeholder-white/50 text-lg focus:outline-none focus:border-[#FFDB86] focus:bg-black/80 shadow-2xl transition-all"
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              className="bg-gold-gradient text-black font-extrabold px-8 py-3 rounded-lg text-lg transition-transform hover:scale-105 shadow-lg pointer-events-auto cursor-pointer"
            >
              Start Debate
            </button>
          </div>
        </div>
      </div>

  {/* {/* SECTION 3: MODEL REVEAL ARENA */}
      <div ref={arenaRef} className="relative w-full h-screen bg-[#070709] flex flex-col items-center justify-center px-8 overflow-hidden border-t border-white/10">
         <div className="text-center mb-8">
            <h2 className="text-3xl font-light text-white tracking-widest uppercase mb-1">
              CHOOSE WHO GOES
            </h2>
            <h1 className="text-7xl font-bold tracking-wider drop-shadow-lg text-gold-gradient"
            style={{ fontFamily: 'Bietro' }}>
              FIRST
            </h1>
          </div>

        {/* Side-by-Side Model Cards Reveal */}
        <div className="flex flex-row justify-center items-center gap-10 w-full max-w-3xl">
          
          {/* QWEN CARD (Dark Grey/Black with Golden Hover Glow & Taller Height) */}
          <div className="flex-1 h-[450px] bg-[#121212] border border-white/10 p-10  flex flex-col items-center justify-between text-center shadow-xl animate-mask-reveal transition-all duration-1000 hover:scale-[1.02] hover:border-[#FFDB86] hover:shadow-[0_0_40px_rgba(255,219,134,0.3)]">
            <div className="w-24 h-24 mb-4 flex items-center justify-center">
              <img src="/qwen.png" alt="Qwen Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-white mb-1">QWEN 3 (4B)</h3>
              <span className="text-xs tracking-widest text-[#FFDB86] uppercase font-bold mb-3 block">Alibaba Cloud Node</span>
            </div>
          </div>

          {/* VS Divider */}
          <div className="text-2xl font-black italic text-gray-600 tracking-tighter">
            VS
          </div>

          {/* GEMMA CARD (White with Golden Hover Glow & Taller Height) */}
          <div className="flex-1 h-[450px] bg-white border border-gray-200 p-10 flex flex-col items-center justify-between text-center shadow-xl animate-mask-reveal transition-all duration-1000 hover:scale-[1.02] hover:border-[#FFDB86] hover:shadow-[0_0_40px_rgba(255,219,134,0.4)]" style={{ animationDelay: '0.2s' }}>
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