# Slime Dungeon Survivor

A 2D browser roguelite built with Phaser 3 + TypeScript. You are a slimey blob with a sword,
fighting through escalating dungeon rounds. Enemies drop coins; spend them on upgrades in
the marketplace between rounds.

## Controls

- **Move**: WASD or arrow keys
- **Attack**: Space or left-click (slashes toward the mouse if clicked)

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Gameplay loop

1. Clear the room of enemies (chasers, shooters, tanks — more and tougher each round).
2. A door opens when the room is clear. Walk into it.
3. Buy upgrades in the marketplace with the coins enemies dropped.
4. Continue to the next, harder round. Survive as long as you can.
