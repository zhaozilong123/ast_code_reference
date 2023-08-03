import { parse, ParserOptions } from "@babel/parser"
import { File } from "@babel/types"
import extractStats from "./extractStats"

const pluginsPreset = [
  "dynamicImport",
  "classProperties",
  "flowComments",
  "objectRestSpread",
  "functionBind",
] as NonNullable<ParserOptions["plugins"]>

/**
 * Get ES file imports, exports, and root declaration definitions.
 * Example:
 * ```
 * fileStats(
 *  fs.readFileSync('esfile.js', 'utf-8'),
 *  {
 *    plugins: ['jsx']
 *  }
 * );
 * ```
 *
 * @param file File content
 * @param parserOptions Options supported by @babel/parser@^7.7.5
 */
export default function fileStats(
  file: string,
  parserOptions: ParserOptions | undefined,
  path: string
): ReturnType<typeof extractStats> {
  let plugins = parserOptions?.plugins || []
  if (/\.jsx?$/.test(path)) {
    plugins = plugins.concat(["flow", "jsx", ...pluginsPreset])
  } else if (/\.tsx$/.test(path)) {
    plugins = plugins.concat(["typescript", "jsx", ...pluginsPreset])
  } else if (/\.ts$/.test(path)) {
    plugins = plugins.concat(["typescript", ...pluginsPreset]).reduce((pre, cur) => {
      if (cur !== "jsx") {
        pre.push(cur)
      }
      return pre
    }, [] as NonNullable<ParserOptions["plugins"]>)
  }
  const ast = parse(file, {
    ...(parserOptions || {}),
    sourceType: "module",
    plugins: Array.from(new Set(plugins)),
  })
  return extractStats(ast as File)
}
