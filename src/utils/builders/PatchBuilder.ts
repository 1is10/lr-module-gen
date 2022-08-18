import * as fs from "fs"
import * as os from "os"

type PatchBuilderAction = (fileLines: string[]) => string[]
type PatchBuilderFullOptions = { encoding: BufferEncoding | null | undefined, eol: string }
export type PatchBuilderOptions = Partial<PatchBuilderFullOptions>

export class PatchBuilder {
    private actions: PatchBuilderAction[] = []
    private options: PatchBuilderFullOptions

    constructor(private file: string, options: PatchBuilderOptions) {
        this.options = {
            encoding: "utf8",
            eol: os.EOL,
            ...options
        }
    }

    private static getIdentOfLine(line: string): string {
        const charsCount = line.length
        let i = 0
        let ident = ""

        while (i < charsCount) {
            if (line[i] === " ") {
                ident += " "

            } else if (line[i] === "\t") {
                ident += "\t"
            } else {
                return ident
            }
            i += 1
        }

        return ident
    }

    /**
     * Inserts string line after pointer
     * @param pointer - value that will be searched in text
     * @param string - inserted string
     * @param options:
     * ** preserveIndent: boolean - if true then spaces & tabs prefix from pointer line will be copied to string line
     *                              before insert
     *
     *                              default: true
     * ** global: boolean - if false, then after first found & insert algorithm will stop else algorithm will process
     *                      all lines with pointer
     *
     *                      default: false
     * ** reverse: boolean - if true then file will be processed from end to begin, until first match
     *                       all lines with pointer
     *
     *                       if used then `global` will be `false`
     *
     *                       default: false
     */
    insertAfter(pointer: string, string: string,
                options?: { preserveIndent?: boolean, global?: boolean, reverse?: boolean }): PatchBuilder {
        this.insertLine(true, pointer, string, options)
        return this
    }

    /**
     * Inserts string line before pointer
     * @param pointer - value that will be searched in text
     * @param string - inserted string
     * @param options:
     * ** preserveIndent: boolean - if true then spaces & tabs prefix from pointer line will be copied to string line
     *                              before insert
     *
     *                              default: true
     * ** global: boolean - if false, then after first found & insert algorithm will stop else algorithm will process
     *                      all lines with pointer
     *
     *                      default: false
     * ** reverse: boolean - if true then file will be processed from end to begin, until first match
     *                       all lines with pointer
     *
     *                       if used then `global` will be `false`
     *
     *                       default: false
     */
    insertBefore(pointer: string, string: string,
                 options?: { preserveIndent?: boolean, global?: boolean, reverse?: boolean }): PatchBuilder {
        this.insertLine(false, pointer, string, options)
        return this
    }

    /**
     * unified methods for string inserting
     */
    private insertLine(after: boolean, pointer: string, string: string,
                       options?: { preserveIndent?: boolean, global?: boolean, reverse?: boolean }): PatchBuilder {
        const reverse = options?.reverse ?? false
        // default false
        const isGlobal = (() => {
            if (reverse) {
                return false
            }

            return options?.global === true
        })()
        // default true
        const preserveIdent = options?.preserveIndent ?? true

        this.actions.push((lines) => {
            let linesCopy = lines
            let count = linesCopy.length
            let i = reverse ? count : 0

            // cycle condition
            const checkCondition = (() => {
                if (reverse) {
                    return (i: number, count: number) => i > 0
                } else {
                    return (i: number, count: number) => i < count
                }
            })()

            // if reverse decrement
            const preProcessor = (() => (reverse ? (i: number) => i - 1 : (i: number) => i))()
            // if !reverse increment
            const postProcessor = (() => (reverse ? (i: number) => i : (i: number) => i + 1))()
            const anyProcessor = (i: number) => preProcessor(postProcessor(i))
            // makes condition return false
            const completeProcessor = (() => (reverse ? (i: number) => i - count : (i: number) => i + count))()

            while (checkCondition(i, count)) {
                i = preProcessor(i)
                let line = linesCopy[i]
                if (line.indexOf(pointer) >= 0) {
                    let insertChunk = preserveIdent
                        ? PatchBuilder.getIdentOfLine(line) + string
                        : string
                    linesCopy.splice(after ? i + 1 : i, 0, insertChunk)

                    // increment only if needed, cause when reverse global not used
                    // and elements will stay on old positions
                    i = postProcessor(i)
                    count += 1
                    if (!isGlobal) { i = completeProcessor(i)}
                }

                i = postProcessor(i)
            }

            return linesCopy
        })
        return this
    }

    filter(lineProcessor: (line: string) => boolean): PatchBuilder {
        this.actions
            .push((lines) => lines.filter(lineProcessor))
        return this
    }

    map(lineProcessor: (line: string) => string): PatchBuilder {
        this.actions
            .push((lines) => lines.map(lineProcessor))
        return this
    }

    get trimLines(): PatchBuilder { return this.map(line => line.trim()) }

    windowMap(lineProcessor: (line: string[]) => string[],
              window: number = 2): PatchBuilder {
        if (window <= 0) {
            return this
        }

        if (window == 1) {
            return this.map((line) => lineProcessor([line]).join(this.options.eol))
        }

        this.actions.push((lines) => {
            let i = 0
            let count = lines.length
            let iRight = Math.min(i + window, count)

            let linesCopy = lines

            while (i < count) {
                let modifiedChunk = lineProcessor(linesCopy.slice(i, iRight))
                let windowSize = iRight - i

                linesCopy.splice(i, windowSize, ...modifiedChunk)

                i += 1
                iRight = Math.min(i + window, count)
                if ((iRight - i) < window) {
                    i = count
                }
            }

            return linesCopy
        })
        return this
    }

    get undo(): PatchBuilder {
        this.actions.pop()
        return this
    }

    get do(): Promise<PatchBuilder> {
        if (!this.actions.length) {return Promise.resolve(this)}

        return fs.promises
                 .readFile(this.file, {
                     encoding: this.options.encoding
                 })
                 .then(data => {
                     const dataString: string = typeof data === "string" ? data : data.toString()
                     const lines = dataString.split(this.options.eol)

                     const resultString = this.actions
                                              .reduce((previousLines, action) => action(previousLines), lines)
                                              .join(this.options.eol)

                     const writeResult = typeof data === "string"
                         ? resultString
                         : new Buffer(resultString, this.options.encoding === null ? undefined : this.options.encoding)
                     const writePromise = fs.promises.writeFile(this.file, writeResult, {
                         encoding: this.options.encoding
                     })

                     return writePromise.then(_ => this)
                 })
    }

    get doSync(): PatchBuilder {
        if (!this.actions.length) {return this}

        let data = fs.readFileSync(this.file, {
            encoding: this.options.encoding
        })

        const dataString: string = typeof data === "string" ? data : data.toString()
        const lines = dataString.split(this.options.eol)

        const resultString = this.actions
                                 .reduce((previousLines, action) => action(previousLines), lines)
                                 .join(this.options.eol)
        if (typeof data === "string") {
            data = resultString
        } else {
            data = new Buffer(resultString, this.options.encoding === null ? undefined : this.options.encoding)
        }

        fs.writeFileSync(this.file, data, {
            encoding: this.options.encoding
        })
        return this
    }
}