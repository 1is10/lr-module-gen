import { ITemplateVariableTypeFilePicker } from "../../../config/template"
import blessed, { Widgets } from "blessed"
import PromptConstant from "../constants"
import PromiseUtils from "../../promiseUtils"
import { globPromise } from "../../globUtils"
import path from "path"
import { string } from "yargs"


/**
 * File Picker
 * @param title - string, displayed title, used for x offset
 * @param topOffset - int, used for form positioning
 * @param variableName - string, used as key in context
 * @param absoluteTemplatesPath - string, used for glob search inside project
 * @param projectDirectory - string, used to correct(trim) absolute glob paths
 * @param variable - ITemplateVariableTypeFilePicker, info about variable
 * @param parent - parent widget, used to place children
 * @param context - key/value for saving information from widget and passing to ejs template
 **/
export const addFilePicker = (title: string,
                              topOffset: number,
                              variableName: string,
                              absoluteTemplatesPath: string,
                              projectDirectory: string,
                              variable: ITemplateVariableTypeFilePicker,
                              parent: Widgets.FormElement<any>,
                              context: any): number => {
    let filePickButton = blessed.button({
        parent,
        // mouse: true,
        keys: true,
        top: topOffset, left: title.length,
        shrink: true,
        style: PromptConstant.style.Button(),
        content: "[Pick File]"
    })

    let displayText = blessed.text({
        parent,
        top: topOffset + 1, left: 2
    })

    // actions
    const setValue = (value: string | undefined = undefined) => {
        if (value) {
            displayText.setText(`- ${value}`)
        } else {
            displayText.setText("- file not selected -")
        }
        context[variableName] = value ?? ""
    }
    const pickFile = () => {
        addFilePickerWindow(
            variable,
            absoluteTemplatesPath,
            projectDirectory,
            parent
        ).then((value: string) => {
            setValue(value)
        }, () => {
            setValue()
        })
    }
    setValue(variable.default)
    filePickButton.on("press", pickFile)

    return 2
}

const addFilePickerWindow = async (variable: ITemplateVariableTypeFilePicker,
                                   absoluteTemplatesPath: string,
                                   projectDirectory: string,
                                   parent: Widgets.FormElement<any>): Promise<string> => {
    const superParent = parent.parent
    const lastFocused = parent.parent.screen.focusPop()
    parent.focusable = false

    const remotePromise = PromiseUtils.rc<string>()
    const stack = blessed.form({
        parent: superParent,
        keys: true,
        scrollable: true,
        top: 0, left: 0,
        // width: "100%", height: "100%",
        content: `{bold}${variable.title}{/bold}`, tags: true,
        style: PromptConstant.style.FilePickerWindow()
    })

    stack.key(["escape", "C-c"], () => remotePromise.reject(0))

    remotePromise.promise
                 .catch(() => "")
                 .then(() => {
                     superParent.remove(stack)
                     // schedule next loop, cause this promise subscription is early
                     // parent subscribed before this subscription
                     setTimeout(() => {
                         parent.focusable = true
                         parent.screen.render()
                         parent.parent.screen.focusPush(lastFocused)
                     })
                 })
    // Add filter helper
    let y = 2
    let filterTitle = blessed.text({parent: stack, top: y})
    filterTitle.setText("Filter:")

    let filterTextBox = blessed.textbox({
        parent: stack,
        inputOnFocus: true,
        // mouse: true,
        keys: true,
        top: y, left: filterTitle.getText().length + 1,
        shrink: true,
        style: PromptConstant.style.TextInput()
    })

    // replace
    let modules: string[] = (await Promise.all(variable.variants.map(async variant => {
        if (typeof variant === "string") {
            return [variant]
        } else if (variant.type === "path") {
            return [variant.value]
        } else if (variant.type === "glob") {
            return await globPromise(projectDirectory, variant.value)
        } else {
            throw new Error(`Unknown FilePicker variant type ${variant}`)
        }
    }))).flat()

    // TODO: Duplicated fragment, sub component required
    let lastText = filterTextBox.getText()
    filterTextBox.on("keypress", () => {
        if (filterTextBox.getText().trim() == lastText.trim()) {return}
        lastText = filterTextBox.getText()
        setTimeout(() => {
            if (filterTextBox.screen.focused !== filterTextBox) {return}
            placeFilteredBoxes(true)
        }, 100)
    })
    filterTextBox.on("submit", () => filteredBoxes.slice(0, 1).forEach(n => n.focus()))

    const filteredBoxesTop = y + 2
    let filteredBoxes: Widgets.ButtonElement[] = []

    const placeFilteredBoxes = (redraw: boolean = false) => {
        stack.screen.focusPop()

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
                    mouse: true,
                    keys: true,
                    top: filteredBoxesTop + index, left: 0,
                    shrink: true,
                    style: PromptConstant.style.Button()
                })

                stack.append(moduleButton)

                moduleButton.setText(path.relative(projectDirectory, moduleName))
                moduleButton.on("press", () => remotePromise.resolve(moduleName))

                return moduleButton
            })

        if (redraw) {
            (stack as any)._children = undefined
            stack.render()
            filterTextBox.focus()
        }
    }

    placeFilteredBoxes()
    stack.focusNext()

    return remotePromise.promise
}