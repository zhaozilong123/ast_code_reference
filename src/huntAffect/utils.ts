import { DependencyMap } from "../types"

export function mergeChanged(depMap: DependencyMap) {
  Object.keys(depMap).forEach((entryPath: string) => {
    const oriAffectedArr = [...depMap[entryPath]]
    const chagnedMap: {
      [key: string]: {
        changed: string
        affected: string[]
      }
    } = {}
    oriAffectedArr.forEach((item) => {
      if (chagnedMap[item.changed]) {
        chagnedMap[item.changed].affected = chagnedMap[item.changed].affected.concat(item.affected)
      } else {
        chagnedMap[item.changed] = { ...item }
      }
    })

    depMap[entryPath] = Object.values(chagnedMap)
  })
  return depMap
}
