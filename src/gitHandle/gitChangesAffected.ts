import cluster from "cluster"
import os from "os"
import { getGitDiffs } from "./getGitDiffs"
import { GIT_OPERATION } from "./constants"
import { Change, Entry } from "../types"
import hasExt from "./hasExt"
import huntRevisionImpact, { Options as HuntRevisionImpactOptions } from "./huntRevisionImpact"
import { DEFAULT_EXTENSIONS } from "./constants"
import mergeDepMap from "../huntAffect/mergeDepMap"
import { Options as MessageOptions } from "../huntAffect/types"
import "../pollify"

const cpuAmount = os.cpus().length

export type Options = HuntRevisionImpactOptions & {
  /** 最后版本，默认为 HEAD，可以是commit hash、brnach*/
  to?: string
  /** 源分支可以是commit hash、brnach*/
  from?: string
}

interface MESSAGE {
  sources: string[]
  entries: Entry[]
  opts: MessageOptions
}

export default async function gitChangesAffected(opts: Options = {}) {
  return new Promise((resolve) => {
    if (cluster.isMaster) {
      for (var i = 0; i < cpuAmount; i += 1) {
        cluster.fork()
      }
      console.time("处理文件耗时")
      const extensions = opts.extensions || DEFAULT_EXTENSIONS
      // 语义理解和实际表现有差异
      const to = opts.from || ""
      const from = opts.to || ""
      const diffs = getGitDiffs(from, to)
      const changes = [] as Change[]
      diffs.forEach(({ source, target, operation }) => {
        if (
          operation !== GIT_OPERATION.new &&
          operation !== GIT_OPERATION.delete &&
          hasExt(source.file, extensions)
        ) {
          changes.push(target)
        }
      })
      huntRevisionImpact(to, changes, opts).then((res) => {
        resolve(res)
        console.timeEnd("处理文件耗时")
        cluster.disconnect()
      })
    } else {
      process.on("message", async (msg: MESSAGE) => {
        const { sources, entries, opts } = msg
        const result = await mergeDepMap(sources, opts, entries)
        process.send!(result)
      })
    }
  })
}
