import { ITemplateVariableTypePicker } from "../../../config/template"
import blessed, { Widgets } from "blessed"
import PromptConstant from "../constants"

/**
 * Variants picker, contain output paths from `.lr.module.gen > generatorOutputPaths`
 * @param title - string, displayed title, used for x offset
 * @param topOffset - int, used for form positioning
 * @param variableName - string, used as key in context
 * @param variable - ITemplateVariableTypeOutputPath, info about variable
 * @param parent - parent widget, used to place children
 * @param context - key/value for saving information from widget and passing to ejs template
 * @return offset - number of rendered lines
 **/
export const addPicker = (title: string,
                          topOffset: number,
                          variableName: string,
                          variable: ITemplateVariableTypePicker,
                          parent: Widgets.FormElement<any>,
                          context: any): number => {
    let variants = variable.variants
    let outputPathList = blessed.radioset({
        parent: parent,
        // mouse: true,
        keys: true,
        top: topOffset, left: title.length,
        height: variants.length, shrink: true,
        style: PromptConstant.style.Picker()
    })

    variants.forEach((variantTitle, index) => {
        let button = blessed.radiobutton({
            parent: outputPathList,
            // mouse: true,
            keys: true,
            top: index, left: 0,
            height: variants.length, shrink: true,
            style: PromptConstant.style.Picker()
        })

        if (variable.default == variantTitle) {
            button.checked = true
            context[variableName] = variantTitle
        }

        let text = blessed.text({
            parent: outputPathList,
            top: index, left: 4
        })
        text.setText(variantTitle)

        button.on("check", () => {
            context[variableName] = variantTitle

            let i = variants.length - index
            while (i > 0) {
                parent.focusNext()
                i -= 1
            }
        })
    })

    return variants.length
}