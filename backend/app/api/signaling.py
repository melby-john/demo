import json
import logging
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("signconnect-webrtc")

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Map: room_id -> list of active WebSocket connections
        self.rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.rooms:
            self.rooms[room_id] = []
        self.rooms[room_id].append(websocket)
        peer_count = len(self.rooms[room_id])
        logger.info(f"Client connected to room '{room_id}'. Total peers: {peer_count}")
        return peer_count

    def disconnect(self, room_id: str, websocket: WebSocket):
        if room_id in self.rooms and websocket in self.rooms[room_id]:
            self.rooms[room_id].remove(websocket)
            logger.info(f"Client left room '{room_id}'. Remaining peers: {len(self.rooms[room_id])}")
            if not self.rooms[room_id]:
                del self.rooms[room_id]

    async def broadcast_to_peers(self, room_id: str, sender: WebSocket, message: dict):
        """Sends message to all other participants in the room except sender."""
        if room_id not in self.rooms:
            return
        for client in self.rooms[room_id]:
            if client != sender:
                try:
                    await client.send_text(json.dumps(message))
                except Exception as e:
                    logger.warning(f"Error sending message to peer in room '{room_id}': {e}")

manager = ConnectionManager()

@router.websocket("/ws/meeting/{room_id}")
async def meeting_signaling_endpoint(websocket: WebSocket, room_id: str):
    peer_count = await manager.connect(room_id, websocket)
    try:
        # Notify the newly connected client of current room state
        await websocket.send_text(json.dumps({
            "type": "room-info",
            "roomId": room_id,
            "peerCount": peer_count,
            "isInitiator": peer_count == 1
        }))

        # If a second peer joined, notify the first peer to start WebRTC offer
        if peer_count > 1:
            await manager.broadcast_to_peers(room_id, websocket, {
                "type": "peer-joined",
                "roomId": room_id,
                "peerCount": peer_count
            })

        while True:
            data_str = await websocket.receive_text()
            data = json.loads(data_str)
            msg_type = data.get("type")

            # Route WebRTC signals (offer, answer, candidate, caption, chat, status, etc.)
            if msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            else:
                await manager.broadcast_to_peers(room_id, websocket, data)

    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
        await manager.broadcast_to_peers(room_id, websocket, {
            "type": "peer-left",
            "roomId": room_id
        })
    except Exception as e:
        logger.error(f"WebSocket error in room '{room_id}': {e}")
        manager.disconnect(room_id, websocket)
        await manager.broadcast_to_peers(room_id, websocket, {
            "type": "peer-left",
            "roomId": room_id
        })
