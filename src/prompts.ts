import blessed, { Widgets } from "blessed"
import { ITemplateVariableAny } from "./config/template"
import { DotConfigType } from "./config/main"

const cancelConditionString = "(To cancel, press escape or C-c)"

export interface RCPromiseControl<T> {
    promise: Promise<T>
    resolve: (value: T) => void
    reject: (reason: any | undefined) => void
    isFulfilled: () => boolean
}

export const rc = <T>(): RCPromiseControl<T> => {
    let empty = () => {}
    let resolve: (value: T) => void = empty
    let reject: (reason: any | undefined) => void = empty
    let isFulfilled: boolean = false
    let promise = new Promise<T>(((blockResolve, blockReject) => {
        resolve = (v) => {
            isFulfilled = true
            return blockResolve(v)
        }
        reject = (e) => {
            isFulfilled = true
            return blockReject(e)
        }
    }))

    return {
        resolve,
        reject,
        promise,
        isFulfilled: () => isFulfilled
    }
}

export const askVariables = (moduleName: string, variablesContext: {
    [key: string]: ITemplateVariableAny
}, config: DotConfigType): Promise<any> => {
    const featuredPromise = rc<any>()
    const screen = blessed.screen({smartCSR: true})
    const formContent: any = {}

    let stack = blessed.form({
        parent: screen,
        keys: true,
        // mouse: true,
        scrollable: true,
        left: 1,
        top: 1,
        content: `Setup ${moduleName} ${cancelConditionString}`
    })
    let y = 2

    for (let variableName of Object.keys(variablesContext)) {
        let variable = variablesContext[variableName]
        let title = (variable.title ?? variableName) + ": "

        let text = blessed.text({
            parent: stack,
            top: y
        })
        text.setText(title + ":")

        switch (variable.type) {
        case "outputPath":
            let outputPaths = Object.keys(config.generatorOutputPaths)
            let outputPathList = blessed.radioset({
                parent: stack,
                // mouse: true,
                keys: true,
                top: y,
                height: outputPaths.length,
                left: title.length,
                shrink: true,
                style: {
                    selected: {
                        fg: "white"
                    },
                    item: {
                        fg: "gray"
                    }
                }
            })

            outputPaths.forEach((path, index) => {
                let button = blessed.radiobutton({
                    parent: outputPathList,
                    // mouse: true,
                    keys: true,
                    top: index,
                    height: outputPaths.length,
                    left: 0,
                    shrink: true,
                    style: {
                        selected: {
                            fg: "white"
                        },
                        item: {
                            fg: "gray"
                        }
                    }
                })

                if (variable.default == path) {
                    button.checked = true
                    formContent[variableName] = config.generatorOutputPaths[path]
                }

                let text = blessed.text({
                    parent: outputPathList,
                    top: index,
                    left: 4
                })
                text.setText(path)

                button.on("check", () => {
                    const fullPath = config.generatorOutputPaths[path]
                    formContent[variableName] = fullPath

                    let i = outputPaths.length - index
                    while (i > 0) {
                        stack.focusNext()
                        i -= 1
                    }
                })
            })

            y += outputPaths.length - 1
            break
        case "boolean":
            let checkbox = blessed.checkbox({
                parent: stack,
                checked: variable.default == true,
                // mouse: true,
                top: y,
                left: title.length,
                shrink: true
            })
            formContent[variableName] = variable.default == true
            checkbox.on("check", () => {
                formContent[variableName] = true
                stack.focusNext()
            })
            checkbox.on("uncheck", () => {
                formContent[variableName] = false
                stack.focusNext()
            })
            break

        case "string":
            let textBox = blessed.textbox({
                parent: stack,
                inputOnFocus: true,
                // mouse: true,
                keys: true,
                top: y,
                left: title.length,
                shrink: true,
                style: {
                    focus: {
                        bg: "blue"
                    },
                    hover: {
                        bg: "blue"
                    }
                }
            })
            if (variable.default) {
                textBox.setText(variable.default)
            }
            formContent[variableName] = variable.default ?? ""
            textBox.on("action", () => {
                formContent[variableName] = textBox.value
            })
            textBox.on("submit", () => {
                stack.focusNext()
            })
            break
        }

        let desc = variable.description
        if (desc) {
            y += 1

            let text = blessed.text({
                parent: stack, top: y,
                style: {
                    fg: "gray"
                }
            })
            text.setText(desc)
        }

        y += 1
    } // input form lines generation: end

    y += 1

    let generateButton = blessed.button({
        parent: stack,
        // mouse: true,
        keys: true,
        top: y,
        shrink: true,
        left: 0,
        style: {
            focus: {bg: "blue"},
            hover: {bg: "blue"}
        }
    })
    generateButton.setText("> GEN")
    generateButton.on("press", () => {
        screen.children.forEach(n => n.destroy())
        screen.render()
        screen.destroy()
        featuredPromise.resolve(formContent)
    })

    // setup & render screen
    screen.title = "Module generator v1.0"
    screen.key(["escape", "C-c"], () => process.exit())
    screen.on("resize", function () {
        screen.render()
    })
    screen.render()
    stack.focusNext()
    return featuredPromise.promise
}

export const askModule = (modules: string[]): Promise<string> => {
    const featuredPromise = rc<string>()
    const screen = blessed.screen({smartCSR: true})
    const formContent: any = {}

    let stack = blessed.form({
        parent: screen,
        keys: true,
        // mouse: true,
        scrollable: true,
        left: 1,
        top: 1,
        content: `Pick module: ${cancelConditionString}`
    })
    let y = 2

    // search field
    let text = blessed.text({
        parent: stack,
        top: y
    })
    text.setText("Filter:")

    let filterTextBox = blessed.textbox({
        parent: stack,
        inputOnFocus: true,
        // mouse: true,
        keys: true,
        top: y,
        left: text.getText().length + 1,
        shrink: true,
        style: {
            focus: {bg: "blue"},
            hover: {bg: "blue"}
        }
    })
    let lastText = filterTextBox.getText()
    filterTextBox.on("keypress", () => {
        if (filterTextBox.getText().trim() == lastText.trim()) {
            return
        }

        lastText = filterTextBox.getText()

        setTimeout(() => placeFilteredBoxes(true), 100)
    })
    filterTextBox.on("submit", () => filteredBoxes.slice(0, 1).forEach(n => n.focus()))

    const filteredBoxesTop = y + 2
    let filteredBoxes: Widgets.ButtonElement[] = []

    const placeFilteredBoxes = (redraw: boolean = false) => {
        let filterQuery = filterTextBox.getText().toLowerCase()
        filteredBoxes.forEach(box => {
            stack.remove(box)
            box.destroy()
        })
        filteredBoxes = modules
            .filter(moduleName => {
                return !filterQuery || moduleName.toLowerCase().indexOf(filterQuery) > -1
            })
            .map((moduleName, index) => {
                let moduleButton = blessed.button({
                    // mouse: true,
                    keys: true,
                    top: filteredBoxesTop + index,
                    shrink: true,
                    left: 0,
                    style: {
                        focus: {bg: "blue"},
                        hover: {bg: "blue"}
                    }
                })

                stack.append(moduleButton)

                moduleButton.setText(moduleName)
                moduleButton.on("press", () => {
                    screen.children.forEach(n => n.destroy())
                    screen.render()
                    screen.destroy()
                    featuredPromise.resolve(moduleName)
                })

                return moduleButton
            })

        if (redraw) {
            (stack as any)._children = undefined
            screen.render()
            stack.focusNext()
        }
    }

    placeFilteredBoxes()
    stack.focusNext()
    // setup & render screen
    screen.title = "Module generator v1.0"
    screen.key(["escape", "C-c"], () => process.exit())
    screen.on("resize", function () {
        screen.render()
    })
    screen.render()

    return featuredPromise.promise
}