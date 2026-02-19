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
            "settings": {
                "timer": 60,
                "word_count": 50,
                "difficulty": "easy"
            },
            "game_active": False
        }

    rooms[room_id]["connections"].append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # User joins
            if message.get("type") == "join":
                username = message.get("username")
                rooms[room_id]["players"][websocket] = username
                await broadcast_room_state(room_id)

            # Update room name
            elif message.get("type") == "update_room_name":
                if websocket == rooms[room_id]["host"]:
                    rooms[room_id]["room_name"] = message.get("room_name")
                    await broadcast_room_state(room_id)

            # Update settings
            elif message.get("type") == "update_settings":
                if websocket == rooms[room_id]["host"]:
                    rooms[room_id]["settings"] = message.get("settings")
                    await broadcast_room_state(room_id)

            # Start game
            elif message.get("type") == "start_game":
                if websocket == rooms[room_id]["host"]:
                    rooms[room_id]["game_active"] = True
                    await broadcast(room_id, {
                        "type": "game_start",
                        "settings": rooms[room_id]["settings"]
                    })

            # Terminate game
            elif message.get("type") == "terminate_game":
                if websocket == rooms[room_id]["host"]:
                    rooms[room_id]["game_active"] = False
                    await broadcast(room_id, {
                        "type": "game_terminated"
                    })
                    await broadcast_room_state(room_id)

            # Typing updates
            else:
                await broadcast(room_id, message)

    except WebSocketDisconnect:

        rooms[room_id]["connections"].remove(websocket)

        if websocket in rooms[room_id]["players"]:
            del rooms[room_id]["players"][websocket]

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
    for connection in rooms[room_id]["connections"]:
        await connection.send_text(json.dumps({
            "type": "lobby_update",
            "room_name": rooms[room_id]["room_name"],
            "settings": rooms[room_id]["settings"],
            "players": list(rooms[room_id]["players"].values()),
            "game_active": rooms[room_id]["game_active"],
            "is_host": connection == rooms[room_id]["host"]
        }))
