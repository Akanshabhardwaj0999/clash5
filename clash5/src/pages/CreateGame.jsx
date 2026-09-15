import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    return Array.from({ length: 6 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join("");
};

function CreateGame() {
    const navigate = useNavigate();

    const [playerName, setPlayerName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCreateGame = async () => {
        if (!playerName.trim()) {
            alert("Please enter your name");
            return;
        }

        setLoading(true);

        const roomCode = generateRoomCode();

        const { error } = await supabase.from("rooms").insert({
            room_code: roomCode,
            player1_name: playerName.trim(),
        });

        if (error) {
            console.error(error);
            alert("Could not create game");
            setLoading(false);
            return;
        }

        localStorage.setItem(
            `clash5-player-${roomCode}`,
            "player1"
        );

        navigate(`/lobby/${roomCode}`);
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#F5F1E8] px-5 py-6 sm:px-8">

            {/* Background decorations */}
            <div className="pointer-events-none absolute -left-16 bottom-12 h-44 w-44 rotate-12 rounded-[35px] border-4 border-black bg-[#6C4EFF]" />

            <div className="pointer-events-none absolute -right-16 top-16 h-44 w-44 -rotate-12 rounded-full border-4 border-black bg-[#FFCE4A]" />

            <div className="pointer-events-none absolute left-[12%] top-[18%] text-4xl">
                ✦
            </div>

            <div className="pointer-events-none absolute bottom-[20%] right-[13%] text-4xl">
                +
            </div>

            <div className="relative mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-6xl items-center justify-center">

                {/* Main card */}
                <div className="grid w-full max-w-5xl overflow-hidden border-4 border-black bg-white shadow-[10px_10px_0px_#000] md:grid-cols-2">

                    {/* LEFT SIDE */}
                    <div className="relative flex min-h-[500px] flex-col justify-between overflow-hidden bg-[#FFCE4A] p-8 sm:p-12">

                        {/* Decorative shapes */}
                        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full border-4 border-black bg-[#FF6B6B]" />

                        <div className="absolute -bottom-20 -left-12 h-48 w-48 rotate-12 rounded-[40px] border-4 border-black bg-[#6C4EFF]" />

                        <div className="relative z-10">

                            {/* Logo */}
                            <div className="mb-8 inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-wider text-black shadow-[4px_4px_0px_#000]">
                                <span>⚡</span>
                                Clash 5
                            </div>

                            <h1 className="text-6xl font-black leading-[0.9] tracking-tight sm:text-7xl">
                                START
                                <br />
                                THE
                                <br />
                                CLASH
                            </h1>

                            <p className="mt-7 max-w-sm text-lg font-medium leading-relaxed">
                                Create your own battle room and invite your
                                friend to compete across 5 crazy games.
                            </p>
                        </div>

                        {/* Game info */}
                        <div className="relative z-10 mt-10">

                            <div className="mb-3 text-xs font-black uppercase tracking-[0.2em]">
                                What's waiting?
                            </div>

                            <div className="flex flex-wrap gap-2">

                                <span className="border-2 border-black bg-white px-3 py-2 text-sm font-bold">
                                    🎮 2 Players
                                </span>

                                <span className="border-2 border-black bg-white px-3 py-2 text-sm font-bold">
                                    🏆 5 Games
                                </span>

                                <span className="border-2 border-black bg-white px-3 py-2 text-sm font-bold">
                                    ⚡ Fast
                                </span>

                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE */}
                    <div className="flex flex-col justify-center bg-[#F5F1E8] p-7 sm:p-12">

                        <div className="mb-8">

                            <p className="mb-2 text-sm font-black uppercase tracking-[0.2em] text-[#6C4EFF]">
                                Player 01
                            </p>

                            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
                                CREATE GAME
                            </h2>

                            <p className="mt-3 text-gray-600">
                                Pick your name and create a room for your
                                friend.
                            </p>

                        </div>

                        {/* Name input */}
                        <div>

                            <label className="mb-2 block text-sm font-black uppercase tracking-wider">
                                Your name
                            </label>

                            <div className="relative">

                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">
                                    👤
                                </span>

                                <input
                                    type="text"
                                    placeholder="Enter your name"
                                    value={playerName}
                                    onChange={(e) =>
                                        setPlayerName(e.target.value)
                                    }
                                    className="w-full border-2 border-black bg-white px-12 py-4 text-lg font-medium outline-none transition focus:-translate-y-1 focus:shadow-[5px_5px_0px_#000]"
                                />

                            </div>

                        </div>

                        {/* Room information card */}
                        <div className="mt-6 border-2 border-black bg-white p-5">

                            <div className="flex items-start gap-4">

                                <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-black bg-[#6C4EFF] text-2xl">
                                    🔐
                                </div>

                                <div>
                                    <p className="font-black">
                                        Your room will be private
                                    </p>

                                    <p className="mt-1 text-sm leading-relaxed text-gray-600">
                                        We'll generate a unique room code
                                        after you create the game.
                                    </p>
                                </div>

                            </div>

                        </div>

                        {/* Create button */}
                        <button
                            onClick={handleCreateGame}
                            disabled={loading}
                            className="group mt-7 flex w-full items-center justify-between border-2 border-black bg-black px-6 py-5 text-lg font-black text-white shadow-[5px_5px_0px_#6C4EFF] transition-all hover:-translate-y-1 hover:bg-[#6C4EFF] hover:shadow-[7px_7px_0px_#000] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span>
                                {loading ? "CREATING..." : "CREATE THE CLASH"}
                            </span>

                            <span className="text-2xl transition-transform group-hover:translate-x-1">
                                →
                            </span>
                        </button>

                        {/* Bottom indicator */}
                        <div className="mt-8 flex items-center justify-center gap-3">

                            <span className="h-2 w-2 rounded-full bg-black" />

                            <span className="h-2 w-8 rounded-full bg-black" />

                            <span className="h-2 w-2 rounded-full bg-black" />

                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default CreateGame;