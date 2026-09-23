import type { MissionScript } from './mission.types'
import { standardMissionScript } from './scripts/standardMission'

const scripts = new Map<string, MissionScript>([
  [standardMissionScript.key, standardMissionScript],
])

export function getMissionScript(key: string): MissionScript {
  return scripts.get(key) ?? standardMissionScript
}

export function listMissionScripts(): MissionScript[] {
  return Array.from(scripts.values())
}
