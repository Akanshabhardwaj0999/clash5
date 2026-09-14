import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const TOTAL_ROUNDS = 5;

const EMOJIS = [
    "🍕",
    "🚀",
    "🐱",
    "🌈",
    "🔥",
    "🎸",
    "🍩",
    "⚡",
    "👻",
    "🦄",
];

const BOMB_WIRES = [
    "red",
    "yellow",
    "blue",
    "green",
    "purple",
];

const REWARDS = [
  {
    id: "pizza",
    name: "Pizza 🍕",
    description: "Winner gets a pizza treat!",
  },
  {
    id: "coffee",
    name: "Coffee ☕",
    description: "Winner gets a coffee treat!",
  },
  {
    id: "icecream",
    name: "Ice Cream 🍦",
    description: "Winner gets an ice cream!",
  },
  {
    id: "movie",
    name: "Movie 🎬",
    description: "Winner gets a movie treat!",
  },
  {
    id: "dinner",
    name: "Dinner 🍽️",
    description: "Winner gets a dinner treat!",
  },
  {
    id: "200",
    name: "₹200 💸",
    description: "Winner gets ₹200!",
  },
];

function Game() {
    const { roomCode } = useParams();

    const [room, setRoom] = useState(null);
    const [player, setPlayer] = useState(null);

    const [selected, setSelected] = useState([]);
    const [mindSelected, setMindSelected] = useState(null);
    const [bombSelected, setBombSelected] = useState(null);

    // =====================================================
    // PLAYER IDENTITY
    // =====================================================

    useEffect(() => {
        const currentPlayer = localStorage.getItem(
            `clash5-player-${roomCode}`
        );

        setPlayer(currentPlayer);
    }, [roomCode]);

    // =====================================================
    // FETCH ROOM + REALTIME
    // =====================================================

    useEffect(() => {
        if (!roomCode) return;

        const fetchRoom = async () => {
            const { data, error } = await supabase
                .from("rooms")
                .select("*")
                .eq("room_code", roomCode)
                .single();

            if (error) {
                console.error("Fetch room error:", error);
                return;
            }

            setRoom(data);
        };

        fetchRoom();

        const channel = supabase
            .channel(`game-${roomCode}`)
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

    // =====================================================
    // LEVEL 1 — REACTION DUEL
    // =====================================================

    // Start reaction round
    useEffect(() => {
        if (!room || player !== "player1") return;

        if (room.current_level !== 1) return;
        if (room.reaction_status !== "waiting") return;

        const delay =
            Math.floor(Math.random() * 2000) + 2000;

        const timer = setTimeout(async () => {
            await supabase
                .from("rooms")
                .update({
                    reaction_status: "go",
                    player1_click: null,
                    player2_click: null,
                    reaction_winner: null,
                    reaction_result_processed: false,
                })
                .eq("id", room.id)
                .eq("reaction_status", "waiting");
        }, delay);

        return () => clearTimeout(timer);
    }, [room, player]);

    // Judge reaction
    useEffect(() => {
        if (!room || player !== "player1") return;

        if (room.current_level !== 1) return;
        if (room.reaction_status !== "go") return;

        if (!room.player1_click || !room.player2_click) return;
        if (room.reaction_result_processed) return;

        const winner =
            room.player1_click < room.player2_click
                ? "player1"
                : "player2";

        const player1Score =
            room.player1_score +
            (winner === "player1" ? 1 : 0);

        const player2Score =
            room.player2_score +
            (winner === "player2" ? 1 : 0);

        const processResult = async () => {
            const { error } = await supabase
                .from("rooms")
                .update({
                    reaction_winner: winner,
                    reaction_result_processed: true,
                    reaction_status: "finished",
                    player1_score: player1Score,
                    player2_score: player2Score,
                })
                .eq("id", room.id)
                .eq("reaction_result_processed", false);

            if (error) {
                console.error("Reaction result error:", error);
            }
        };

        processResult();
    }, [room, player]);

    // Move Reaction round / Level 2
    useEffect(() => {
        if (!room || player !== "player1") return;

        if (room.current_level !== 1) return;
        if (room.reaction_status !== "finished") return;
        if (!room.reaction_result_processed) return;

        const timer = setTimeout(async () => {
            if (room.reaction_round < TOTAL_ROUNDS) {
                await supabase
                    .from("rooms")
                    .update({
                        reaction_round:
                            room.reaction_round + 1,
                        reaction_status: "waiting",
                        player1_click: null,
                        player2_click: null,
                        reaction_winner: null,
                        reaction_result_processed: false,
                    })
                    .eq("id", room.id);

                return;
            }

            const levelWinner =
                room.player1_score > room.player2_score
                    ? "player1"
                    : room.player2_score > room.player1_score
                        ? "player2"
                        : null;

            await supabase
                .from("rooms")
                .update({
                    current_level: 2,

                    player1_total_score:
                        (room.player1_total_score || 0) +
                        (levelWinner === "player1" ? 1 : 0),

                    player2_total_score:
                        (room.player2_total_score || 0) +
                        (levelWinner === "player2" ? 1 : 0),

                    reaction_round: 1,
                    reaction_status: "waiting",
                    reaction_winner: levelWinner,
                    reaction_result_processed: false,
                })
                .eq("id", room.id);
        }, 1800);

        return () => clearTimeout(timer);
    }, [room, player]);

    // Reaction click
    const handleReactionClick = async () => {
        if (!room) return;
        if (room.reaction_status !== "go") return;

        const clickColumn =
            player === "player1"
                ? "player1_click"
                : "player2_click";

        const alreadyClicked =
            player === "player1"
                ? room.player1_click
                : room.player2_click;

        if (alreadyClicked) return;

        await supabase
            .from("rooms")
            .update({
                [clickColumn]: Date.now(),
            })
            .eq("id", room.id);
    };

    // =====================================================
    // LEVEL 2 — MEMORY CHAOS
    // =====================================================

    // Start Memory round
    useEffect(() => {
        if (!room || player !== "player1") return;

        if (room.current_level !== 2) return;
        if (room.memory_status !== "waiting") return;

        const timer = setTimeout(async () => {
            const sequence = Array.from(
                { length: 5 },
                () =>
                    EMOJIS[
                    Math.floor(
                        Math.random() * EMOJIS.length
                    )
                    ]
            );

            const { error } = await supabase
                .from("rooms")
                .update({
                    memory_sequence:
                        JSON.stringify(sequence),

                    memory_status: "showing",

                    memory_answer1: null,
                    memory_answer2: null,

                    memory_winner: null,

                    memory_result_processed: false,
                })
                .eq("id", room.id)
                .eq("memory_status", "waiting");

            if (error) {
                console.error(
                    "Memory start error:",
                    error
                );
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [room, player]);

    // Hide Memory sequence
    useEffect(() => {
        if (!room || player !== "player1") return;

        if (room.current_level !== 2) return;
        if (room.memory_status !== "showing") return;

        const timer = setTimeout(async () => {
            await supabase
                .from("rooms")
                .update({
                    memory_status: "playing",
                })
                .eq("id", room.id)
                .eq("memory_status", "showing");
        }, 3000);

        return () => clearTimeout(timer);
    }, [room, player]);

    // Judge Memory
    useEffect(() => {
        if (!room || player !== "player1") return;

        if (room.current_level !== 2) return;
        if (room.memory_status !== "playing") return;

        if (
            !room.memory_answer1 ||
            !room.memory_answer2
        ) {
            return;
        }

        if (room.memory_result_processed) return;

        const correctSequence =
            JSON.parse(room.memory_sequence);

        const answer1 =
            JSON.parse(room.memory_answer1);

        const answer2 =
            JSON.parse(room.memory_answer2);

        const isCorrect = (answer) =>
            answer.length ===
            correctSequence.length &&
            answer.every(
                (emoji, index) =>
                    emoji === correctSequence[index]
            );

        const player1Correct =
            isCorrect(answer1);

        const player2Correct =
            isCorrect(answer2);

        let winner = null;

        if (
            player1Correct &&
            !player2Correct
        ) {
            winner = "player1";
        } else if (
            !player1Correct &&
            player2Correct
        ) {
            winner = "player2";
        }

        const player1Score =
            room.player1_memory_score +
            (winner === "player1" ? 1 : 0);

        const player2Score =
            room.player2_memory_score +
            (winner === "player2" ? 1 : 0);

        const processResult = async () => {
            await supabase
                .from("rooms")
                .update({
                    memory_winner: winner,
                    memory_result_processed: true,
                    memory_status: "finished",

                    player1_memory_score:
                        player1Score,

                    player2_memory_score:
                        player2Score,
                })
                .eq("id", room.id)
                .eq(
                    "memory_result_processed",
                    false
                );
        };

        processResult();
    }, [room, player]);

    // Move Memory round / Level 3
    useEffect(() => {
        if (!room || player !== "player1") return;

        if (room.current_level !== 2) return;
        if (room.memory_status !== "finished")
            return;

        if (!room.memory_result_processed)
            return;

        const timer = setTimeout(async () => {
            if (
                room.memory_round <
                TOTAL_ROUNDS
            ) {
                await supabase
                    .from("rooms")
                    .update({
                        memory_round:
                            room.memory_round + 1,

                        memory_status: "waiting",

                        memory_sequence: null,
                        memory_answer1: null,
                        memory_answer2: null,
                        memory_winner: null,

                        memory_result_processed: false,
                    })
                    .eq("id", room.id);

                return;
            }

            const levelWinner =
                room.player1_memory_score >
                    room.player2_memory_score
                    ? "player1"
                    : room.player2_memory_score >
                        room.player1_memory_score
                        ? "player2"
                        : null;

            await supabase
                .from("rooms")
                .update({
                    current_level: 3,

                    player1_total_score:
                        (room.player1_total_score || 0) +
                        (levelWinner === "player1"
                            ? 1
                            : 0),

                    player2_total_score:
                        (room.player2_total_score || 0) +
                        (levelWinner === "player2"
                            ? 1
                            : 0),

                    memory_round: 1,
                    memory_status: "waiting",
                    memory_winner: levelWinner,
                    memory_result_processed: false,
                })
                .eq("id", room.id);
        }, 1800);

        return () => clearTimeout(timer);
    }, [room, player]);

    // Memory input
    const handleEmojiClick = (emoji) => {
        if (
            room?.memory_status !==
            "playing"
        ) {
            return;
        }

        const sequence =
            room.memory_sequence
                ? JSON.parse(
                    room.memory_sequence
                )
                : [];

        if (
            selected.length >=
            sequence.length
        ) {
            return;
        }

        setSelected((prev) => [
            ...prev,
            emoji,
        ]);
    };

    const handleMemorySubmit = async () => {
        if (!room) return;

        const sequence =
            JSON.parse(
                room.memory_sequence
            );

        if (
            selected.length !==
            sequence.length
        ) {
            return;
        }

        const answerColumn =
            player === "player1"
                ? "memory_answer1"
                : "memory_answer2";

        await supabase
            .from("rooms")
            .update({
                [answerColumn]:
                    JSON.stringify(selected),
            })
            .eq("id", room.id);
    };

    useEffect(() => {
        setSelected([]);
    }, [room?.memory_round]);

    // =====================================================
    // LEVEL 3 — TARGET SMASH
    // =====================================================

    // Start Target
    useEffect(() => {
        if (!room || player !== "player1")
            return;

        if (room.current_level !== 3)
            return;

        if (
            room.target_status !==
            "waiting"
        ) {
            return;
        }

        const timer = setTimeout(
            async () => {
                const x =
                    Math.floor(
                        Math.random() * 75
                    ) + 10;

                const y =
                    Math.floor(
                        Math.random() * 65
                    ) + 15;

                await supabase
                    .from("rooms")
                    .update({
                        target_x: x,
                        target_y: y,

                        target_click1: null,
                        target_click2: null,

                        target_winner: null,

                        target_result_processed:
                            false,

                        target_status: "playing",
                    })
                    .eq("id", room.id)
                    .eq(
                        "target_status",
                        "waiting"
                    );
            },
            1000
        );

        return () =>
            clearTimeout(timer);
    }, [room, player]);

    // Judge Target
    useEffect(() => {
        if (!room || player !== "player1")
            return;

        if (room.current_level !== 3)
            return;

        if (
            room.target_status !==
            "playing"
        ) {
            return;
        }

        if (
            !room.target_click1 ||
            !room.target_click2
        ) {
            return;
        }

        if (
            room.target_result_processed
        ) {
            return;
        }

        const winner =
            room.target_click1 <
                room.target_click2
                ? "player1"
                : "player2";

        awaitTargetResult(
            room,
            winner
        );
    }, [room, player]);

    const awaitTargetResult = async (
        currentRoom,
        winner
    ) => {
        const player1Score =
            currentRoom.player1_target_score +
            (winner === "player1" ? 1 : 0);

        const player2Score =
            currentRoom.player2_target_score +
            (winner === "player2" ? 1 : 0);

        const { error } = await supabase
            .from("rooms")
            .update({
                target_winner: winner,

                target_result_processed:
                    true,

                target_status: "finished",

                player1_target_score:
                    player1Score,

                player2_target_score:
                    player2Score,
            })
            .eq("id", currentRoom.id)
            .eq(
                "target_result_processed",
                false
            );

        if (error) {
            console.error(
                "Target result error:",
                error
            );
        }
    };

    // Move Target / Level 4
    useEffect(() => {
        if (!room || player !== "player1")
            return;

        if (room.current_level !== 3)
            return;

        if (
            room.target_status !==
            "finished"
        ) {
            return;
        }

        if (
            !room.target_result_processed
        ) {
            return;
        }

        const timer = setTimeout(
            async () => {
                if (
                    room.target_round <
                    TOTAL_ROUNDS
                ) {
                    await supabase
                        .from("rooms")
                        .update({
                            target_round:
                                room.target_round + 1,

                            target_status:
                                "waiting",

                            target_x: null,
                            target_y: null,

                            target_click1: null,
                            target_click2: null,

                            target_winner: null,

                            target_result_processed:
                                false,
                        })
                        .eq("id", room.id);

                    return;
                }

                const levelWinner =
                    room.player1_target_score >
                        room.player2_target_score
                        ? "player1"
                        : room.player2_target_score >
                            room.player1_target_score
                            ? "player2"
                            : null;

                await supabase
                    .from("rooms")
                    .update({
                        current_level: 4,

                        player1_total_score:
                            (room.player1_total_score ||
                                0) +
                            (levelWinner === "player1"
                                ? 1
                                : 0),

                        player2_total_score:
                            (room.player2_total_score ||
                                0) +
                            (levelWinner === "player2"
                                ? 1
                                : 0),

                        target_round: 1,

                        target_status:
                            "waiting",

                        target_winner:
                            levelWinner,

                        target_result_processed:
                            false,
                    })
                    .eq("id", room.id);
            },
            1800
        );

        return () =>
            clearTimeout(timer);
    }, [room, player]);

    const handleTargetClick = async () => {
        if (!room) return;

        if (
            room.target_status !==
            "playing"
        ) {
            return;
        }

        const clickColumn =
            player === "player1"
                ? "target_click1"
                : "target_click2";

        const alreadyClicked =
            player === "player1"
                ? room.target_click1
                : room.target_click2;

        if (alreadyClicked) return;

        await supabase
            .from("rooms")
            .update({
                [clickColumn]: Date.now(),
            })
            .eq("id", room.id);
    };

    // =====================================================
    // LEVEL 4 — MIND GAME
    // =====================================================

    // Start Mind round
    useEffect(() => {
        if (!room || player !== "player1")
            return;

        if (room.current_level !== 4)
            return;

        if (
            room.mind_status !==
            "waiting"
        ) {
            return;
        }

        const timer = setTimeout(
            async () => {
                await supabase
                    .from("rooms")
                    .update({
                        mind_option1: null,
                        mind_option2: null,

                        mind_winning_option: null,
                        mind_winner: null,

                        mind_result_processed:
                            false,

                        mind_status: "playing",
                    })
                    .eq("id", room.id)
                    .eq(
                        "mind_status",
                        "waiting"
                    );
            },
            1000
        );

        return () =>
            clearTimeout(timer);
    }, [room, player]);

    // Judge Mind
    useEffect(() => {
        if (!room || player !== "player1")
            return;

        if (room.current_level !== 4)
            return;

        if (
            room.mind_status !==
            "playing"
        ) {
            return;
        }

        if (
            !room.mind_option1 ||
            !room.mind_option2
        ) {
            return;
        }

        if (
            room.mind_result_processed
        ) {
            return;
        }

        const options = [
            "red",
            "blue",
        ];

        const winningOption =
            options[
            Math.floor(
                Math.random() *
                options.length
            )
            ];

        let winner = null;

        if (
            room.mind_option1 ===
            winningOption &&
            room.mind_option2 !==
            winningOption
        ) {
            winner = "player1";
        } else if (
            room.mind_option2 ===
            winningOption &&
            room.mind_option1 !==
            winningOption
        ) {
            winner = "player2";
        }

        const player1Score =
            room.player1_mind_score +
            (winner === "player1" ? 1 : 0);

        const player2Score =
            room.player2_mind_score +
            (winner === "player2" ? 1 : 0);

        const processResult =
            async () => {
                await supabase
                    .from("rooms")
                    .update({
                        mind_winning_option:
                            winningOption,

                        mind_winner: winner,

                        mind_result_processed:
                            true,

                        mind_status:
                            "finished",

                        player1_mind_score:
                            player1Score,

                        player2_mind_score:
                            player2Score,
                    })
                    .eq("id", room.id)
                    .eq(
                        "mind_result_processed",
                        false
                    );
            };

        processResult();
    }, [room, player]);

    // Move Mind / Level 5
    useEffect(() => {
        if (!room || player !== "player1")
            return;

        if (room.current_level !== 4)
            return;

        if (
            room.mind_status !==
            "finished"
        ) {
            return;
        }

        if (
            !room.mind_result_processed
        ) {
            return;
        }

        const timer = setTimeout(
            async () => {
                if (
                    room.mind_round <
                    TOTAL_ROUNDS
                ) {
                    await supabase
                        .from("rooms")
                        .update({
                            mind_round:
                                room.mind_round + 1,

                            mind_option1: null,
                            mind_option2: null,

                            mind_winning_option:
                                null,

                            mind_winner: null,

                            mind_status:
                                "waiting",

                            mind_result_processed:
                                false,
                        })
                        .eq("id", room.id);

                    return;
                }

                const levelWinner =
                    room.player1_mind_score >
                        room.player2_mind_score
                        ? "player1"
                        : room.player2_mind_score >
                            room.player1_mind_score
                            ? "player2"
                            : null;

                await supabase
                    .from("rooms")
                    .update({
                        current_level: 5,

                        player1_total_score:
                            (room.player1_total_score ||
                                0) +
                            (levelWinner === "player1"
                                ? 1
                                : 0),

                        player2_total_score:
                            (room.player2_total_score ||
                                0) +
                            (levelWinner === "player2"
                                ? 1
                                : 0),

                        mind_round: 1,

                        mind_status:
                            "waiting",

                        mind_winner:
                            levelWinner,

                        mind_result_processed:
                            false,
                    })
                    .eq("id", room.id);
            },
            1800
        );

        return () =>
            clearTimeout(timer);
    }, [room, player]);

    const handleMindChoice = async (
        choice
    ) => {
        if (!room) return;

        if (
            room.mind_status !==
            "playing"
        ) {
            return;
        }

        if (mindSelected) return;

        setMindSelected(choice);

        const column =
            player === "player1"
                ? "mind_option1"
                : "mind_option2";

        await supabase
            .from("rooms")
            .update({
                [column]: choice,
            })
            .eq("id", room.id);
    };

    useEffect(() => {
        setMindSelected(null);
    }, [room?.mind_round]);

    // =====================================================
    // LEVEL 5 — BOMB FINALE
    // =====================================================

    // Start Bomb round
    useEffect(() => {
        if (!room || player !== "player1")
            return;

        if (room.current_level !== 5)
            return;

        if (
            room.bomb_status !==
            "waiting"
        ) {
            return;
        }

        const timer = setTimeout(
            async () => {
                const wires = [
                    ...BOMB_WIRES,
                ];

                const correctWire =
                    wires[
                    Math.floor(
                        Math.random() *
                        wires.length
                    )
                    ];

                await supabase
                    .from("rooms")
                    .update({
                        bomb_wires:
                            JSON.stringify(wires),

                        bomb_correct_wire:
                            correctWire,

                        bomb_choice1: null,
                        bomb_choice2: null,

                        bomb_winner: null,

                        bomb_result_processed:
                            false,

                        bomb_status:
                            "playing",
                    })
                    .eq("id", room.id)
                    .eq(
                        "bomb_status",
                        "waiting"
                    );
            },
            1000
        );

        return () =>
            clearTimeout(timer);
    }, [room, player]);

    // Judge Bomb
    useEffect(() => {
        if (!room || player !== "player1")
            return;

        if (room.current_level !== 5)
            return;

        if (
            room.bomb_status !==
            "playing"
        ) {
            return;
        }

        if (
            !room.bomb_choice1 ||
            !room.bomb_choice2
        ) {
            return;
        }

        if (
            room.bomb_result_processed
        ) {
            return;
        }

        const player1Correct =
            room.bomb_choice1 ===
            room.bomb_correct_wire;

        const player2Correct =
            room.bomb_choice2 ===
            room.bomb_correct_wire;

        let winner = null;

        if (
            player1Correct &&
            !player2Correct
        ) {
            winner = "player1";
        } else if (
            !player1Correct &&
            player2Correct
        ) {
            winner = "player2";
        }

        const player1Score =
            room.player1_bomb_score +
            (winner === "player1" ? 1 : 0);

        const player2Score =
            room.player2_bomb_score +
            (winner === "player2" ? 1 : 0);

        const processResult =
            async () => {
                await supabase
                    .from("rooms")
                    .update({
                        bomb_winner:
                            winner,

                        bomb_result_processed:
                            true,

                        bomb_status:
                            "finished",

                        player1_bomb_score:
                            player1Score,

                        player2_bomb_score:
                            player2Score,
                    })
                    .eq("id", room.id)
                    .eq(
                        "bomb_result_processed",
                        false
                    );
            };

        processResult();
    }, [room, player]);

    // Next Bomb round / FINAL
    useEffect(() => {
        if (!room || player !== "player1")
            return;

        if (room.current_level !== 5)
            return;

        if (
            room.bomb_status !==
            "finished"
        ) {
            return;
        }

        if (
            !room.bomb_result_processed
        ) {
            return;
        }

        const timer = setTimeout(
            async () => {
                if (
                    room.bomb_round <
                    TOTAL_ROUNDS
                ) {
                    await supabase
                        .from("rooms")
                        .update({
                            bomb_round:
                                room.bomb_round + 1,

                            bomb_wires: null,
                            bomb_correct_wire: null,

                            bomb_choice1: null,
                            bomb_choice2: null,

                            bomb_winner: null,

                            bomb_status:
                                "waiting",

                            bomb_result_processed:
                                false,
                        })
                        .eq("id", room.id);

                    return;
                }

                // =============================================
                // BOMB FINALE COMPLETE
                // Level 5 = 2 overall points
                // =============================================

                const bombWinner =
                    room.player1_bomb_score >
                        room.player2_bomb_score
                        ? "player1"
                        : room.player2_bomb_score >
                            room.player1_bomb_score
                            ? "player2"
                            : null;

                const player1Total =
                    (room.player1_total_score ||
                        0) +
                    (bombWinner === "player1"
                        ? 2
                        : 0);

                const player2Total =
                    (room.player2_total_score ||
                        0) +
                    (bombWinner === "player2"
                        ? 2
                        : 0);

                const finalWinner =
                    player1Total > player2Total
                        ? "player1"
                        : player2Total > player1Total
                            ? "player2"
                            : "draw";

                await supabase
                    .from("rooms")
                    .update({
                        bomb_status: "final",
                        player1_total_score: player1Total,
                        player2_total_score: player2Total,
                        final_winner: finalWinner,
                        reward_status: "pending",
                        selected_reward: null,
                        reward_selected_by: null,
                        bomb_result_processed: true,
                    })
                    .eq("id", room.id);
            },
            2000
        );

        return () =>
            clearTimeout(timer);
    }, [room, player]);

    const handleBombChoice = async (
        wire
    ) => {
        if (!room) return;

        if (
            room.bomb_status !==
            "playing"
        ) {
            return;
        }

        const alreadySelected =
            player === "player1"
                ? room.bomb_choice1
                : room.bomb_choice2;

        if (
            alreadySelected ||
            bombSelected
        ) {
            return;
        }

        setBombSelected(wire);

        const column =
            player === "player1"
                ? "bomb_choice1"
                : "bomb_choice2";

        await supabase
            .from("rooms")
            .update({
                [column]: wire,
            })
            .eq("id", room.id);
    };

    useEffect(() => {
        setBombSelected(null);
    }, [room?.bomb_round]);

    const handleRewardSelect = async (reward) => {
  if (!room) return;

  if (room.reward_status === "selected") {
    return;
  }

  const loser =
    room.final_winner === "player1"
      ? "player2"
      : room.final_winner === "player2"
        ? "player1"
        : null;

  if (player !== loser) {
    return;
  }

  await supabase
    .from("rooms")
    .update({
      selected_reward: reward,
      reward_selected_by: player,
      reward_status: "selected",
    })
    .eq("id", room.id)
    .eq("reward_status", "pending");
};

    // =====================================================
    // LOADING
    // =====================================================

    if (!room || !player) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
                <p className="font-bold">
                    Loading game...
                </p>
            </div>
        );
    }

    // =====================================================
    // LEVEL 1 UI
    // =====================================================

    if (room.current_level === 1) {
        const myClick =
            player === "player1"
                ? room.player1_click
                : room.player2_click;

        return (
            <div className="min-h-screen bg-[#F5F1E8] p-6">
                <div className="max-w-5xl mx-auto">

                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-4xl font-black">
                                CLASH5
                            </h1>

                            <p className="font-bold">
                                ⚡ REACTION DUEL
                            </p>
                        </div>

                        <div className="text-right">
                            <p className="text-sm font-bold">
                                CHANCE
                            </p>

                            <p className="text-3xl font-black">
                                {room.reaction_round}/5
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">

                        <div className="bg-white border-4 border-black p-5">
                            <p className="font-bold">
                                {room.player1_name}
                            </p>

                            <p className="text-4xl font-black">
                                {room.player1_score}
                            </p>
                        </div>

                        <div className="bg-white border-4 border-black p-5">
                            <p className="font-bold">
                                {room.player2_name}
                            </p>

                            <p className="text-4xl font-black">
                                {room.player2_score}
                            </p>
                        </div>

                    </div>

                    <div className="bg-black text-white min-h-[450px] flex items-center justify-center text-center p-8">

                        {room.reaction_status === "waiting" && (
                            <div>
                                <p className="text-7xl mb-6">
                                    ⚡
                                </p>

                                <p className="text-5xl font-black">
                                    GET READY...
                                </p>

                                <p className="mt-4 text-gray-400">
                                    Wait for NOW!
                                </p>
                            </div>
                        )}

                        {room.reaction_status === "go" &&
                            !myClick && (
                                <button
                                    onClick={handleReactionClick}
                                    className="w-64 h-64 rounded-full bg-red-500 text-white text-5xl font-black hover:scale-105 transition"
                                >
                                    NOW!
                                </button>
                            )}

                        {room.reaction_status === "go" &&
                            myClick && (
                                <div>
                                    <p className="text-6xl">
                                        ⚡
                                    </p>

                                    <p className="text-3xl font-black mt-5">
                                        CLICKED!
                                    </p>

                                    <p className="text-gray-400 mt-3">
                                        Waiting for opponent...
                                    </p>
                                </div>
                            )}

                        {room.reaction_status === "finished" && (
                            <div>

                                <p className="text-5xl font-black">
                                    {room.reaction_winner === player
                                        ? "YOU WIN! ⚡🔥"
                                        : "YOU LOSE 😭"}
                                </p>

                                <p className="mt-6 text-2xl font-black">
                                    {room.player1_score}
                                    {" — "}
                                    {room.player2_score}
                                </p>

                            </div>
                        )}

                    </div>
                </div>
            </div>
        );
    }

    // =====================================================
    // LEVEL 2 UI
    // =====================================================

    if (room.current_level === 2) {
        const sequence =
            room.memory_sequence
                ? JSON.parse(
                    room.memory_sequence
                )
                : [];

        const myAnswer =
            player === "player1"
                ? room.memory_answer1
                : room.memory_answer2;

        return (
            <div className="min-h-screen bg-[#F5F1E8] p-6">
                <div className="max-w-4xl mx-auto">

                    <div className="flex justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-black">
                                CLASH5
                            </h1>

                            <p className="font-bold">
                                🧠 MEMORY CHAOS
                            </p>
                        </div>

                        <div className="text-right">
                            <p className="text-sm font-bold">
                                ROUND
                            </p>

                            <p className="text-3xl font-black">
                                {room.memory_round}/5
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">

                        <div className="bg-white border-4 border-black p-5">
                            <p className="font-bold">
                                {room.player1_name}
                            </p>

                            <p className="text-4xl font-black">
                                {room.player1_memory_score}
                            </p>
                        </div>

                        <div className="bg-white border-4 border-black p-5">
                            <p className="font-bold">
                                {room.player2_name}
                            </p>

                            <p className="text-4xl font-black">
                                {room.player2_memory_score}
                            </p>
                        </div>

                    </div>

                    <div className="bg-black text-white p-8 md:p-12 text-center">

                        {room.memory_status === "showing" && (
                            <>
                                <p className="text-gray-400 mb-6">
                                    REMEMBER THIS!
                                </p>

                                <div className="flex justify-center gap-4 text-6xl">
                                    {sequence.map(
                                        (emoji, index) => (
                                            <span key={index}>
                                                {emoji}
                                            </span>
                                        )
                                    )}
                                </div>
                            </>
                        )}

                        {room.memory_status === "waiting" && (
                            <p className="text-4xl font-black">
                                GET READY...
                            </p>
                        )}

                        {room.memory_status === "playing" &&
                            !myAnswer && (
                                <>
                                    <p className="text-xl font-bold mb-8">
                                        REBUILD THE SEQUENCE 👇
                                    </p>

                                    <div className="min-h-20 flex justify-center items-center gap-3 mb-8">
                                        {selected.map(
                                            (emoji, index) => (
                                                <span
                                                    key={index}
                                                    className="text-4xl"
                                                >
                                                    {emoji}
                                                </span>
                                            )
                                        )}
                                    </div>

                                    <div className="grid grid-cols-5 gap-3 max-w-xl mx-auto">
                                        {EMOJIS.map(
                                            (emoji) => (
                                                <button
                                                    key={emoji}
                                                    onClick={() =>
                                                        handleEmojiClick(
                                                            emoji
                                                        )
                                                    }
                                                    className="bg-white text-black text-4xl p-4 hover:scale-105 transition"
                                                >
                                                    {emoji}
                                                </button>
                                            )
                                        )}
                                    </div>

                                    <button
                                        onClick={
                                            handleMemorySubmit
                                        }
                                        disabled={
                                            selected.length !==
                                            sequence.length
                                        }
                                        className="mt-8 bg-[#6C4EFF] disabled:opacity-30 px-10 py-4 text-xl font-black"
                                    >
                                        SUBMIT
                                    </button>
                                </>
                            )}

                        {room.memory_status === "playing" &&
                            myAnswer && (
                                <div>
                                    <p className="text-3xl font-black">
                                        ANSWER SUBMITTED ✅
                                    </p>

                                    <p className="mt-4 text-gray-400">
                                        Waiting for your opponent...
                                    </p>
                                </div>
                            )}

                        {room.memory_status === "finished" && (
                            <div>

                                <p className="text-5xl font-black">
                                    {room.memory_winner === player
                                        ? "YOU WIN! 🧠🔥"
                                        : room.memory_winner === null
                                            ? "DRAW! 🤝"
                                            : "YOU LOSE 😭"}
                                </p>

                                <p className="mt-6 text-2xl font-black">
                                    {room.player1_memory_score}
                                    {" — "}
                                    {room.player2_memory_score}
                                </p>

                            </div>
                        )}

                    </div>
                </div>
            </div>
        );
    }

    // =====================================================
    // LEVEL 3 UI
    // =====================================================

    if (room.current_level === 3) {
        const myClick =
            player === "player1"
                ? room.target_click1
                : room.target_click2;

        return (
            <div className="min-h-screen bg-[#F5F1E8] p-6">
                <div className="max-w-5xl mx-auto">

                    <div className="flex justify-between items-center mb-8">

                        <div>
                            <h1 className="text-4xl font-black">
                                CLASH5
                            </h1>

                            <p className="font-bold">
                                🎯 TARGET SMASH
                            </p>
                        </div>

                        <div className="text-right">
                            <p className="text-sm font-bold">
                                ROUND
                            </p>

                            <p className="text-3xl font-black">
                                {room.target_round}/5
                            </p>
                        </div>

                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">

                        <div className="bg-white border-4 border-black p-4">
                            <p className="font-bold">
                                {room.player1_name}
                            </p>

                            <p className="text-4xl font-black">
                                {room.player1_target_score}
                            </p>
                        </div>

                        <div className="bg-white border-4 border-black p-4">
                            <p className="font-bold">
                                {room.player2_name}
                            </p>

                            <p className="text-4xl font-black">
                                {room.player2_target_score}
                            </p>
                        </div>

                    </div>

                    <div className="relative bg-black w-full h-[550px] overflow-hidden">

                        {room.target_status === "waiting" && (
                            <div className="absolute inset-0 flex items-center justify-center">

                                <p className="text-white text-4xl font-black">
                                    GET READY...
                                </p>

                            </div>
                        )}

                        {room.target_status === "playing" &&
                            !myClick && (
                                <button
                                    onClick={
                                        handleTargetClick
                                    }
                                    className="absolute -translate-x-1/2 -translate-y-1/2 text-5xl hover:scale-125 transition-transform"
                                    style={{
                                        left: `${room.target_x}%`,
                                        top: `${room.target_y}%`,
                                    }}
                                >
                                    🎯
                                </button>
                            )}

                        {room.target_status === "playing" &&
                            myClick && (
                                <div className="absolute inset-0 flex items-center justify-center">

                                    <p className="text-white text-3xl font-black">
                                        WAITING FOR OPPONENT...
                                    </p>

                                </div>
                            )}

                        {room.target_status === "finished" && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">

                                <p className="text-5xl font-black">
                                    {room.target_winner === player
                                        ? "YOU SMASHED IT! 🔥"
                                        : "YOU LOST 😭"}
                                </p>

                                <p className="mt-6 text-2xl font-black">
                                    {room.player1_target_score}
                                    {" — "}
                                    {room.player2_target_score}
                                </p>

                            </div>
                        )}

                    </div>
                </div>
            </div>
        );
    }

    // =====================================================
    // LEVEL 4 UI
    // =====================================================

    if (room.current_level === 4) {
        const myOption =
            player === "player1"
                ? room.mind_option1
                : room.mind_option2;

        return (
            <div className="min-h-screen bg-[#F5F1E8] p-6">
                <div className="max-w-4xl mx-auto">

                    <div className="flex justify-between items-center mb-10">

                        <div>
                            <h1 className="text-4xl font-black">
                                CLASH5
                            </h1>

                            <p className="font-bold">
                                🧙 MIND GAME
                            </p>
                        </div>

                        <div className="text-right">
                            <p className="text-sm font-bold">
                                ROUND
                            </p>

                            <p className="text-3xl font-black">
                                {room.mind_round}/5
                            </p>
                        </div>

                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">

                        <div className="bg-white border-4 border-black p-5">
                            <p className="font-bold">
                                {room.player1_name}
                            </p>

                            <p className="text-4xl font-black">
                                {room.player1_mind_score}
                            </p>
                        </div>

                        <div className="bg-white border-4 border-black p-5">
                            <p className="font-bold">
                                {room.player2_name}
                            </p>

                            <p className="text-4xl font-black">
                                {room.player2_mind_score}
                            </p>
                        </div>

                    </div>

                    <div className="bg-black text-white p-10 md:p-16 text-center">

                        {room.mind_status === "waiting" && (
                            <p className="text-4xl font-black">
                                GET READY...
                            </p>
                        )}

                        {room.mind_status === "playing" &&
                            !myOption && (
                                <>
                                    <p className="text-gray-400 uppercase tracking-widest mb-4">
                                        Choose your side
                                    </p>

                                    <h2 className="text-4xl font-black mb-10">
                                        RED OR BLUE?
                                    </h2>

                                    <div className="grid grid-cols-2 gap-5 max-w-lg mx-auto">

                                        <button
                                            onClick={() =>
                                                handleMindChoice(
                                                    "red"
                                                )
                                            }
                                            className="bg-red-500 hover:scale-105 transition p-10 text-3xl font-black"
                                        >
                                            🔴 RED
                                        </button>

                                        <button
                                            onClick={() =>
                                                handleMindChoice(
                                                    "blue"
                                                )
                                            }
                                            className="bg-blue-500 hover:scale-105 transition p-10 text-3xl font-black"
                                        >
                                            🔵 BLUE
                                        </button>

                                    </div>
                                </>
                            )}

                        {room.mind_status === "playing" &&
                            myOption && (
                                <div>

                                    <p className="text-5xl mb-5">
                                        {myOption === "red"
                                            ? "🔴"
                                            : "🔵"}
                                    </p>

                                    <p className="text-3xl font-black">
                                        CHOICE LOCKED 🔒
                                    </p>

                                    <p className="mt-4 text-gray-400">
                                        Waiting for your opponent...
                                    </p>

                                </div>
                            )}

                        {room.mind_status === "finished" && (
                            <div>

                                <p className="text-gray-400 uppercase tracking-widest mb-4">
                                    Winning side
                                </p>

                                <p className="text-6xl mb-8">
                                    {room.mind_winning_option ===
                                        "red"
                                        ? "🔴 RED"
                                        : "🔵 BLUE"}
                                </p>

                                <p className="text-4xl font-black">
                                    {room.mind_winner === player
                                        ? "YOU WIN! 🔥"
                                        : room.mind_winner === null
                                            ? "DRAW! 🤝"
                                            : "YOU LOSE 😭"}
                                </p>

                                <p className="mt-6 text-2xl font-black">
                                    {room.player1_mind_score}
                                    {" — "}
                                    {room.player2_mind_score}
                                </p>

                            </div>
                        )}

                    </div>
                </div>
            </div>
        );
    }

    // =====================================================
    // LEVEL 5 UI — BOMB FINALE
    // =====================================================

// =====================================================
// LEVEL 5 UI — BOMB FINALE
// =====================================================

if (room.current_level === 5) {
    const myChoice =
        player === "player1"
            ? room.bomb_choice1
            : room.bomb_choice2;

    // ---------------------------------------------
    // FINAL RESULT / REWARD SCREEN
    // ---------------------------------------------
    if (room.bomb_status === "final") {
        const winner =
            room.final_winner === "player1"
                ? room.player1_name
                : room.final_winner === "player2"
                    ? room.player2_name
                    : null;

        const loser =
            room.final_winner === "player1"
                ? room.player2_name
                : room.final_winner === "player2"
                    ? room.player1_name
                    : null;

        const isWinner =
            room.final_winner === player;

        const isLoser =
            room.final_winner !== "draw" &&
            room.final_winner !== player;

        return (
            <div className="min-h-screen bg-[#F5F1E8] p-6">
                <div className="max-w-4xl mx-auto">

                    <div className="text-center mb-10">
                        <p className="text-sm font-bold uppercase tracking-widest">
                            💣 CLASH5 COMPLETE
                        </p>

                        <h1 className="text-6xl font-black mt-3">
                            CLASH5
                        </h1>
                    </div>

                    <div className="bg-black text-white p-8 md:p-12 text-center">

                        {room.final_winner === "draw" ? (
                            <>
                                <p className="text-8xl mb-6">
                                    🤝
                                </p>

                                <h2 className="text-5xl font-black">
                                    IT'S A DRAW!
                                </h2>

                                <p className="text-xl mt-5 text-gray-400">
                                    Both players fought hard!
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-8xl mb-6">
                                    🏆
                                </p>

                                <p className="text-sm uppercase tracking-widest text-gray-400">
                                    WINNER
                                </p>

                                <h2 className="text-5xl md:text-6xl font-black mt-3">
                                    {winner}
                                </h2>

                                <p className="text-2xl mt-4">
                                    CONGRATULATIONS! 🎉
                                </p>
                            </>
                        )}

                        {/* SCORE */}
                        <div className="grid grid-cols-2 gap-5 max-w-xl mx-auto mt-10">

                            <div className="bg-white text-black p-6">
                                <p className="font-bold">
                                    {room.player1_name}
                                </p>

                                <p className="text-6xl font-black mt-2">
                                    {room.player1_total_score}
                                </p>
                            </div>

                            <div className="bg-white text-black p-6">
                                <p className="font-bold">
                                    {room.player2_name}
                                </p>

                                <p className="text-6xl font-black mt-2">
                                    {room.player2_total_score}
                                </p>
                            </div>

                        </div>

                        {/* DRAW */}
                        {room.final_winner === "draw" && (
                            <div className="mt-10">
                                <p className="text-xl font-bold">
                                    Nobody owes anyone anything 😎
                                </p>
                            </div>
                        )}

                        {/* LOSER */}
                        {isLoser &&
                            room.reward_status === "pending" && (
                                <div className="mt-12 border-t border-gray-700 pt-10">

                                    <p className="text-3xl font-black">
                                        {loser}, you lost 😈
                                    </p>

                                    <p className="text-xl mt-4">
                                        Now you have to decide what
                                        you want to give{" "}
                                        <span className="font-black">
                                            {winner}
                                        </span>
                                        !
                                    </p>

                                    <button
                                        onClick={() =>
                                            document
                                                .getElementById("reward-list")
                                                ?.scrollIntoView({
                                                    behavior: "smooth",
                                                })
                                        }
                                        className="mt-8 bg-white text-black px-8 py-4 font-black text-lg hover:scale-105 transition"
                                    >
                                        CHECK REWARDS 🎁
                                    </button>

                                    <div
                                        id="reward-list"
                                        className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4"
                                    >
                                        {REWARDS.map((reward) => (
                                            <button
                                                key={reward.id}
                                                onClick={() =>
                                                    handleRewardSelect(
                                                        reward.name
                                                    )
                                                }
                                                className="bg-white text-black p-6 text-left border-4 border-white hover:bg-gray-200 transition"
                                            >
                                                <p className="text-2xl font-black">
                                                    {reward.name}
                                                </p>

                                                <p className="text-gray-600 mt-2">
                                                    {reward.description}
                                                </p>
                                            </button>
                                        ))}
                                    </div>

                                </div>
                            )}

                        {/* LOSER WAITING */}
                        {isLoser &&
                            room.reward_status === "selected" && (
                                <div className="mt-12 border-t border-gray-700 pt-10">

                                    <p className="text-3xl font-black">
                                        Reward selected! 🎁
                                    </p>

                                    <p className="mt-4 text-gray-400">
                                        Waiting for {winner} to see
                                        their reward...
                                    </p>

                                </div>
                            )}

                        {/* WINNER WAITING */}
                        {isWinner &&
                            room.reward_status === "pending" && (
                                <div className="mt-12 border-t border-gray-700 pt-10">

                                    <p className="text-3xl font-black">
                                        You won! 🏆
                                    </p>

                                    <p className="mt-4 text-xl">
                                        {loser} is deciding your reward 😈
                                    </p>

                                    <p className="mt-3 text-gray-400">
                                        Wait for your surprise...
                                    </p>

                                </div>
                            )}

                        {/* WINNER RECEIVES REWARD */}
                        {isWinner &&
                            room.reward_status === "selected" && (
                                <div className="mt-12 border-t border-gray-700 pt-10">

                                    <p className="text-6xl mb-5">
                                        🎉🎁🎉
                                    </p>

                                    <p className="text-2xl text-gray-400">
                                        CONGRATULATIONS!
                                    </p>

                                    <h3 className="text-4xl font-black mt-4">
                                        You got
                                    </h3>

                                    <p className="text-5xl font-black mt-5">
                                        {room.selected_reward}
                                    </p>

                                    <p className="mt-6 text-xl">
                                        From{" "}
                                        <span className="font-black">
                                            {loser}
                                        </span>
                                        ❤️
                                    </p>

                                </div>
                            )}

                    </div>
                </div>
            </div>
        );
    }

    // ---------------------------------------------
    // BOMB GAME SCREEN
    // ---------------------------------------------

    return (
        <div className="min-h-screen bg-[#F5F1E8] p-6">

            <div className="max-w-5xl mx-auto">

                {/* HEADER */}
                <div className="flex justify-between items-center mb-8">

                    <div>
                        <h1 className="text-4xl font-black">
                            CLASH5
                        </h1>

                        <p className="font-bold">
                            💣 BOMB FINALE
                        </p>
                    </div>

                    <div className="text-right">
                        <p className="text-sm font-bold">
                            ROUND
                        </p>

                        <p className="text-3xl font-black">
                            {room.bomb_round}/5
                        </p>
                    </div>

                </div>

                {/* SCORES */}
                <div className="grid grid-cols-2 gap-4 mb-8">

                    <div className="bg-white border-4 border-black p-5">
                        <p className="font-bold">
                            {room.player1_name}
                        </p>

                        <p className="text-4xl font-black">
                            {room.player1_bomb_score}
                        </p>
                    </div>

                    <div className="bg-white border-4 border-black p-5">
                        <p className="font-bold">
                            {room.player2_name}
                        </p>

                        <p className="text-4xl font-black">
                            {room.player2_bomb_score}
                        </p>
                    </div>

                </div>

                {/* GAME AREA */}
                <div className="bg-black text-white p-8 md:p-12 text-center">

                    {/* WAITING */}
                    {room.bomb_status === "waiting" && (
                        <div>

                            <p className="text-8xl mb-6">
                                💣
                            </p>

                            <p className="text-5xl font-black">
                                GET READY...
                            </p>

                            <p className="mt-4 text-gray-400">
                                Choose the correct wire!
                            </p>

                        </div>
                    )}

                    {/* PLAYING */}
                    {room.bomb_status === "playing" && (
                        <div>

                            <p className="text-5xl mb-4">
                                💣
                            </p>

                            <p className="text-3xl font-black">
                                CUT THE WIRE!
                            </p>

                            <p className="text-gray-400 mt-3">
                                Choose carefully...
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-3xl mx-auto mt-10">

                                {BOMB_WIRES.map((wire) => (
                                    <button
                                        key={wire}
                                        onClick={() =>
                                            handleBombChoice(wire)
                                        }
                                        disabled={!!myChoice}
                                        className={`
                                            p-6 text-white font-black uppercase
                                            border-4 border-white
                                            transition hover:scale-105
                                            disabled:opacity-40
                                            ${wire === "red"
                                                ? "bg-red-500"
                                                : wire === "yellow"
                                                    ? "bg-yellow-400 text-black"
                                                    : wire === "blue"
                                                        ? "bg-blue-500"
                                                        : wire === "green"
                                                            ? "bg-green-500"
                                                            : "bg-purple-500"
                                            }
                                        `}
                                    >
                                        {wire}
                                    </button>
                                ))}

                            </div>

                            {myChoice && (
                                <div className="mt-10">

                                    <p className="text-3xl font-black">
                                        WIRE SELECTED 🔒
                                    </p>

                                    <p className="mt-3 text-gray-400">
                                        Waiting for your opponent...
                                    </p>

                                </div>
                            )}

                        </div>
                    )}

                    {/* ROUND RESULT */}
                    {room.bomb_status === "finished" && (
                        <div>

                            <p className="text-6xl mb-6">
                                💥
                            </p>

                            <p className="text-4xl font-black">
                                {room.bomb_winner === player
                                    ? "YOU WIN! 🔥"
                                    : room.bomb_winner === null
                                        ? "DRAW! 🤝"
                                        : "YOU LOSE 😭"}
                            </p>

                            <p className="mt-6 text-2xl font-black">
                                {room.player1_bomb_score}
                                {" — "}
                                {room.player2_bomb_score}
                            </p>

                        </div>
                    )}

                </div>

            </div>

        </div>
    );
}

return null;

    return null;
}

export default Game;