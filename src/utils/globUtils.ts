import * as glob from "glob"
import * as path from "path"

export const globPromise = (cwd: string, pattern: string): Promise<string[]> => {
    return new Promise<string[]>((resolve, reject) => {
        glob.glob(pattern, {
            cwd,
            absolute: true
        }, (err, matches) => {
            if (err != null) {
                return reject(err)
            }

            return resolve(matches.map(file => path.relative(cwd, file)))
        })
    })
}