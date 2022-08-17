import { ITemplateVariableTypeBoolean } from "../../../config/template"
import blessed, { Widgets } from "blessed"

/**
 * Bool picker
 * @param title - string, displayed title, used for x offset
 * @param topOffset - int, used for form positioning
 * @param variableName - string, used as key in context
 * @param variable - ITemplateVariableTypeOutputPath, info about variable
 * @param parent - parent widget, used to place children
 * @param context - key/value for saving information from widget and passing to ejs template
 **/
export const addBoolPicker = (title: string,
                              topOffset: number,
                              variableName: string,
                              variable: ITemplateVariableTypeBoolean,
                              parent: Widgets.FormElement<any>,
                              context: any) => {
    let checkbox = blessed.checkbox({
        parent: parent,
        checked: variable.default == true,
        // mouse: true,
        top: topOffset, left: title.length,
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