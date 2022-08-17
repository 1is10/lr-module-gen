import path from "path"
import { defaultConfigName } from "../utils/constants"

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


export const loadConfig = (): DotConfigType => {
    const configPath = path.join(process.cwd(), defaultConfigName)
    try {
        // try to parse config as node file
        return require(configPath)
    } catch (err) {
        // ignore, not js file
        console.error("Failed to load config", err)
        throw err
    }
}