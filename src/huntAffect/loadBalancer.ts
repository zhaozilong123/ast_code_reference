import cluster from "cluster"
import os from "os"
import { Affected } from "../types"
import { mergeChanged } from "./utils"
// TODO：ts会检查node_modules配置无效
const mergeWith = require("lodash/mergeWith")
const isArray = require("lodash/isArray")

const cpuAmount = os.cpus().length

type MESSAGE = {
  sources: string[]
}

/**
 * 负载均衡
 * @param sources
 * @param handle
 */
export default async function useLoadBalancer(
  sources: string[],
  handle: (sliceSources: string[]) => Promise<Affected>,
  resolve: (affected: Affected) => void
) {
  if (cluster.isMaster) {
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

    for (var i = 0; i < cpuAmount; i += 1) {
      cluster.fork()
    }
    for (const id in cluster.workers) {
      cluster.workers[id]!.on("message", messageHandler)
      cluster.workers[id]!.send({
        sources: _sources.splice(0, sliceRange),
      })
    }
  } else {
    process.on("message", async (msg: MESSAGE) => {
      const result = await handle(msg.sources)
      process.send!(result)
      process.exit(0)
    })
  }
}
