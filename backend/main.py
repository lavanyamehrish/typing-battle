from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rooms = {}

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):

    await websocket.accept()

    if room_id not in rooms:
        rooms[room_id] = {
            "connections": [],
            "players": {},
            "host": websocket,
            "room_name": "Typing Battle Room",
            "game_active": False,

            "current_round": 1,
            "score_board": {},

            "settings": {
                "matchType": "single",
                "rounds": 1,
                "difficulty": "easy",
                "timer": 60
            }
        }

    rooms[room_id]["connections"].append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # JOIN
            if message.get("type") == "join":
                username = message.get("username")
                rooms[room_id]["players"][websocket] = username
                rooms[room_id]["score_board"][username] = 0
                await broadcast_room_state(room_id)

            # UPDATE ROOM NAME
            elif message.get("type") == "update_room_name":
                if websocket == rooms[room_id]["host"]:
                    rooms[room_id]["room_name"] = message.get("room_name")
                    await broadcast_room_state(room_id)

            # UPDATE MATCH SETTINGS
            elif message.get("type") == "update_match_settings":
                if websocket == rooms[room_id]["host"]:
                    rooms[room_id]["match_type"] = message.get("match_type")
                    rooms[room_id]["total_rounds"] = message.get("total_rounds")
                    rooms[room_id]["win_criteria"] = message.get("win_criteria")
                    await broadcast_room_state(room_id)

            # START GAME
            elif message.get("type") == "start_game":

                if websocket == rooms[room_id]["host"]:

                    settings = message.get("settings", {})

                    rooms[room_id]["settings"] = settings
                    rooms[room_id]["game_active"] = True
                    rooms[room_id]["current_round"] = 1

                    await broadcast(room_id, {
                        "type": "game_start",
                        "round": 1,
                        "settings": settings
                })

            # END ROUND
            elif message.get("type") == "end_round":

                if websocket == rooms[room_id]["host"]:

                    winner = message.get("winner")

                    rooms[room_id]["score_board"][winner] += 1

                    current_round = rooms[room_id]["current_round"]
                    total_rounds = rooms[room_id]["settings"]["rounds"]
                    match_type = rooms[room_id]["settings"]["matchType"]

                    if match_type == "tournament" and current_round < total_rounds:

                        rooms[room_id]["current_round"] += 1

                        await broadcast(room_id, {
                            "type": "next_round",
                            "round": rooms[room_id]["current_round"],
                            "score_board": rooms[room_id]["score_board"]
                        })

                    else:

                        rooms[room_id]["game_active"] = False

                        await broadcast(room_id, {
                            "type": "tournament_ended",
                            "score_board": rooms[room_id]["score_board"]
            })

            # TYPING UPDATE
            else:
                await broadcast(room_id, message)

    except WebSocketDisconnect:
        rooms[room_id]["connections"].remove(websocket)

        if websocket in rooms[room_id]["players"]:
            username = rooms[room_id]["players"][websocket]
            del rooms[room_id]["players"][websocket]
            del rooms[room_id]["score_board"][username]

        if websocket == rooms[room_id]["host"]:
            if rooms[room_id]["connections"]:
                rooms[room_id]["host"] = rooms[room_id]["connections"][0]
            else:
                del rooms[room_id]
                return

        await broadcast_room_state(room_id)


async def broadcast(room_id, message):
    for connection in rooms[room_id]["connections"]:
        await connection.send_text(json.dumps(message))


async def broadcast_room_state(room_id):

    room = rooms[room_id]

    players = list(room["players"].values())

    for connection in room["connections"]:
        await connection.send_text(json.dumps({
            "type": "lobby_update",
            "room_name": room["room_name"],
            "players": players,
            "score_board": room["score_board"],
            "game_active": room["game_active"],
            "is_host": connection == room["host"]
        }))