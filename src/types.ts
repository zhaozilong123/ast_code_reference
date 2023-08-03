import { GIT_OPERATION } from "./gitHandle/constants"

import { SourceLocation } from "@babel/types"

export type Module = string
export type Member = string
export type Members = Member[] | "*"
export type MemberRef = {
  name: Member
  alias: Member
}

type HasLoc = {
  loc: SourceLocation | null
}
export type ImportBase = MemberRef & {
  source: Module
}
export type Import = ImportBase & HasLoc
export type Exports = {
  extends?: Module[]
  members: Array<MemberRef & HasLoc>
}
export type Declarations = {
  [name: string]: HasLoc & {
    dependencies: (Member | ImportBase)[]
  }
}
export type MemberRelation = {
  [name: string]: (Member | ImportBase)[]
}

export type Entry = {
  source: Module
  name: Member
}

export { ParserOptions } from "@babel/parser"

export type Diff = {
  source: Change
  target: Change
  operation: GIT_OPERATION
}

export type Change = {
  /** File path relative to the repo */
  file: string
  content: string | null
  /** Changed file code line ranges */
  changed: Array<{
    start: number
    end: number
  }>
}

export type Affected = {
  [module: string]: {
    changed: string
    affected: string[]
  }[]
}
export type DependencyMap = Affected
