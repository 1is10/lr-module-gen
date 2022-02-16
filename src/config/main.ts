import fs from "fs"
import path from "path"

const fsPromises = fs.promises

export type DotConfigType = {
    generatorOutputPaths: { [key: string]: string },
    predefinedVariables?: {
        [key: string]: {
            value: any,
            // default: false
            editable?: boolean
        }
    },
    templatesPaths: { [key: string]: string },
}

export const defaultConfigName = ".lr.module.gen"

export const loadConfig = (): DotConfigType => {
    const configPath = path.join(process.cwd(), defaultConfigName)
    try {
        // try to parse config as node file
        return require(configPath)
    } catch (_) {
        // ignore, not js file
    }

    return JSON.parse(fs.readFileSync(configPath, {encoding: "utf8"})) as DotConfigType
}


export const defaultConfig: DotConfigType = {
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