import path from "path"
import { VFSNode } from "../vfs"
import * as childProcess from "child_process"
import { PatchBuilder, PatchBuilderOptions } from "../utils/builders/PatchBuilder"
import { VFSPatcher } from "../utils/builders/VFSPatcher"

// # info.js:files types
export type ITemplateFileTypeEJS = {
    type: "ejs"
}

export type ITemplateFileTypeJS = {
    type: "js"
}

// ## MultiPick helper
export type ITemplateFileTypeGlob = {
    type: "glob"
    subtype?: string
}

export type ITemplateFileTypeAny = ITemplateFileTypeGlob | ITemplateFileTypeEJS | ITemplateFileTypeJS

// # Variable types
export type VariableContext = { [key: string]: any }

export type ITemplateVariableBase = {
    title?: string,
    description?: string,
    conditionalShow?: (context: VariableContext) => boolean
}

export type ITemplateVariableTypeString = ITemplateVariableBase & {
    default?: string
    type: "string"
}

export type ITemplateVariableTypeBoolean = ITemplateVariableBase & {
    default?: boolean
    type: "boolean"
}

export type ITemplateVariableTypePicker = ITemplateVariableBase & {
    default?: string
    variants: string[]
    type: "picker"
}

export type ITemplateVariableTypeFilePicker = ITemplateVariableBase & {
    default?: string
    variants: (string|{type: "glob" | "path", value: string})[]
    type: "filePicker"
}

export type ITemplateVariableAny =
    ITemplateVariableTypeString |
    ITemplateVariableTypeBoolean |
    ITemplateVariableTypePicker |
    ITemplateVariableTypeFilePicker

// # Variable methods
export const setITemplateVariableDefaultValue = (variable: ITemplateVariableAny, value: any) => {
    if (variable.type == "string") {
        variable.default = value
    } else if (variable.type == "boolean") {
        variable.default = value
    } else if (variable.type == "picker") {
        variable.default = value
    } else if (variable.type == "filePicker") {
        variable.default = value
    } else {
        throw new Error("Attempt to set unknown variable")
    }
}

export type TemplateConfigType = {
    files: {
        [key: string]: ITemplateFileTypeAny
    } | Array<string>,
    variables: {
        [key: string]: ITemplateVariableAny
    },
    /**
     * Preprocessor for variablesContext, called before ejs template generation.
     * @param vfs - file system in json format, `out` should be placed here
     * @param variablesContext - variables passed on templates baking + computed/predefined
     * @returns VFSNode | Promise<VFSNode> - Promise here only for async method calls support
     */
    preProcessor?: (variablesContext: VariableContext) => (VariableContext | Promise<VariableContext>)
    /**
     * postprocessor for vfs, called after ejs template was populated with context input by user.
     * @param vfs - file system in json format, `out` should be placed here
     * @param variablesContext - variables passed on templates baking + computed/predefined
     * @returns VFSNode | Promise<VFSNode> - VFSNode that should be written on disk
     */
    postProcessor?: (vfs: VFSNode, variablesContext: VariableContext) => VFSNode | Promise<VFSNode>
    /**
     * Post actions, used when all files exist, receive result vfs & context as
     * @param vfs - file system in json format, `out` should be placed here
     * @param variablesContext - variables passed on templates baking + computed/predefined
     * @returns any | Promise<any> - result is unused
     */
    postActions?: (vfs: VFSNode, variablesContext: VariableContext) => any | Promise<any>

    // [!] reserved fields, don't use them
    // - injections
    utils: typeof templateUtils

    // [!] Deprecated, will be removed in next release
    asyncPreProcessor?: (variablesContext: VariableContext) => Promise<VariableContext>
    asyncPostProcessor?: (vfs: VFSNode, variablesContext: VariableContext) => Promise<VFSNode>
    asyncPostActions?: (vfs: VFSNode, variablesContext: VariableContext) => Promise<any>
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
        console.error("Failed to read template info.js", err)
        throw err
    }
}

export const templateUtils = {
    vfsModify: (vfs: VFSNode): VFSPatcher => new VFSPatcher(vfs),
    patch: (file: string, options: PatchBuilderOptions = {}): PatchBuilder => {
        return new PatchBuilder(file, options)
    },
    // utils
    exec: async (command: string) => new Promise<string>((resolve, reject) => {
        childProcess.exec(command, (error, _, stderr) => {
            if (error) {
                return reject(error)
            }

            resolve(stderr)
        })
    }),
    // Sync methods, don't use them -_-
    sync: {
        exec: (command: string) => childProcess.execSync(command)
    }
}

// Demo purpose variables (Demo repo will be better, but...)
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
            type: "string",
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