import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function JoinGame() {
    const navigate = useNavigate();

    const [playerName, setPlayerName] = useState("");
    const [roomCode, setRoomCode] = useState("");
    const [loading, setLoading] = useState(false);

    const handleJoinGame = async () => {
        if (!playerName.trim()) {
            alert("Please enter your name");
            return;
        }

        if (roomCode.trim().length !== 6) {
            alert("Please enter a valid 6-character room code");
            return;
        }

        setLoading(true);

        const code = roomCode.trim().toUpperCase();

        // Find room
        const { data: room, error: findError } = await supabase
            .from("rooms")
            .select("*")
            .eq("room_code", code)
            .maybeSingle();

        if (findError || !room) {
            console.error("Find room error:", findError);
            alert("Room not found");
            setLoading(false);
            return;
        }

        // Check if room already has 2 players
        if (room.player2_name) {
            alert("This room is already full");
            setLoading(false);
            return;
        }

        // Add Player 2
        const { error: updateError } = await supabase
            .from("rooms")
            .update({
                player2_name: playerName.trim(),
            })
            .eq("id", room.id);

        if (updateError) {
            console.error("Join room error:", updateError);
            alert(updateError.message);
            setLoading(false);
            return;
        }

        localStorage.setItem(
            `clash5-player-${code}`,
            "player2"
        );

        navigate(`/lobby/${code}`);
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#F5F1E8] px-5 py-6 sm:px-8">

            {/* Decorative background */}
            <div className="pointer-events-none absolute -left-16 top-20 h-40 w-40 rotate-12 rounded-[35px] border-4 border-black bg-[#FFCE4A]" />

            <div className="pointer-events-none absolute -right-20 bottom-16 h-52 w-52 -rotate-12 rounded-full border-4 border-black bg-[#FF6B6B]" />

            <div className="pointer-events-none absolute right-[15%] top-16 text-5xl">
                ✦
            </div>

            <div className="pointer-events-none absolute bottom-[20%] left-[12%] text-4xl">
                +
            </div>

            <div className="relative mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-6xl items-center justify-center">

                {/* Main card */}
                <div className="grid w-full max-w-5xl overflow-hidden border-4 border-black bg-white shadow-[10px_10px_0px_#000] md:grid-cols-2">

                    {/* LEFT SIDE */}
                    <div className="relative flex min-h-[500px] flex-col justify-between overflow-hidden bg-[#6C4EFF] p-8 text-white sm:p-12">

                        {/* Decorative circles */}
                        <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full border-4 border-black bg-[#FFCE4A]" />

                        <div className="absolute -bottom-16 -left-16 h-44 w-44 rounded-full border-4 border-black bg-[#FF6B6B]" />

                        <div className="relative z-10">
                            <div className="mb-8 inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-wider text-black shadow-[4px_4px_0px_#000]">
                                <span>⚡</span>
                                Clash 5
                            </div>

                            <h1 className="text-6xl font-black leading-[0.9] tracking-tight sm:text-7xl">
                                READY
                                <br />
                                TO
                                <br />
                                CLASH?
                            </h1>

                            <p className="mt-7 max-w-sm text-lg font-medium leading-relaxed text-white/90">
                                Enter your details and jump into the battle.
                                Your friend is already waiting.
                            </p>
                        </div>

                        <div className="relative z-10 mt-10 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-black bg-[#FFCE4A] text-xl">
                                🎮
                            </div>

                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                                    Multiplayer
                                </p>
                                <p className="font-bold">
                                    2 players • 5 games
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE */}
                    <div className="flex flex-col justify-center bg-[#F5F1E8] p-7 sm:p-12">

                        <div className="mb-8">
                            <p className="mb-2 text-sm font-black uppercase tracking-[0.2em] text-[#6C4EFF]">
                                Player 02
                            </p>

                            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
                                JOIN GAME
                            </h2>

                            <p className="mt-3 text-gray-600">
                                Got a room code? Let's get you in.
                            </p>
                        </div>

                        {/* Player name */}
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

                        {/* Room code */}
                        <div className="mt-6">
                            <label className="mb-2 block text-sm font-black uppercase tracking-wider">
                                Room code
                            </label>

                            <input
                                type="text"
                                placeholder="A B C 1 2 3"
                                maxLength={6}
                                value={roomCode}
                                onChange={(e) =>
                                    setRoomCode(
                                        e.target.value.toUpperCase()
                                    )
                                }
                                className="w-full border-2 border-black bg-white px-5 py-5 text-center text-2xl font-black uppercase tracking-[0.35em] outline-none transition focus:-translate-y-1 focus:shadow-[5px_5px_0px_#000]"
                            />

                            <p className="mt-2 text-center text-xs font-medium text-gray-500">
                                Enter the 6-character code shared by your
                                friend
                            </p>
                        </div>

                        {/* Join button */}
                        <button
                            onClick={handleJoinGame}
                            disabled={loading}
                            className="group mt-7 flex w-full items-center justify-between border-2 border-black bg-black px-6 py-5 text-lg font-black text-white shadow-[5px_5px_0px_#6C4EFF] transition-all hover:-translate-y-1 hover:bg-[#6C4EFF] hover:shadow-[7px_7px_0px_#000] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span>
                                {loading ? "JOINING..." : "JOIN THE CLASH"}
                            </span>

                            <span className="text-2xl transition-transform group-hover:translate-x-1">
                                →
                            </span>
                        </button>

                        {/* Bottom decoration */}
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

export default JoinGame;