import blessed, { Widgets } from "blessed"
import {
    ITemplateVariableAny,
    ITemplateVariableTypeBoolean,
    ITemplateVariableTypeOutputPath,
    ITemplateVariableTypeString
} from "./config/template"
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

/**
 * Display form to specify template variables, that specified in `info.js > variables`
 * @param moduleName - used to display title of form
 * @param variablesContext
 * @param config
 */
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
            let offset = askVariablesHelpers.addOutputPathsPicker(
                title,
                y,
                variableName,
                variable,
                stack,
                config,
                formContent
            )
            // use additional offset, cause outputPaths use more than 1 line
            y += offset - 1
            break
        case "boolean":
            askVariablesHelpers.addBoolPicker(
                title,
                y,
                variableName,
                variable,
                stack,
                formContent
            )
            break
        case "string":
            askVariablesHelpers.addStringInput(
                title,
                y,
                variableName,
                variable,
                stack,
                formContent
            )
            break
        }

        // place description if variable in `module > info.js > variables.description` exist
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

    // place cta button
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

// AskVariablesHelpers
/**
 * Output paths picker, contain output paths from `.lr.module.gen > generatorOutputPaths`
 * @param title - string, displayed title, used for x offset
 * @param topOffset - int, used for form positioning
 * @param variableName - string, used as key in context
 * @param variable - ITemplateVariableTypeOutputPath, info about variable
 * @param parent - parent widget, used to place children
 * @param config - DotConfigType, .lr.module.gen file as object
 * @param context - key/value for saving information from widget and passing to ejs template
 * @return offset - number of rendered lines
 **/
const addOutputPathsPicker = (title: string,
                              topOffset: number,
                              variableName: string,
                              variable: ITemplateVariableTypeOutputPath,
                              parent: Widgets.FormElement<any>,
                              config: DotConfigType,
                              context: any): number => {
    let outputPaths = Object.keys(config.generatorOutputPaths)
    let outputPathList = blessed.radioset({
        parent: parent,
        // mouse: true,
        keys: true,
        top: topOffset,
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
            context[variableName] = config.generatorOutputPaths[path]
        }

        let text = blessed.text({
            parent: outputPathList,
            top: index,
            left: 4
        })
        text.setText(path)

        button.on("check", () => {
            const fullPath = config.generatorOutputPaths[path]
            context[variableName] = fullPath

            let i = outputPaths.length - index
            while (i > 0) {
                parent.focusNext()
                i -= 1
            }
        })
    })

    return outputPaths.length
}

/**
 * Bool picker
 * @param title - string, displayed title, used for x offset
 * @param topOffset - int, used for form positioning
 * @param variableName - string, used as key in context
 * @param variable - ITemplateVariableTypeOutputPath, info about variable
 * @param parent - parent widget, used to place children
 * @param context - key/value for saving information from widget and passing to ejs template
 **/
const addBoolPicker = (title: string,
                       topOffset: number,
                       variableName: string,
                       variable: ITemplateVariableTypeBoolean,
                       parent: Widgets.FormElement<any>,
                       context: any) => {
    let checkbox = blessed.checkbox({
        parent: parent,
        checked: variable.default == true,
        // mouse: true,
        top: topOffset,
        left: title.length,
        shrink: true
    })
    context[variableName] = variable.default == true
    checkbox.on("check", () => {
        context[variableName] = true
        parent.focusNext()
    })
    checkbox.on("uncheck", () => {
        context[variableName] = false
        parent.focusNext()
    })
}


/**
 * String input
 * @param title - string, displayed title, used for x offset
 * @param topOffset - int, used for form positioning
 * @param variableName - string, used as key in context
 * @param variable - ITemplateVariableTypeOutputPath, info about variable
 * @param parent - parent widget, used to place children
 * @param context - key/value for saving information from widget and passing to ejs template
 **/
const addStringInput = (title: string,
                        topOffset: number,
                        variableName: string,
                        variable: ITemplateVariableTypeString,
                        parent: Widgets.FormElement<any>,
                        context: any) => {
    let textBox = blessed.textbox({
        parent: parent,
        inputOnFocus: true,
        keys: true,
        top: topOffset,
        left: title.length,
        shrink: true,
        style: {focus: {bg: "blue"}, hover: {bg: "blue"}}
    })
    if (variable.default) {
        textBox.setText(variable.default)
    }
    context[variableName] = variable.default ?? ""
    textBox.on("action", () => {
        context[variableName] = textBox.value
    })
    textBox.on("submit", () => {
        parent.focusNext()
    })
}
const askVariablesHelpers = {
    addOutputPathsPicker,
    addBoolPicker,
    addStringInput
}

/**
 * Display form to pick/search module for generation, used only if used like `lr-module-gen gen`
 * *module can be specified implicitly `lr-module-gen gen serviceTemplate`
 *
 * @param modules - list of modules inside `.lr.module.gen > templatesPaths.*`
 */
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