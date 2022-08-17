import { ITemplateVariableAny } from "../../config/template"
import { DotConfigType } from "../../config/main"
import PromiseUtils from "../promiseUtils"
import blessed from "blessed"
import PromptComponents from "./components"
import PromptConstant from "./constants"


export type askVariablesConfig = {
    config: DotConfigType,
    absoluteTemplatesPath: string,
    projectDirectory: string
}
/**
 * Display form to specify template variables, that specified in `info.js > variables`
 * @param moduleName - used to display title of form
 * @param variablesContext
 * @param config
 */
export const askVariables = (moduleName: string,
                             variablesContext: {
                                 [key: string]: ITemplateVariableAny
                             },
                             config: askVariablesConfig): Promise<any> => {
    const featuredPromise = PromiseUtils.rc<any>()
    const screen = blessed.screen({smartCSR: true})
    const formContent: any = {}

    let stack = blessed.form({
        parent: screen,
        keys: true,
        // mouse: true,
        scrollable: true,
        top: 1, left: 1,
        content: `Setup ${moduleName} ${PromptConstant.cancelConditionString}`
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

        let offset: number
        switch (variable.type) {
        case "picker":
            offset = PromptComponents.addPicker(
                title,
                y,
                variableName,
                variable,
                stack,
                formContent
            )
            // use additional offset, cause outputPaths use more than 1 line
            y += offset - 1
            break
        case "filePicker":
            offset = PromptComponents.addFilePicker(
                title,
                y,
                variableName,
                config.absoluteTemplatesPath,
                config.projectDirectory,
                variable,
                stack,
                formContent
            )
            // use additional offset, cause filePicker take two lines to render
            y += offset - 1
            break
        case "boolean":
            PromptComponents.addBoolPicker(
                title,
                y,
                variableName,
                variable,
                stack,
                formContent
            )
            break
        case "string":
            PromptComponents.addStringInput(
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
                style: PromptConstant.style.Description()
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
        top: y, left: 0,
        shrink: true,
        style: PromptConstant.style.CTAButton()
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
    screen.on("resize", function () {
        screen.render()
    })
    screen.render()

    stack.key(["escape", "C-c"], () => process.exit())
    stack.focusNext()

    return featuredPromise.promise
}