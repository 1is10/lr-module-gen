import path from "path"
import fs from "fs"
import { VFSNode } from "../vfs"
import { defaultConfigName, DotConfigType } from "./main"

const fsPromises = fs.promises


export type ITemplateFileTypeEJS = {
    type: "ejs"
}

export type ITemplateFileTypeJS = {
    type: "js"
}

export type ITemplateFileTypeAny = ITemplateFileTypeEJS | ITemplateFileTypeJS

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
    },
    variables: {
        [key: string]: ITemplateVariableAny
    },
    /**
     * @param vfs - file system in json format, `out` should be placed here
     * @param variablesContext - variables passed on templates baking + computed/predefined
     */
    postProcessor?: (vfs: VFSNode, variablesContext: { [key: string]: any }) => VFSNode
}

export const loadTemplateConfig = (
    modulePath: string,
    configFile: string = "info"
): TemplateConfigType => {
    const configPath = path.join(modulePath, configFile)

    try {
        // try to parse config as node file
        return require(configPath)
    } catch (_) {
        // ignore, not js file
    }

    return JSON.parse(fs.readFileSync(configPath, {encoding: "utf8"})) as TemplateConfigType
}

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