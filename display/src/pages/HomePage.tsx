import { Link } from "react-router-dom";
import Header from "../components/Header";
import WebThreads from "../components/webThreads";

export default function HomePage() {
  return (
      <div className="relative w-full min-h-screen">

        {/* LAYER 1 (bottom): the animated background */}
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

        {/* LAYER 3 (top): your actual page content */}
        <div className="relative z-10">
          <Header />
          <section className="m-[12%] flex flex-col items-center text-center">
            <Link to="/topic">
              <p className="text-2xl text-white font-extralight">
                NeuraCET x DRISHTI 26 presents
              </p>
              <p
                className="text-8xl font-bold gold-gradient-text"
                style={{ fontFamily: 'Bietro' }}
              >
                AI ARENA
              </p>
            </Link>
          </section>
        </div>

      </div>
  )
}