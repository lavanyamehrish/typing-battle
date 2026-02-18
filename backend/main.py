from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
import json

app = FastAPI()

# Allow frontend connections (development mode)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active rooms and connections
rooms: Dict[str, List[WebSocket]] = {}


@app.get("/")
def read_root():
    return {"message": "Typing Battle Backend Running 🚀"}


@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()

    # Create room if it doesn't exist
    if room_id not in rooms:
        rooms[room_id] = []

    # Add user to room
    rooms[room_id].append(websocket)

    print(f"User joined room {room_id}. Total users: {len(rooms[room_id])}")

    try:
        while True:
            data = await websocket.receive_text()
            parsed_data = json.loads(data)


            # Broadcast message to everyone in the room
            for connection in rooms[room_id]:
                await connection.send_text(json.dumps(parsed_data))


    except WebSocketDisconnect:
        # Remove user from room
        rooms[room_id].remove(websocket)

        print(f"User left room {room_id}")

        # Delete room if empty
        if len(rooms[room_id]) == 0:
            del rooms[room_id]
            print(f"Room {room_id} deleted")
