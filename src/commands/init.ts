import type { Arguments, CommandBuilder } from "yargs"
import fs, { mkdir } from "fs"
import path from "path"
import { DotConfigType } from "../config/main"
import { materializeVFS } from "../vfs"
import { defaultTemplateVFS } from "../config/template"

const fsPromises = fs.promises

type Options = {
    config: string
}

export const command: string = "init [config]"
export const desc: string = `
Initializes main config my default, following options can be passed
- main
- template-sample
`

export const builder: CommandBuilder<Options, Options> = (yargs) =>
    yargs.positional("config", {
        type: "string",
        choices: ["main", "template-sample"],
        demandOption: false,
        default: "main"
    })

export const handler = async (argv: Arguments<Options>): Promise<void> => {
    const {config} = argv

    if (config == "main") {
        let configPath = ".lr.module.gen"
        let permission = await fsPromises.stat(configPath).catch(_ => Promise.resolve())
        if (permission) {
            console.error(".lr.module.gen already exist")
            process.exit(0)
            return
        }

        const defaultConfig: DotConfigType = {
            generatorOutputPaths: {
                "sources": "./src",
                "tests": "./tests"
            },
            predefinedVariables: {
                copyright: {
                    value: "Template copyright",
                    editable: false
                }
            },
            templatesPaths: {
                "module": "templates/module",
                "serviceTemplate": "templates/service"
            }
        }

        await fsPromises.writeFile(configPath, JSON.stringify(defaultConfig, null, 4))
    } else if (config == "template-sample") {
        await materializeVFS(defaultTemplateVFS, true)
    } else {
        console.error("Undefined config", config)
    }

    process.exit(0)
}