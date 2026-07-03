import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from scanner.service import scanner_service

router = APIRouter()

@router.websocket("/ws/scanner")
async def websocket_scanner_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint that coordinates the fingerprint scanning sequence.
    Continuously streams preview frames from the scanner to the client.
    """
    await websocket.accept()
    print("[WS] Client connected to /ws/scanner")
    
    # Re-initialize scanner if it was terminated/aborted in a previous session
    try:
        scanner_service.initialize()
    except Exception as e:
        print(f"[WS WARN] Re-initializing scanner on connect failed: {e}")
        await websocket.send_json({
            "status": "error",
            "message": f"Scanner initialization failed: {str(e)}"
        })
        return

    async def send_json_safe(data):
        if websocket.client_state.name != "CONNECTED":
            return False
        try:
            await websocket.send_json(data)
            return True
        except Exception as ex:
            print(f"[WS] Failed to send JSON (client disconnected): {ex}")
            return False

    streaming = True
    consecutive_errors = 0
    
    # Task to read incoming client messages (e.g., if they want to stop/start/etc.)
    async def read_messages():
        nonlocal streaming
        try:
            while True:
                data = await websocket.receive_json()
                action = data.get("action")
                if action == "stop":
                    streaming = False
                elif action == "start":
                    streaming = True
        except WebSocketDisconnect:
            print("[WS] Receive loop disconnected")
            streaming = False
        except Exception as e:
            print(f"[WS ERROR] Error in WebSocket read: {e}")
            streaming = False

    read_task = asyncio.create_task(read_messages())
    
    try:
        while streaming:
            # Execute blocking capture DLL wrapper in uvicorn's thread pool executor
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(None, scanner_service.capture)
            
            if result.get("status") == "success":
                consecutive_errors = 0
                if not await send_json_safe({
                    "status": "preview",
                    "image": result.get("image")
                }):
                    break
                # Stream at ~15 FPS (approx 66ms delay)
                await asyncio.sleep(0.06)
            else:
                consecutive_errors += 1
                error_msg = result.get("message", "Scanner capture failed")
                print(f"[WS WARN] Scanner capture error (attempt {consecutive_errors}/10): {error_msg}")
                
                # Send warning status to the frontend instead of error to avoid crashing the connection
                if not await send_json_safe({
                    "status": "scanner_warning",
                    "message": error_msg
                }):
                    break
                
                if consecutive_errors >= 10:
                    await send_json_safe({
                        "status": "error",
                        "message": f"Fatal: Scanner disconnected or failed repeatedly: {error_msg}"
                    })
                    break
                
                # Wait longer on error to prevent CPU thrashing/busy looping
                await asyncio.sleep(0.5)
            
    except WebSocketDisconnect:
        print("[WS] Client disconnected from /ws/scanner")
    except Exception as e:
        print(f"[WS ERROR] Error in /ws/scanner: {e}")
        if websocket.client_state.name == "CONNECTED":
            try:
                await websocket.send_json({
                    "status": "error",
                    "message": str(e)
                })
            except Exception:
                pass
    finally:
        streaming = False
        read_task.cancel()
        
        # Abort the blocking capture call by terminating the SDK instance
        print("[WS] Forcing scanner abort to release blocking DLL call...")
        scanner_service.force_abort()
        
        print("[WS] Stream stopped and cleaned up")



