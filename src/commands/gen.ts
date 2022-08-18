import type { Arguments, CommandBuilder } from "yargs"
import { DotConfigType, loadConfig } from "../config/main"
import path from "path"
import ejs from "ejs"
import {
    ITemplateFileTypeAny, ITemplateVariableAny,
    loadTemplateConfig,
    setITemplateVariableDefaultValue,
    templateUtils, VariableContext
} from "../config/template"
import { materializeVFS, VFSNode } from "../vfs"
import { globPromise } from "../utils/globUtils"
import { isStringArray } from "../utils/typeCheckers"
import { isPromise } from "util/types"
import Prompt from "../utils/prompt"

type Options = {
    module: string,
    overwrite: boolean
}

export const command: string = "gen [module]"
export const desc: string = "generate module from [module] or pick from existing one"

export const builder: CommandBuilder<Options, Options> = (yargs) =>
    yargs
        .option("overwrite", {
            default: false,
            type: "boolean"
        })
        .positional("module", {type: "string", demandOption: false, default: "*"})


export const handler = async (argv: Arguments<Options>): Promise<void> => {
    let config: DotConfigType
    try {
        config = await loadConfig()

        // ignore that, because we are injecting utils, for simpler template management
        // @ts-ignore
        config.utils = templateUtils
    } catch (e) {
        console.error("Failed to load config")
        process.exit(-1)
    }

    let {module, overwrite} = argv
    if (module === "*") {
        let availableModules = Object.keys(config.templatesPaths)
        if (!availableModules.length) {
            console.error("Add modules to `.lr.module.gen > templatesPaths` property")
            process.exit(-1)
        }

        if (availableModules.length == 1) {
            module = availableModules[0]
        } else {
            module = await Prompt.askModule(availableModules)
        }
    }

    let templatePath = config.templatesPaths[module]
    if (!templatePath) {
        console.error("failed to find template", module)
        process.exit(-1)
    }

    let projectDirectory = process.cwd()
    let absoluteTemplatesPath = path.join(projectDirectory, templatePath)
    let info = loadTemplateConfig(absoluteTemplatesPath, "info")

    // Info Injections
    info.utils = templateUtils

    let variables = info.variables
    let predefinedVariableContext: { [key: string]: any } = {}

    // insert predefinedVariables
    if (config.predefinedVariables) {
        let predefinedVariables = config.predefinedVariables
        Object.keys(info.variables)
              .filter(variable => variable in predefinedVariables)
              .forEach(variable => {
                  let predefinedVariable = predefinedVariables[variable]
                  if ("editable" in predefinedVariable && predefinedVariable.editable) {
                      setITemplateVariableDefaultValue(variables[variable], predefinedVariable.value)
                  } else {
                      // save value & remove from variables to ask
                      predefinedVariableContext[variable] = predefinedVariable.value
                      delete variables[variable]
                  }
              })
    }

    // Variables fetch
    let allVariables = Object.keys(variables)
    let variableContext: VariableContext = {}
    while (allVariables.length > 0) {
        let currentVariables: {
            [key: string]: ITemplateVariableAny
        } = {}

        let allVariablesCount = allVariables.length
        allVariables = allVariables.filter(variableName => {
            let variable = variables[variableName]
            if (!variable.conditionalShow) {
                currentVariables[variableName] = variables[variableName]
                return false
            }

            if (variable.conditionalShow(variableContext)) {
                currentVariables[variableName] = variables[variableName]
                return false
            }

            return true
        })
        let usedVariablesCount = allVariablesCount - allVariables.length
        if (usedVariablesCount > 0) {
            variableContext = {
                ...variableContext,
                ...await Prompt.askVariables(
                    module,
                    currentVariables,
                    {
                        absoluteTemplatesPath,
                        projectDirectory,
                        config
                    }
                )
            }
        } else {
            // usedVariablesCount == 0, no variables used in current cycle
            // end cycle by emptying required variables
            //
            // non-used variables can be saved here
            allVariables = []
        }
    } // conditional variables support: end

    // append predefined variables, they always overwrite context from user input
    variableContext = {
        ...variableContext,
        ...predefinedVariableContext
    }
    // Variables fetch: end

    if (info.preProcessor) {
        const updatedContext = info.preProcessor(variableContext)
        variableContext = isPromise(updatedContext) ? await updatedContext : updatedContext
    }

    // [!] Deprecated, will be removed in next release
    if (info.asyncPreProcessor) {
        variableContext = await info.asyncPreProcessor(variableContext)
    }

    // Result files context
    let vfs: VFSNode = {}

    // Files fetch
    // * info.js: support for array of strings inside info.js:files
    let filesWithTypesMaybe: string[] | { [key: string]: ITemplateFileTypeAny } = info.files
    let filesWithTypes: { [key: string]: ITemplateFileTypeAny } = {}
    filesWithTypes = isStringArray(filesWithTypesMaybe)
        ? filesWithTypesMaybe.reduce((filesObj, file) => {
            filesObj[file] = {type: "ejs"}
            return filesObj
        }, filesWithTypes)
        : filesWithTypesMaybe

    // async fill vfs: start
    // * helper utils
    const renderEJSTemplate = async (vfs: VFSNode, templateFileName: string) => {
        const templatePath = path.join(absoluteTemplatesPath, templateFileName)
        vfs[templateFileName] = await ejs.renderFile(templatePath, variableContext, {
            async: false
        })
    }
    const renderJSTemplate = async (vfs: VFSNode, templateFileName: string) => {
        const templatePath = path.join(absoluteTemplatesPath, templateFileName)
        const renderResult: string | Promise<string> = require(templatePath)(module, variableContext)

        if (isPromise(renderResult)) {
            vfs[templateFileName] = await renderResult
            return
        }

        vfs[templateFileName] = renderResult
    }

    // * actual template generation
    await Promise.all(Object.keys(filesWithTypes).map(async (templateFileName) => {
        const templateInfo = filesWithTypes[templateFileName]
        switch (templateInfo.type) {
        case "glob":
            return await globPromise(absoluteTemplatesPath, templateFileName)
                .then(files => Promise.all(files.map(async file => {
                    switch (templateInfo.subtype ?? path.extname(file).substring(1).toLowerCase()) {
                    case "ejs":
                        return await renderEJSTemplate(vfs, file)
                    case "js":
                        return await renderJSTemplate(vfs, file)
                    default:
                        console.error("Unsupported type", templateInfo)
                        process.exit(-1)
                    }
                })))
        case "ejs":
            return await renderEJSTemplate(vfs, templateFileName)
        case "js":
            return await renderJSTemplate(vfs, templateFileName)
        default:
            console.error("Unsupported type", templateInfo)
            process.exit(-1)
        }
    }))
    // async fill vfs: end

    // post process
    if (info.postProcessor) {
        const result = info.postProcessor(vfs, variableContext)
        vfs = isPromise(result) ? await result : result
    }

    // [!] Deprecated, will be removed in next release
    if (info.asyncPostProcessor) {
        vfs = await info.asyncPostProcessor(vfs, variableContext)
    }

    // materialize
    await materializeVFS(vfs, overwrite)

    // actions
    if (info.postActions) {
        const result = info.postActions(vfs, variableContext)
        if (isPromise(result)) { await result }
    }

    // [!] Deprecated, will be removed in next release
    if (info.asyncPostActions) {
        await info.asyncPostActions(vfs, variableContext)
    }

    process.exit(0)
}
