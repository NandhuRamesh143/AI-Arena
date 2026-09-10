import { Link } from "react-router-dom"

export default function Header() {
  return (
    <header className="flex justify-between items-center h-20 px-6 bg-black">
        <div className="flex-1">
            <Link to="/" className="flex items-center gap-3">
                <img src="/neuracet-white.svg" alt="NeuraCET" className="h-12" />
                <p className="text-2xl font-extralight text-white">NeuraCET</p>
            </Link>
        </div>
        <img src="/drishti-logo.png" alt="Drishti" className="h-12" />
    </header>
  )
}