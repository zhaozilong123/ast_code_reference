import fs from "fs"
import path from "path"
import enhancedResolve from "enhanced-resolve"
import ecmaStats from "../astParse"
import denodeify from "./denodeify"
import { Import, Entry } from "../types"
import { Options, Resolver } from "./types"
import completeExtensions from "./completeExtensions"
import resolveModule from "./resolveModule"
import { DependencyMap } from "../types"
import { mergeChanged } from "./utils"
import getTsconfigAlias from "./parseTsConfig"

function defaultLoader(filePath: string): Promise<string> {
  return Promise.resolve(fs.readFileSync(filePath, "utf8"))
}

function getRelativePath(src: string) {
  return src.replace(process.cwd(), "")
}

async function convertImports(
  resolver: Resolver,
  baseDir: string,
  imports: Import[]
): Promise<{
  [key: string]: Import
}> {
  const resolvedImports = await Promise.all(
    imports.map(async (importInfo) => {
      const { alias, source } = importInfo
      const resolvedSource = await resolveModule(resolver, source, baseDir)
      return [alias, { ...importInfo, source: resolvedSource }]
    })
  )
  return Object.fromEntries(resolvedImports)
}

/**
 * 依赖解析
 * @param sources 匹配规则内的所有源文件
 * @param opts
 */
export default async function mergeDepMap(
  sources: string[],
  opts: Options = {},
  entries: Entry[]
): Promise<DependencyMap> {
  const depMap = {} as DependencyMap
  const parserOptions = opts?.parserOptions
  const alias = getTsconfigAlias()
  const resolver =
    opts.resolver ||
    denodeify(
      enhancedResolve.create({
        ...(opts.resolverOptions || {}),
        extensions:
          opts.resolverOptions?.extensions || completeExtensions(opts.parserOptions?.plugins),
        // TODO：区分webpack项目、ts项目
        alias,
        plugins: [],
      })
    )
  const loader = opts.loader || defaultLoader

  const fileHandlers = sources.map(async (src, index) => {
    const fileContent = await loader(src)
    const shouldBeParse = entries.find(
      (entry) => fileContent && fileContent.indexOf(entry.name) > -1
    )
    if (!shouldBeParse) return
    let fileStats
    try {
      if (fileContent) {
        fileStats = ecmaStats(fileContent, parserOptions, src)
      }
    } catch (e) {
      console.warn(
        `get es stats from ${src} failed! Parser options: ${JSON.stringify(parserOptions)}`
      )
      console.warn(e)
    }
    if (!fileStats) return

    const baseDir = path.dirname(src)
    const imports = await convertImports(resolver, baseDir, fileStats.imports)

    entries.forEach((entry) => {
      const changeFile = entry.source
      const changedName = entry.name

      Object.keys(imports).forEach((importName) => {
        const importSource = imports[importName].source

        if (importName === changedName && changeFile === importSource) {
          // 过滤掉非必要绝对路径（服务端运行会暴露服务路径）
          const relativeChagneFilePath = getRelativePath(changeFile)
          if (depMap[relativeChagneFilePath]) {
            depMap[relativeChagneFilePath].push({
              changed: changedName,
              affected: [getRelativePath(src)],
            })
          } else {
            depMap[relativeChagneFilePath] = [
              {
                changed: changedName,
                affected: [getRelativePath(src)],
              },
            ]
          }
        }
      })
    })
  })
  await Promise.all(fileHandlers)
  return mergeChanged(depMap)
}
