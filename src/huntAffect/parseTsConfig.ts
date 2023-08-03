const fs = require("fs")
const path = require("path")
const root = process.cwd()

let tsconfig: any

const tsconfigPath = path.join(root, "tsconfig.json")
// 防止tsconfig里面有注释，所以用js来解析
const tsconfigStr = "tsconfig=" + fs.readFileSync(tsconfigPath, "utf-8")

eval(tsconfigStr)

const baseUrl = tsconfig.compilerOptions.baseUrl
const paths = tsconfig.compilerOptions.paths

const getTsconfigAlias = (): { [key: string]: string } => {
  const result = {} as any
  Object.keys(paths).forEach((key) => {
    const value = paths[key][0]
    const absolutePath = path.join(root, baseUrl, value).replace(/\*/g, "")
    const resultKey = key.replace(/\/\*/g, "")
    result[resultKey] = absolutePath
  })
  return result
}

export default getTsconfigAlias
