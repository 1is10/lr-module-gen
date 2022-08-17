import { flattenVFS, isVFSNode, VFSNode } from "../../vfs"
import path, { FormatInputPathObject, ParsedPath } from "path"

type VFSPatcherAction = (node: VFSNode) => VFSNode

export class VFSPatcher {
    private actions: VFSPatcherAction[] = []

    constructor(private vfsNode: VFSNode) {}

    private makeUnifiedCheck(check: RegExp | ((filename: string) => boolean) | string): (value: string) => boolean {
        let checkUnified: (filename: string) => boolean
        if (typeof check === "function") {
            return check
        }
        if (typeof check === "string") {
            return value => value === check
        }
        return (value) => check.test(value)
    }

    get undo(): VFSPatcher {
        this.actions.pop()
        return this
    }

    flat(): VFSPatcher {
        this.actions.push((node) => flattenVFS(node))
        return this
    }

    replaceDirectory(check: RegExp | ((filename: string) => boolean) | string,
                     newDirectory: string): VFSPatcher {
        const unifiedCheck = this.makeUnifiedCheck(check)
        this.actions.push((node) => {
            let nodeIterationList: { parent?: VFSNode, key?: string, node: VFSNode }[] = [{node}]
            let i = 0
            while (i < nodeIterationList.length) {
                let element = nodeIterationList[i]
                let updatedNode: VFSNode = {}

                // processing
                let keysToIterate = Object.keys(element.node)
                for (let key of keysToIterate) {
                    let pathComponents = key.split(path.sep)
                    let updatedKey: string = pathComponents
                        .map(pathElement => unifiedCheck(pathElement) ? newDirectory : pathElement)
                        .join(path.sep)

                    let value = element.node[key]
                    if (value === undefined) {
                        // skip
                    } else if (isVFSNode(value)) {
                        nodeIterationList.push({
                            node: value,
                            key: updatedKey,
                            parent: updatedNode
                        })
                    } else {
                        updatedNode[updatedKey] = value
                    }
                }
                // processing: end
                if (element.key && element.parent) {
                    element.parent[element.key] = updatedNode
                }
                element.node = updatedNode

                i++
            }
            return nodeIterationList[0].node
        })
        return this
    }

    moveFiles(check: RegExp | ((filename: string) => boolean) | string, newDirectory: string): VFSPatcher {
        const unifiedCheck = this.makeUnifiedCheck(check)
        const newDirectoryObj = path.parse(newDirectory)
        return this.modifyKey(pathObj => {
            if (!unifiedCheck(pathObj.base)) {
                return pathObj
            }

            pathObj.root = newDirectoryObj.root
            // join, cause last path component treated as base -_-
            pathObj.dir = path.join(newDirectoryObj.dir, newDirectoryObj.base)
            return pathObj
        })
    }

    renameFilesWithDictionary(renameDictionary: { [key: string]: string }): VFSPatcher {
        return this.modifyKey((pathObj) => {
            pathObj.base = renameDictionary[pathObj.base] ?? pathObj.base
            return pathObj
        })
    }

    renameFilesWithBlock(renameBlock: (path: ParsedPath) => FormatInputPathObject): VFSPatcher {
        return this.modifyKey(renameBlock)
    }

    private modifyKey(renameBlock: (path: ParsedPath) => FormatInputPathObject): VFSPatcher {
        this.actions.push((node) => {
            let nodeIterationList: { parent?: VFSNode, key?: string, node: VFSNode }[] = [{node}]
            let i = 0
            while (i < nodeIterationList.length) {
                let element = nodeIterationList[i]
                let updatedNode: VFSNode = {}

                // processing
                let keysToIterate = Object.keys(element.node)
                for (let key of keysToIterate) {
                    let updatedKey: string = path.format(
                        renameBlock(
                            path.parse(key)
                        )
                    )

                    let value = element.node[key]
                    if (value === undefined) {
                    } else if (isVFSNode(value)) {
                        nodeIterationList.push({
                            node: value,
                            key: updatedKey,
                            parent: updatedNode
                        })
                    } else {
                        updatedNode[updatedKey] = value
                    }
                }
                // processing: end

                if (element.key && element.parent) {
                    element.parent[element.key] = updatedNode
                }
                element.node = updatedNode
                i++
            }

            return nodeIterationList[0].node
        })
        return this
    }

    get make(): VFSNode {
        if (this.actions.length == 0) { return {...this.vfsNode} }
        let node = {...this.vfsNode}

        this.actions.forEach((action) => {
            node = action(node)
        })

        return node
    }
}