import type { Arguments, CommandBuilder } from "yargs"
import { DotConfigType, loadConfig } from "../config/main"
import path from "path"
import { askModule, askVariables } from "../prompts"
import ejs from "ejs"
import {
    ITemplateFileTypeAny,
    loadTemplateConfig,
    setITemplateVariableDefaultValue,
    templateUtils
} from "../config/template"
import { materializeVFS, VFSNode } from "../vfs"
import { globPromise } from "../utils/globUtils"

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
        module = await askModule(availableModules)
    }

    let templatePath = config.templatesPaths[module]
    if (!templatePath) {
        console.error("failed to find template", module)
        process.exit(-1)
    }

    let absoluteTemplatesPath = path.join(process.cwd(), templatePath)
    let info = loadTemplateConfig(absoluteTemplatesPath, "info")

    // ignore that, because we are injecting utils, for simpler template management
    // @ts-ignore
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

    let variableContext = {
        ...await askVariables(module, variables, config),
        ...predefinedVariableContext
    }
    // use context to generate module
    let vfs: VFSNode = {}

    // info.js: support for array of strings inside files
    const isStringArray = (type: string[] | any): type is string[] => Array.isArray(type)
    let filesWithTypesMaybe: string[] | { [key: string]: ITemplateFileTypeAny } = info.files
    let filesWithTypes: { [key: string]: ITemplateFileTypeAny } = {}
    filesWithTypes = isStringArray(filesWithTypesMaybe)
        ? filesWithTypesMaybe.reduce((filesObj, file) => {
            filesObj[file] = {type: "ejs"}
            return filesObj
        }, filesWithTypes)
        : filesWithTypesMaybe

    // async fill vfs: start
    const renderEJSTemplate = async (vfs: VFSNode, templateFileName: string) => {
        const templatePath = path.join(absoluteTemplatesPath, templateFileName)
        vfs[templateFileName] = await ejs.renderFile(templatePath, variableContext, {
            async: false
        })
    }
    const renderJSTemplate = async (vfs: VFSNode, templateFileName: string) => {
        const templatePath = path.join(absoluteTemplatesPath, templateFileName)
        const renderResult: string | Promise<string> = require(templatePath)(module, variableContext)

        if (typeof renderResult === "string") {
            vfs[templateFileName] = renderResult
            return
        }

        vfs[templateFileName] = await renderResult
    }
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
        vfs = info.postProcessor(vfs, variableContext)
    }
    // async
    if (info.asyncPostProcessor) {
        vfs = await info.asyncPostProcessor(vfs, variableContext)
    }

    // materialize
    await materializeVFS(vfs, overwrite)

    // actions
    if (info.postActions) {
        info.postActions(vfs, variableContext)
    }

    // async mod
    if (info.asyncPostActions) {
        await info.asyncPostActions(vfs, variableContext)
    }


    process.exit(0)
}
