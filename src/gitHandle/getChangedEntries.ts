import { parse, ParserOptions } from "@babel/parser"
import { File } from "@babel/types"
import { extractStats } from "../astParse"
import getAbsolutePath from "./getAbsolutePath"
import { Entry, Change } from "../types"

/**
 * Find what declarations does the code line changes belong to.
 * @param changes
 * @param parserOptions `@babel/parser` options
 * @return A list of object contains module absolute path and declaration name
 */
export default function getChangedEntries(
  changes: Change[],
  parserOptions?: ParserOptions | null
): Entry[] {
  return changes.reduce((res, { file, content, changed }) => {
    if (!content) {
      return res
    }
    const filePath = getAbsolutePath(file)
    let ast
    try {
      ast = parse(content, {
        ...(parserOptions || {}),
        sourceType: "module",
      }) as File
    } catch (e) {
      console.warn(
        `@bable/parser parsing ${filePath} failed! (${
          (e as Error).message
        }) Parser options: ${JSON.stringify(parserOptions)}`
      )
      return res
    }
    const stats = extractStats(ast)
    const declareLoc = Object.keys(stats.declarations)
      .map((name) => ({
        loc: stats.declarations[name].loc,
        name,
        alias: name,
      }))
      .concat(stats.imports)
      .sort((a, b) => (a.loc?.start?.line || 0) - (b.loc?.start?.line || 0))
    let iDeclaration = 0
    const changedDeclarations = changed.reduce((ret, { start: startLine, end: endLine }) => {
      while (declareLoc[iDeclaration]) {
        const { loc, alias } = declareLoc[iDeclaration]
        if (!loc) continue
        const { start, end } = loc
        if (endLine < start.line) {
          return ret
        }
        if (startLine > end.line) {
        } else {
          ret.push(alias)
        }
        iDeclaration++
      }
      return ret
    }, [] as string[])
    return res.concat(
      Array.from(new Set(changedDeclarations)).map((name) => ({
        source: filePath,
        name,
      }))
    )
  }, [] as Entry[])
}
