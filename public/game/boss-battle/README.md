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


## Integrated gameplay

The pack is wired into the Mission Boss stage on this branch:

- correct resolved answer -> player slash + boss HP damage
- wrong attempt -> Rune Beetle counterattack + player HP damage
- one boss hit remaining -> finisher gauge becomes ready
- final correct hit -> skill-charge + finisher animation + victory SFX
- combat animation temporarily locks answer/continue controls
- battle state is derived from persisted Mission answers, so reload/resume keeps HP consistent

The combat layer does not change vocabulary grading, retry rules, scoring, progress persistence, or SRS.
