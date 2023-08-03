import exec from "./exec"
import { GIT_OPERATION } from "./constants"
import { Diff } from "../types"
import getRevisionFile from "./getRevisionFile"

function justifyOperation(operatelog: string) {
  if (/^new file mode/.test(operatelog)) {
    return GIT_OPERATION.new
  }
  if (/^deleted file mode/.test(operatelog)) {
    return GIT_OPERATION.delete
  }
  if (/^similarity index/.test(operatelog)) {
    return GIT_OPERATION.rename
  }
  return GIT_OPERATION.change
}
function isLineRemoved(content: string) {
  return content.startsWith("-")
}
function isLineAdded(content: string) {
  return content.startsWith("+")
}

/**
 * 比较diff
 * @param to Git revision.
 * @param from Git revision.
 */
export function getGitDiffs(from: string, to: string): Diff[] {
  from = from || ""
  const strOut = exec(`git diff ${from} ${to}`)
  const diffs = [] as Diff[]
  let lineA = 0
  let lineB = 0
  let aChangeStart = null as number | null
  let bChangeStart = null as number | null
  const diffLines = strOut.split("\n")

  diffLines.forEach((content, index) => {
    const lastDiff = diffs[diffs.length - 1]

    const fileHeadMatch = content.match(/^diff --git a\/([^\n\s]+) b\/([^\n\s]+)/)
    const chunkHeadMatch = content.match(/@@ -(\d+)(,\d+)? \+(\d+)(,\d+)? @@( .+)?/)
    const isLastLine = index === diffLines.length - 1 || !!fileHeadMatch || !!chunkHeadMatch
    const isAdded = isLineAdded(content)
    const isRemoved = isLineRemoved(content)

    if (lastDiff) {
      const aChanges = lastDiff.source.changed
      const bChanges = lastDiff.target.changed
      if (lastDiff.operation !== GIT_OPERATION.rename) {
        if (isRemoved && !aChangeStart) {
          aChangeStart = lineA
        }
        if ((!isRemoved || isLastLine) && aChangeStart) {
          aChanges.push({
            start: aChangeStart,
            end: lineA - 1,
          })
          aChangeStart = null
        }
        if (!isAdded && lineA) {
          lineA++
        }
      }
      if (isAdded && !bChangeStart) {
        bChangeStart = lineB
      }
      if ((!isAdded || isLastLine) && bChangeStart) {
        bChanges.push({
          start: bChangeStart,
          end: lineB - 1,
        })
        bChangeStart = null
      }
      if (!isRemoved && lineB) {
        lineB++
      }
      if (isLastLine) {
        lineA = lineB = 0
        aChangeStart = bChangeStart = null
      }
    }

    if (fileHeadMatch) {
      const [sourceFile, targetFile] = fileHeadMatch.slice(1)
      const operation = justifyOperation(diffLines[index + 1])
      diffs.push({
        source: {
          file: sourceFile,
          content: operation === GIT_OPERATION.new ? null : getRevisionFile(`${from}`, sourceFile),
          changed:
            operation === GIT_OPERATION.rename
              ? [
                  {
                    start: 0,
                    end: Infinity,
                  },
                ]
              : [],
        },
        target: {
          file: targetFile,
          content: operation === GIT_OPERATION.delete ? null : getRevisionFile(to, targetFile),
          changed: [],
        },
        operation,
      })
      return
    }

    if (chunkHeadMatch) {
      lineA = parseInt(chunkHeadMatch[1], 10)
      lineB = parseInt(chunkHeadMatch[3], 10)
      return
    }
  })
  return diffs
}

export default getGitDiffs
