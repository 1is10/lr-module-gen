import path from "path"
import fs from "fs"
import { flattenVFS, VFSNode } from "../vfs"
import * as childProcess from "child_process"

const fsPromises = fs.promises


export type ITemplateFileTypeEJS = {
    type: "ejs"
}

export type ITemplateFileTypeJS = {
    type: "js"
}

// MultiPick helper
export type ITemplateFileTypeGlob = {
    type: "glob"
    subtype?: string
}

export type ITemplateFileTypeAny = ITemplateFileTypeGlob | ITemplateFileTypeEJS | ITemplateFileTypeJS

export type ITemplateVariableBase = {
    title?: string,
    description?: string
}

export type ITemplateVariableTypeString = ITemplateVariableBase & {
    default?: string
    type: "string"
}

export type ITemplateVariableTypeBoolean = ITemplateVariableBase & {
    default?: boolean
    type: "boolean"
}

export type ITemplateVariableTypeOutputPath = ITemplateVariableBase & {
    default?: string
    type: "outputPath"
}

export const setITemplateVariableDefaultValue = (variable: ITemplateVariableAny, value: any) => {
    if (variable.type == "string") {
        variable.default = value
    } else if (variable.type == "boolean") {
        variable.default = value
    } else if (variable.type == "outputPath") {
        variable.default = value
    } else {
        throw new Error("Attempt to set unknown variable")
    }
}

export type ITemplateVariableAny =
    ITemplateVariableTypeString |
    ITemplateVariableTypeBoolean |
    ITemplateVariableTypeOutputPath

export type TemplateConfigType = {
    files: {
        [key: string]: ITemplateFileTypeAny
    } | Array<string>,
    variables: {
        [key: string]: ITemplateVariableAny
    },
    /**
     * post processor for vfs, called after ejs template was populated with context input by user.
     * @param vfs - file system in json format, `out` should be placed here
     * @param variablesContext - variables passed on templates baking + computed/predefined
     */
    postProcessor?: (vfs: VFSNode, variablesContext: { [key: string]: any }) => VFSNode
    /**
     * Same as post processor, but async, feel free to use Promise.all/race and await/async
     * @param vfs - file system in json format, `out` should be placed here
     * @param variablesContext - variables passed on templates baking + computed/predefined
     */
    asyncPostProcessor?: (vfs: VFSNode, variablesContext: { [key: string]: any }) => Promise<VFSNode>
    /**
     * Post actions, used when all files exist, receive result vfs & context as
     * @param vfs - file system in json format, `out` should be placed here
     * @param variablesContext - variables passed on templates baking + computed/predefined
     */
    postActions?: (vfs: VFSNode, variablesContext: { [key: string]: any }) => void
    /**
     * Same as post actions, but async (same modifier as asyncPostProcessor)
     * @param vfs - file system in json format, `out` should be placed here
     * @param variablesContext - variables passed on templates baking + computed/predefined
     */
    asyncPostActions: (vfs: VFSNode, variablesContext: { [key: string]: any }) => Promise<void>
}

export const loadTemplateConfig = (
    modulePath: string,
    configFile: string = "info"
): TemplateConfigType => {
    const configPath = path.join(modulePath, configFile)

    try {
        // try to parse config as node file
        return require(configPath)
    } catch (err) {
        console.error("??", err)
        // ignore, not js file
    }

    return JSON.parse(fs.readFileSync(configPath, {encoding: "utf8"})) as TemplateConfigType
}

export const templateUtils = {
    // reserved for future usage
    vfsModify: {},
    execSync: (command: string) => childProcess.execSync(command),
    exec: (command: string) => new Promise<string>((resolve, reject) => {
        childProcess.exec(command, (error, _, stderr) => {
            if (error) {
                return reject(error)
            }

            resolve(stderr)
        })
    })
}

// Demo purpose variables
export const defaultTemplateVFS: VFSNode = {
    templates: {
        module: {
            check: {
                "check.txt": `template from lr-module-gen,
this file just to check vfs generation
`
            },
            "info.js": `// *this is only sample of template*
// *there is no sense in these files*

// json can be used, if so, remove module.exports and use appropriate syntax    
module.exports = {
    files: {
        "presenter.js": { "type": "ejs" },
        "view.js": { "type": "ejs" },
    },
    variables: {
        copyright: {
            title: "Copyright",
            description: "Placed on top of file",
            type: "string"
        },
        moduleName: {
            title: "ModuleName",
            description: "Name of the module",
            type: "string",
        },
        viewModel: {
            description: "include view model or not",
            type: "boolean",
            default: true
        },
        sources: {
            description: "Here main files will be copied",
            type: "outputPath",
        },
    },
    postProcessor: (vfs, variables) => {
        let childVfs = {}
        let resultVfs = {}
        resultVfs[variables.sources] = {}
        resultVfs[variables.sources][variables.moduleName] = childVfs
        
        for (key of Object.keys(vfs)) {
            childVfs[key.replace("ejs", "swift")] = vfs[key]
        }
        
        return resultVfs
    },
    asyncPostProcessor: async (vfs, variables) => {
        let asyncTask = new Promise((resolve, _) => {
            setTimeout(() => resolve(), 3000)
        })
        
        console.log("Performing async task (*Promise.all can be used for multiple async tasks merging)")
        await asyncTask
        console.log("Async task performed")
        
        return vfs
    }
}
`,
            "presenter.js": `// Generated @ ${new Date()}
// <%= moduleName %>Presenter.js
// <%- copyright %>
// *this is only sample of template*
// *there is no sense in these files*

<% if(viewModel) {%>
export const <%=moduleName%>ViewModelType = {

}
<% } %>
    
export class <%=moduleName%>Presenter {
    view: <%=moduleName%>View
    <% if(viewModel) {%>
    viewModel: <%=moduleName%>ViewModelType
    <% } %>

    constructor() {
        <% if(viewModel) {%>
        // any viewModel logic here
        <% } %>
    }
}
`,
            "view.js": `// Generated @ ${new Date()}
// <%= moduleName %>View.js
// <%- copyright %>
// *this is only sample of template*
// *there is no sense in these files*

class <%=moduleName%>View {
    var presenter: <%=moduleName%>Presenter

    init() {
        <% if(viewModel) {%>
        // any viewModel logic
        <% } %>
    }
}
`
        }
    }
}