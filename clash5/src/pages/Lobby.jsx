import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

function Lobby() {
  const navigate = useNavigate();
  const { roomCode } = useParams();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const player = localStorage.getItem(
    `clash5-player-${roomCode}`
  );

  useEffect(() => {
  if (room?.game_started) {
    navigate(`/game/${roomCode}`);
  }
}, [room?.game_started, roomCode, navigate]);

  useEffect(() => {
    const loadRoom = async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", roomCode)
        .single();

      if (error) {
        console.error("Load room error:", error);
        setLoading(false);
        return;
      }

      setRoom(data);
      setLoading(false);
    };

    loadRoom();

    const channel = supabase
      .channel(`room-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          setRoom(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  const bothReady =
  room?.player1_ready &&
  room?.player2_ready;

  const handleReady = async () => {
    if (!player || !room) return;

    setUpdating(true);

    const column =
      player === "player1"
        ? "player1_ready"
        : "player2_ready";

    const { error } = await supabase
      .from("rooms")
      .update({
        [column]: true,
      })
      .eq("id", room.id);

    if (error) {
      console.error("Ready error:", error);
      alert(error.message);
    }

    setUpdating(false);
  };

  const handleStartGame = async () => {
  if (!room || !bothReady || player !== "player1") {
    return;
  }

  const { error } = await supabase
    .from("rooms")
    .update({
      game_started: true,
    })
    .eq("id", room.id);

  if (error) {
    console.error("Start game error:", error);
    alert(error.message);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <p className="font-bold">LOADING LOBBY...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <p className="font-bold">ROOM NOT FOUND</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] px-6 py-12">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold tracking-widest">
              CLASH5
            </p>

            <h1 className="mt-2 text-5xl font-black">
              LOBBY
            </h1>
          </div>

          <div className="border-2 border-black bg-white px-5 py-3 text-center">
            <p className="text-xs font-bold">
              ROOM CODE
            </p>

            <p className="text-2xl font-black tracking-widest">
              {room.room_code}
            </p>
          </div>
        </div>

        {/* Players */}
        <div className="mt-12 grid gap-6 md:grid-cols-2">

          {/* Player 1 */}
          <div className="border-2 border-black bg-white p-8">
            <p className="text-sm font-bold text-gray-500">
              PLAYER 1
            </p>

            <h2 className="mt-3 text-3xl font-black">
              {room.player1_name}
            </h2>

            <div className="mt-6">
              {room.player1_ready ? (
                <span className="font-black">
                  ✓ READY
                </span>
              ) : (
                <span className="text-gray-400 font-bold">
                  NOT READY
                </span>
              )}
            </div>
          </div>

          {/* Player 2 */}
          <div className="border-2 border-black bg-white p-8">
            <p className="text-sm font-bold text-gray-500">
              PLAYER 2
            </p>

            {room.player2_name ? (
              <>
                <h2 className="mt-3 text-3xl font-black">
                  {room.player2_name}
                </h2>

                <div className="mt-6">
                  {room.player2_ready ? (
                    <span className="font-black">
                      ✓ READY
                    </span>
                  ) : (
                    <span className="text-gray-400 font-bold">
                      NOT READY
                    </span>
                  )}
                </div>
              </>
            ) : (
              <h2 className="mt-3 text-3xl font-black text-gray-400">
                WAITING...
              </h2>
            )}
          </div>

        </div>

        {/* Ready Button */}
        {room.player2_name && !room[`${player}_ready`] && (
          <button
            onClick={handleReady}
            disabled={updating}
            className="mt-8 w-full border-2 border-black bg-black px-6 py-5 text-xl font-black text-white hover:bg-[#6C4EFF] disabled:opacity-50"
          >
            {updating ? "READYING..." : "I'M READY →"}
          </button>
        )}

        {/* Waiting / Start Status */}
        {room.player2_name && (
  <div className="mt-6">

    <div className="border-2 border-black bg-white p-6 text-center">
      {bothReady ? (
        <p className="text-xl font-black">
          BOTH READY 🔥
        </p>
      ) : (
        <p className="font-bold">
          {room[`${player}_ready`]
            ? "WAITING FOR YOUR OPPONENT..."
            : "READY UP TO START"}
        </p>
      )}
    </div>

    {bothReady && player === "player1" && (
      <button
        onClick={handleStartGame}
        className="mt-4 w-full border-2 border-black bg-[#6C4EFF] px-6 py-5 text-xl font-black text-white hover:bg-black"
      >
        START CLASH 🔥
      </button>
    )}

    {bothReady && player === "player2" && (
      <p className="mt-4 text-center font-bold">
        HOST IS STARTING THE CLASH...
      </p>
    )}

  </div>
)}

      </div>
    </div>
  );
}

export default Lobby;