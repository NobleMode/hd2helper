import pydirectinput
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mapping from our internal key names to pydirectinput keys
KEY_MAP = {
    "up": "up",
    "down": "down",
    "left": "left",
    "right": "right"
}

def execute_stratagem(keys: list[str], open_key: str = "ctrl", mode: str = "hold", delay: float = 0.05, open_delay: float = 0.1, key_duration: float = 0.02, key_map: dict = None):
    """
    Executes the sequence of keys for a stratagem.
    Modes:
    - hold: Hold open_key -> Sequence -> Release open_key
    - toggle: Press open_key -> Sequence (Menu closes automatically)
    - pre_call: Sequence only (User opens menu manually)
    """
    # Use provided key_map or default to global KEY_MAP
    current_key_map = key_map if key_map else KEY_MAP
    
    logger.info(f"Executing stratagem sequence: {keys} (Mode: {mode}, Open: {open_key}, Delay: {delay}, OpenDelay: {open_delay}, KeyDuration: {key_duration})")
    
    # Safety: Fail safe if mouse in corner? pydirectinput has this by default.
    pydirectinput.PAUSE = 0.01 # Short pause between pydirectinput calls
    
    try:
        # Handle Menu Opening
        if mode == "hold":
            pydirectinput.keyDown(open_key)
            time.sleep(open_delay)
        elif mode == "toggle":
            pydirectinput.press(open_key)
            time.sleep(open_delay)
        elif mode == "pre_call":
            pass # Do nothing, user handles menu
        
        # Execute Sequence
        for k in keys:
            # Map the key using the current map (default or custom)
            # If k is not in map, try to use it directly (e.g. if it's already a valid key name)
            target_key = current_key_map.get(k, k)
            
            if target_key:
                # Hold the key for key_duration to ensure registration
                pydirectinput.keyDown(target_key)
                time.sleep(key_duration)
                pydirectinput.keyUp(target_key)
                
                # Wait before next key
                time.sleep(delay)
            else:
                logger.warning(f"Unknown key: {k}")
        
        # Handle Menu Closing (Only for 'hold' mode)
        if mode == "hold":
            pydirectinput.keyUp(open_key)
        
    except Exception as e:
        logger.error(f"Error executing stratagem: {e}")
        # Ensure key is released even on error if we were holding it
        if mode == "hold":
            pydirectinput.keyUp(open_key)

def execute_sequence_only(keys: list[str], delay: float = 0.05):
    """
    Executes only the arrow keys, assuming the user is holding the menu key
    OR the user wants to test in Notepad.
    """
    logger.info(f"Executing sequence only: {keys} (Delay: {delay})")
    for k in keys:
        if k in KEY_MAP:
            pydirectinput.press(KEY_MAP[k])
            time.sleep(delay)
