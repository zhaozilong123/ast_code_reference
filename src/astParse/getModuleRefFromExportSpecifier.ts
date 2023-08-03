import { ExportDefaultSpecifier, ExportNamespaceSpecifier, ExportSpecifier } from "@babel/types"
import { MemberRef } from "../types"

export default function (
  specifier: ExportSpecifier | ExportDefaultSpecifier | ExportNamespaceSpecifier
): MemberRef | null {
  if (specifier.type === "ExportSpecifier") {
    //   @ts-ignore
    const alias = specifier.exported.name
    return {
      name: specifier.local.name,
      alias,
    }
  }
  return null
}
