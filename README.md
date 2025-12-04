# Helldivers 2 Helper

A web-based stratagem macro tool for Helldivers 2. Control your stratagems from your phone or second monitor!

## Features

- **Remote Control**: Run the server on your PC and access the interface from any device on your local network.
- **Stratagem Library**: Comprehensive list of stratagems with icons and codes.
- **Space Station Support**: View and execute active Space Station stratagems (DSS).
- **Customizable**: Configure keybinds, delays, and input modes (Hold Ctrl vs Sequence Only).
- **Immersive UI**: Themed interface to match the game's aesthetic.

## Setup

1.  **Install Dependencies**:
    ```bash
    pip install fastapi uvicorn pydirectinput
    ```

2.  **Run the Server**:
    ```bash
    python main.py
    ```
    Or with uvicorn directly:
    ```bash
    python -m uvicorn main:app --host 0.0.0.0 --port 8000
    ```

3.  **Connect**:
    - Open a browser on your PC or phone.
    - Navigate to `http://<YOUR_PC_IP>:8000`.

## Usage

- **Click** a stratagem to execute it.
- **Edit Loadout**: Click the "SELECT" or edit icon on a loadout slot to choose a stratagem.
- **Settings**: Scroll down to configure the "Open Menu Key" (default: Ctrl) and input delay.

## Disclaimer

This tool uses simulated key presses. Use at your own risk.
