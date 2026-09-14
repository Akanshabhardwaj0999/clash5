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
            .maybeSingle()


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
        <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center px-6">
            <div className="w-full max-w-md">
                <h1 className="text-5xl font-black tracking-tight">
                    JOIN CLASH
                </h1>

                <p className="mt-3 text-gray-600">
                    Enter the room code shared by your friend.
                </p>

                <input
                    type="text"
                    placeholder="Your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="mt-8 w-full border-2 border-black bg-white px-5 py-4 text-lg outline-none"
                />

                <input
                    type="text"
                    placeholder="ROOM CODE"
                    maxLength={6}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="mt-3 w-full border-2 border-black bg-white px-5 py-4 text-lg uppercase tracking-[0.3em] outline-none"
                />

                <button
                    onClick={handleJoinGame}
                    disabled={loading}
                    className="mt-4 w-full bg-black px-5 py-4 text-lg font-bold text-white transition hover:bg-[#6C4EFF] disabled:opacity-50"
                >
                    {loading ? "JOINING..." : "JOIN GAME →"}
                </button>
            </div>
        </div>
    );
}

export default JoinGame;