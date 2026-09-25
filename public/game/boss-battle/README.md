# Boss Battle Asset Pack

Original prototype asset/audio pack for MemoryLang's final Mission battle.

- Original boss: **Rune Beetle** (not a copy of the reference character).
- Boss states: idle, hit, attack, finisher-hit, defeated.
- Forest arena, slash/impact/finisher/spark effects, battle UI icons.
- Combat SFX and an 8-second boss loop are referenced by `manifest.json`.

Suggested mapping:
- correct -> player attack + boss hit
- wrong -> boss attack + player hit
- skill ready -> charge
- finisher -> finisher burst + finisher-hit
- victory -> defeated state

Created specifically for MemoryLang; no third-party visual/audio samples are embedded.
