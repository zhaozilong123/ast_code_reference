// @ts-nocheck
import {
  VariableDeclarator,
  VariableDeclaration,
  LVal,
  ExportSpecifier,
  StringLiteral,
} from "@babel/types"
import { Visitor } from "@babel/traverse"
import getPatternNames from "../getPatternNames"
import getDeclarationNames from "../getDeclarationNames"
import getModuleReffromExportSpecifier from "../getModuleRefFromExportSpecifier"
import { Declarations, MemberRef, ImportBase } from "../../types"

import { MODULE_DEFAULT } from "../constants"

type Scope = {
  privates: Set<string>
  candidates: (string | ImportBase)[]
}

/**
 * Create a Babel visitor that will find out the dependency relationships between root declarations, and save to an object ref.
 * @param relations The object ref to save the relationships
 */
export default function createRootRelationVisitors(relations: Declarations = {}): Visitor {
  let scope = { privates: new Set(), candidates: [] } as Scope
  const parentScopes = [] as Scope[]
  const addRefsToPrivates = (refs: Array<MemberRef>) => {
    refs.forEach(({ alias }) => scope.privates.add(alias))
  }
  const newScope = () => {
    parentScopes.push(scope)
    scope = { privates: new Set(), candidates: [] } as Scope
  }
  const exitScopeHandler = () => {
    if (parentScopes.length <= 1) return
    const { candidates, privates } = scope
    const filteredCandidates = candidates.filter((d) => typeof d !== "string" || !privates.has(d))
    scope = parentScopes.pop() as Scope
    scope.candidates = Array.from(new Set(scope.candidates.concat(filteredCandidates)))
    return filteredCandidates
  }

  return {
    FunctionDeclaration({ node }) {
      if (node.id) {
        scope.privates.add(node.id.name)
      }
    },

    ClassDeclaration({ node }) {
      if (node.id) {
        scope.privates.add(node.id.name)
      }
    },
    VariableDeclaration: {
      enter({ node }) {
        const refs = getDeclarationNames(node as VariableDeclaration)
        if (refs) {
          addRefsToPrivates(refs)
        }
        newScope()
      },
      exit({ node }) {
        const candidates = exitScopeHandler()
        if (parentScopes.length === 1) {
          const refs = getDeclarationNames(node as VariableDeclaration)
          if (refs) {
            refs.forEach(({ alias }) => {
              relations[alias] = {
                dependencies: Array.from(new Set(candidates)),
                loc: node.loc,
              }
            })
          }
        }
      },
    },
    ExportNamedDeclaration({ node }) {
      if (node.source) {
        node.specifiers.forEach((specifier) => {
          const ref = getModuleReffromExportSpecifier(specifier as ExportSpecifier)
          if (ref && !relations[ref.name]) {
            relations[ref.alias] = {
              dependencies: [],
              loc: node.loc,
            }
          }
        })
      }
    },
    ExportDefaultDeclaration: {
      enter() {
        scope.privates.add(MODULE_DEFAULT)
        newScope()
      },
      exit({ node }) {
        const candidates = exitScopeHandler()
        if (parentScopes.length === 1) {
          relations[MODULE_DEFAULT] = {
            dependencies: Array.from(new Set(candidates)),
            loc: node.loc,
          }
        }
      },
    },
    Scopable: {
      enter(p) {
        newScope()

        if (p.isFunction()) {
          const refs = p.node.params.reduce((ret, param) => {
            return ret.concat(getPatternNames(param as LVal))
          }, [] as Array<MemberRef>)
          addRefsToPrivates(refs)
        } else if (p.isCatchClause()) {
          addRefsToPrivates(getPatternNames(p.node.param as LVal))
        }
      },
      exit(p) {
        const { node, parent } = p

        const candidates = exitScopeHandler()
        if (parentScopes.length === 1) {
          const dedupCandidates = Array.from(new Set(candidates))
          const id = node.id || (parent && parent.id)
          if (id) {
            /** @todo find more specific declaration affected */
            getPatternNames(id).forEach(({ alias }) => {
              relations[alias] = {
                dependencies: dedupCandidates,
                loc: node.loc,
              }
            })
          }
        }
      },
    },
    VariableDeclarator({ node }) {
      addRefsToPrivates(getPatternNames((node as VariableDeclarator).id))
    },
    CallExpression({ node }) {
      const { callee, arguments: args } = node
      /** @todo handle eval */
      // if (callee.name === 'eval') {
      //   args[0].value
      // }

      // dynamic import
      if (callee.type === "Import" && args[0].type === "StringLiteral") {
        /** @todo analyze details of what's dynamically imported */
        scope.candidates.push({
          source: (args[0] as StringLiteral).value,
          name: MODULE_DEFAULT,
          alias: "",
        })
      }
    },
    Identifier(p) {
      const { node, key } = p
      const parentPath = p.parentPath
      // exclude function/class identifier
      if (parentPath.isClass() || parentPath.isFunction()) {
        return
      }
      if (
        // exclude property
        !p.isProperty() &&
        key !== "property" &&
        !(parentPath.isProperty() && key === "key")
      ) {
        scope.candidates.push(node.name)
      }
    },

    /* JSX */
    /** @todo make it a plugin */
    JSXOpeningElement({ node }) {
      let identifier = node.name
      while (identifier.type === "JSXMemberExpression") {
        identifier = identifier.object
      }
      if (identifier.type === "JSXIdentifier") {
        scope.candidates.push(identifier.name)
      }
    },
  }
}
