import path from "path"
import fs from "fs"
import { string } from "yargs"

const fsPromises = fs.promises

export type VFSNode = {
    [key: string]: VFSNode | string
}
export const isVFSNode = (nodeOrNot: VFSNode | string): nodeOrNot is VFSNode => {
    return typeof nodeOrNot !== "string"
}

export const isVFSString = (nodeOrNot: VFSNode | string): nodeOrNot is string => {
    return typeof nodeOrNot === "string"
}


export const flattenVFS = (vfs: VFSNode, rootPath?: string): { [key: string]: string } => {
    let paths: { [key: string]: string } = {}

    for (let key of Object.keys(vfs)) {
        let value = vfs[key]
        let currentPath: string = rootPath ? path.join(rootPath, key) : key

        if (value === undefined) {
            // skip
        } else if (isVFSString(value)) {
            paths[currentPath] = value
        } else {
            let flattenResult = flattenVFS(value, currentPath)
            for (let key of Object.keys(flattenResult)) {
                paths[key] = flattenResult[key]
            }
        }
    }

    return paths
}

export const materializeVFS = async (vfs: VFSNode, overwriteFiles: boolean = false) => {
    let simpleVFS = flattenVFS(vfs)

    let dirnamePromises: { [key: string]: Promise<string> | undefined } = {}

    Object.keys(simpleVFS)
          .forEach(fullPath => {
              let dirname = path.dirname(fullPath)
              if (dirnamePromises[dirname]) {

              } else {
                  dirnamePromises[dirname] = Promise.resolve(dirname).then(async dirname => {
                      console.log("making directory", dirname)
                      await fsPromises.mkdir(path.join(process.cwd(), path.dirname(fullPath)), {
                          recursive: true
                      }).catch(_ => 1)
                      return dirname
                  })
              }
          })

    let generationPromises = Object
        .keys(simpleVFS)
        .map(async fullPath => {
            await dirnamePromises[path.dirname(fullPath)]

            let filePath = path.join(process.cwd(), fullPath)
            if (!overwriteFiles) {
                if (fs.existsSync(filePath)) {
                    return
                }
            }

            console.log("writing file", fullPath)
            await fsPromises.writeFile(
                path.join(process.cwd(), fullPath),
                simpleVFS[fullPath],
                {
                    encoding: "utf8"
                }
            ).catch(console.error)
        })

    await Promise.all(generationPromises)
}