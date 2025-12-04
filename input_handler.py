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

def execute_stratagem(keys: list[str], open_key: str = "ctrl", delay: float = 0.05):
    """
    Executes the sequence of keys for a stratagem.
    """
    logger.info(f"Executing stratagem sequence: {keys} (Open: {open_key}, Delay: {delay})")
    
    # Safety: Fail safe if mouse in corner? pydirectinput has this by default.
    pydirectinput.PAUSE = 0.02 # Short pause between pydirectinput calls
    
    try:
        # Press and hold the stratagem menu key
        pydirectinput.keyDown(open_key)
        time.sleep(delay)
        
        for k in keys:
            if k in KEY_MAP:
                pydirectinput.press(KEY_MAP[k])
                time.sleep(delay)
            else:
                logger.warning(f"Unknown key: {k}")
        
        # Release the stratagem menu key
        pydirectinput.keyUp(open_key)
        
    except Exception as e:
        logger.error(f"Error executing stratagem: {e}")
        # Ensure key is released even on error
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
