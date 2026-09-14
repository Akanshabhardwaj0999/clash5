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
        <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center px-6">
            <div className="w-full max-w-md">
                <h1 className="text-5xl font-black tracking-tight">
                    CREATE CLASH
                </h1>

                <p className="mt-3 text-gray-600">
                    Create a room and challenge your friend.
                </p>

                <input
                    type="text"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="mt-8 w-full border-2 border-black bg-white px-5 py-4 text-lg outline-none"
                />

                <button
                    onClick={handleCreateGame}
                    disabled={loading}
                    className="mt-4 w-full bg-black px-5 py-4 text-lg font-bold text-white transition hover:bg-[#6C4EFF] disabled:opacity-50"
                >
                    {loading ? "CREATING..." : "CREATE GAME →"}
                </button>
            </div>
        </div>
    );
}

export default CreateGame;