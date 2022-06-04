import type { Arguments, CommandBuilder } from "yargs"
import { DotConfigType, loadConfig } from "../config/main"
import path from "path"
import { askModule, askVariables } from "../prompts"
import ejs from "ejs"
import { loadTemplateConfig, setITemplateVariableDefaultValue } from "../config/template"
import { materializeVFS, VFSNode } from "../vfs"

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

    let absoluteTemplatePath = path.join(process.cwd(), templatePath)

    let info = loadTemplateConfig(absoluteTemplatePath, "info")
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
    // async fill vfs
    await Promise.all(Object.keys(info.files).map(async (templateFileName) => {
        let templateInfo = info.files[templateFileName]
        if (templateInfo.type === "ejs") {
            vfs[templateFileName] = await ejs.renderFile(path.join(
                absoluteTemplatePath,
                templateFileName
            ), variableContext, {
                async: false
            })
        } else if (templateInfo.type == "js") {
            vfs[templateFileName] = require(path.join(
                absoluteTemplatePath,
                templateFileName
            ))(module, variableContext)
        } else {
            console.error("Unsupported type", templateInfo)
            process.exit(-1)
        }
    }))
    // sync
    if (info.postProcessor) {
        vfs = info.postProcessor(vfs, variableContext)
    }
    // async
    if (info.asyncPostProcessor) {
        vfs = await info.asyncPostProcessor(vfs, variableContext)
    }

    await materializeVFS(vfs, overwrite)

    process.exit(0)
}
