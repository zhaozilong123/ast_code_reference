import os from "os"
import cluster from "cluster"
import { Entry, Affected } from "../types"
import { Options } from "./types"
import { mergeChanged } from "./utils"

const mergeWith = require("lodash/mergeWith")
const isArray = require("lodash/isArray")
const cpuAmount = os.cpus().length

/**
 * 查找分析结果
 * @param sources 源文件
 * @param entries 文件改动变更数组
 * @param opts Options
 * @return 分析结果
 */
export default async function huntAffected(
  sources: string[],
  entries: Entry[],
  opts: Options = {}
): Promise<Affected> {
  return new Promise((resolve) => {
    const result: Affected = {}
    const _sources = [...sources]
    const sliceRange = Math.ceil(sources.length / cpuAmount)
    let handledWorkAmount = 0
    function messageHandler(affected: Affected) {
      handledWorkAmount += 1
      mergeWith(result, affected, (objValue: any, srcValue: any) => {
        if (isArray(objValue)) {
          return objValue.concat(srcValue)
        }
      })
      // 表示所有cpu都处理完毕
      if (handledWorkAmount === cpuAmount) {
        resolve(mergeChanged(result))
      }
    }

    for (const id in cluster.workers) {
      cluster.workers[id]!.on("message", messageHandler)
      cluster.workers[id]!.send({
        sources: _sources.splice(0, sliceRange),
        opts,
        entries,
      })
    }
  })
}
