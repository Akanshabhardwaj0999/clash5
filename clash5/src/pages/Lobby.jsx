import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

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
          player1_ready: false,
          player2_ready: false,
          ready_level: 1,
      })
      .eq("id", room.id);

    if (error) {
      console.error("Start game error:", error);
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F1E8]">
        <div className="text-center">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-black border-t-[#6C4EFF]" />
          <p className="font-black tracking-widest">
            LOADING LOBBY...
          </p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F1E8] px-6">
        <div className="border-4 border-black bg-white p-10 text-center shadow-[8px_8px_0px_#000]">
          <div className="text-5xl">😵</div>

          <h1 className="mt-5 text-4xl font-black">
            ROOM NOT FOUND
          </h1>

          <p className="mt-3 text-gray-600">
            This room may have expired or doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  const player1Ready = room.player1_ready;
  const player2Ready = room.player2_ready;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F1E8] px-5 py-6 sm:px-8">

      {/* Background decoration */}

      <div className="pointer-events-none absolute -left-20 top-24 h-44 w-44 rotate-12 rounded-[40px] border-4 border-black bg-[#FFCE4A]" />

      <div className="pointer-events-none absolute -right-20 bottom-10 h-52 w-52 -rotate-12 rounded-full border-4 border-black bg-[#FF6B6B]" />

      <div className="pointer-events-none absolute left-[12%] top-[12%] text-4xl">
        ✦
      </div>

      <div className="pointer-events-none absolute right-[12%] top-[30%] text-4xl">
        +
      </div>

      <div className="relative mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <div className="mb-3 inline-flex items-center gap-2 border-2 border-black bg-[#6C4EFF] px-4 py-2 text-sm font-black text-white shadow-[4px_4px_0px_#000]">
              <span>⚡</span>
              CLASH 5
            </div>

            <h1 className="text-5xl font-black leading-none tracking-tight sm:text-7xl">
              READY
              <br />
              ROOM
            </h1>

          </div>

          {/* Room code */}

          <div className="border-4 border-black bg-white p-5 text-center shadow-[6px_6px_0px_#000]">

            <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">
              ROOM CODE
            </p>

            <p className="mt-2 text-3xl font-black tracking-[0.25em]">
              {room.room_code}
            </p>

            <p className="mt-2 text-xs font-bold text-gray-500">
              SHARE THIS WITH YOUR FRIEND
            </p>

          </div>

        </div>

        {/* TOP STATUS */}

        <div className="mt-10 flex items-center justify-between border-2 border-black bg-black px-5 py-4 text-white">

          <div className="flex items-center gap-3">

            <span
              className={`h-3 w-3 rounded-full ${
                room.player2_name
                  ? "animate-pulse bg-[#5CFF6A]"
                  : "bg-[#FFCE4A]"
              }`}
            />

            <span className="text-sm font-black uppercase tracking-wider">
              {room.player2_name
                ? "Opponent joined"
                : "Waiting for opponent"}
            </span>

          </div>

          <span className="text-sm font-black">
            {room.player2_name ? "2 / 2" : "1 / 2"}
          </span>

        </div>

        {/* PLAYERS */}

        <div className="relative mt-8 grid gap-5 md:grid-cols-[1fr_110px_1fr] md:items-center">

          {/* PLAYER 1 */}

          <div className="relative overflow-hidden border-4 border-black bg-[#FFCE4A] p-7 shadow-[7px_7px_0px_#000]">

            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full border-2 border-black bg-white" />

            <div className="relative">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em]">
                    Player 01
                  </p>

                  <h2 className="mt-3 break-words text-3xl font-black sm:text-4xl">
                    {room.player1_name}
                  </h2>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-black bg-white text-2xl">
                  👑
                </div>

              </div>

              <div className="mt-8">

                {player1Ready ? (
                  <div className="flex items-center gap-3 border-2 border-black bg-white px-4 py-3 font-black">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5CFF6A]">
                      ✓
                    </span>

                    READY TO PLAY
                  </div>
                ) : (
                  <div className="flex items-center gap-3 border-2 border-black bg-white/50 px-4 py-3 font-black">
                    <span className="h-3 w-3 animate-pulse rounded-full bg-black" />
                    GETTING READY...
                  </div>
                )}

              </div>

            </div>

          </div>

          {/* VS */}

          <div className="z-10 flex items-center justify-center">

            <div className="flex h-20 w-20 rotate-[-6deg] items-center justify-center border-4 border-black bg-[#FF6B6B] text-2xl font-black shadow-[5px_5px_0px_#000]">
              VS
            </div>

          </div>

          {/* PLAYER 2 */}

          <div className="relative overflow-hidden border-4 border-black bg-[#6C4EFF] p-7 text-white shadow-[7px_7px_0px_#000]">

            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full border-2 border-black bg-[#FFCE4A]" />

            <div className="relative">

              <div className="flex items-start justify-between">

                <div className="min-w-0">

                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
                    Player 02
                  </p>

                  {room.player2_name ? (
                    <h2 className="mt-3 break-words text-3xl font-black sm:text-4xl">
                      {room.player2_name}
                    </h2>
                  ) : (
                    <h2 className="mt-3 text-3xl font-black text-white/50 sm:text-4xl">
                      WAITING...
                    </h2>
                  )}

                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-black bg-white text-2xl">
                  {room.player2_name ? "🎮" : "?"}
                </div>

              </div>

              <div className="mt-8">

                {room.player2_name ? (
                  player2Ready ? (
                    <div className="flex items-center gap-3 border-2 border-black bg-white px-4 py-3 font-black text-black">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5CFF6A]">
                        ✓
                      </span>

                      READY TO PLAY
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 border-2 border-black bg-white/20 px-4 py-3 font-black">
                      <span className="h-3 w-3 animate-pulse rounded-full bg-white" />
                      NOT READY
                    </div>
                  )
                ) : (
                  <div className="border-2 border-dashed border-white/60 px-4 py-3 text-sm font-black text-white/70">
                    SEND THE ROOM CODE →
                  </div>
                )}

              </div>

            </div>

          </div>

        </div>

        {/* READY BUTTON */}

        {room.player2_name && !room[`${player}_ready`] && (
          <button
            onClick={handleReady}
            disabled={updating}
            className="group mt-9 flex w-full items-center justify-between border-4 border-black bg-black px-6 py-5 text-xl font-black text-white shadow-[6px_6px_0px_#6C4EFF] transition-all hover:-translate-y-1 hover:bg-[#6C4EFF] hover:shadow-[8px_8px_0px_#000] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>
              {updating ? "GETTING READY..." : "I'M READY"}
            </span>

            <span className="text-3xl transition-transform group-hover:translate-x-2">
              →
            </span>
          </button>
        )}

        {/* STATUS */}

        {room.player2_name && (
          <div className="mt-8">

            <div
              className={`border-2 border-black p-6 text-center shadow-[4px_4px_0px_#000] ${
                bothReady
                  ? "bg-[#5CFF6A]"
                  : "bg-white"
              }`}
            >

              {bothReady ? (
                <>
                  <p className="text-3xl font-black">
                    BOTH PLAYERS READY 🔥
                  </p>

                  <p className="mt-2 text-sm font-bold">
                    The battle is about to begin.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-black">
                    {room[`${player}_ready`]
                      ? "WAITING FOR YOUR OPPONENT..."
                      : "READY UP TO START"}
                  </p>

                  <div className="mx-auto mt-4 flex max-w-xs items-center gap-2">

                    <div
                      className={`h-2 flex-1 ${
                        player1Ready
                          ? "bg-black"
                          : "bg-gray-200"
                      }`}
                    />

                    <div
                      className={`h-2 flex-1 ${
                        player2Ready
                          ? "bg-black"
                          : "bg-gray-200"
                      }`}
                    />

                  </div>
                </>
              )}

            </div>

            {/* HOST START BUTTON */}

            {bothReady && player === "player1" && (
              <button
                onClick={handleStartGame}
                className="group mt-5 flex w-full items-center justify-between border-4 border-black bg-[#6C4EFF] px-6 py-6 text-2xl font-black text-white shadow-[7px_7px_0px_#000] transition-all hover:-translate-y-1 hover:bg-black"
              >
                <span>START CLASH</span>

                <span className="text-3xl transition-transform group-hover:translate-x-2">
                  🔥
                </span>
              </button>
            )}

            {bothReady && player === "player2" && (
              <div className="mt-5 border-2 border-black bg-white p-5 text-center">
                <p className="font-black">
                  HOST IS STARTING THE CLASH...
                </p>

                <div className="mx-auto mt-3 h-2 max-w-xs overflow-hidden bg-gray-200">
                  <div className="h-full w-2/3 animate-pulse bg-[#6C4EFF]" />
                </div>
              </div>
            )}

          </div>
        )}

        {/* Bottom game info */}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 pb-6">

          <span className="border-2 border-black bg-white px-4 py-2 text-xs font-black">
            ⚡ 5 GAMES
          </span>

          <span className="border-2 border-black bg-white px-4 py-2 text-xs font-black">
            🎮 2 PLAYERS
          </span>

          <span className="border-2 border-black bg-white px-4 py-2 text-xs font-black">
            🏆 WINNER TAKES IT
          </span>

        </div>

      </div>
    </div>
  );
}

export default Lobby;