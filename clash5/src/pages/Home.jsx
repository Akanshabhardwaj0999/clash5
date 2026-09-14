import { useNavigate } from "react-router-dom";

function Home() {

  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#F5F1E8] text-[#111111]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">

        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight">
            CLASH5
          </h1>

          <span className="rounded-full border border-black px-4 py-2 text-sm font-semibold">
            5 LEVELS
          </span>
        </header>

        {/* Hero */}
        <section className="flex flex-1 flex-col items-center justify-center text-center">

          <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em]">
            5 Games · 2 Players · 1 Winner
          </p>

          <h2 className="max-w-4xl text-7xl font-black leading-[0.9] tracking-[-0.06em] md:text-9xl">
            LET THE
            <br />
            <span className="text-[#6C4EFF]">CLASH</span>
            <br />
            BEGIN.
          </h2>

          <p className="mt-8 max-w-md text-base leading-7 text-gray-600">
            Five completely different challenges.
            One final winner.
            And a reward for the loser.
          </p>

          {/* Buttons */}
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">

            <button 
            onClick={() => navigate("/create")}
            className="rounded-full bg-[#111111] px-8 py-4 text-base font-bold text-white transition-transform hover:-translate-y-1">
              CREATE GAME
            </button>

            <button
            onClick={() => navigate("/join")} 
            className="rounded-full border-2 border-[#111111] px-8 py-4 text-base font-bold transition-transform hover:-translate-y-1">
              JOIN GAME
            </button>

          </div>

        </section>

        {/* Bottom */}
        <footer className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
          <span>CLASH5 © 2026</span>
          <span>May the best player win.</span>
        </footer>

      </div>
    </main>
  );
}

export default Home;