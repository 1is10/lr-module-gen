import { ITemplateVariableTypeString } from "../../../config/template"
import blessed, { Widgets } from "blessed"
import PromptConstant from "../constants"

/**
 * String input
 * @param title - string, displayed title, used for x offset
 * @param topOffset - int, used for form positioning
 * @param variableName - string, used as key in context
 * @param variable - ITemplateVariableTypeOutputPath, info about variable
 * @param parent - parent widget, used to place children
 * @param context - key/value for saving information from widget and passing to ejs template
 **/
export const addStringInput = (title: string,
                               topOffset: number,
                               variableName: string,
                               variable: ITemplateVariableTypeString,
                               parent: Widgets.FormElement<any>,
                               context: any) => {
    let textBox = blessed.textbox({
        parent: parent,
        inputOnFocus: true,
        keys: true,
        top: topOffset, left: title.length,
        shrink: true,
        style: PromptConstant.style.TextInput()
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