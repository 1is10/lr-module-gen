import blessed, { Widgets } from "blessed"
import PromiseUtils from "../promiseUtils"
import PromptConstant from "./constants"


/**
 * Display form to pick/search module for generation, used only if used like `lr-module-gen gen`
 * *module can be specified implicitly `lr-module-gen gen serviceTemplate`
 *
 * @param modules - list of modules inside `.lr.module.gen > templatesPaths.*`
 */
export const askModule = (modules: string[]): Promise<string> => {
    const featuredPromise = PromiseUtils.rc<string>()
    const screen = blessed.screen({smartCSR: true})

    let stack = blessed.form({
        parent: screen,
        keys: true,
        // mouse: true,
        scrollable: true,
        top: 1, left: 1,
        content: `Pick module: ${PromptConstant.cancelConditionString}`
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
        keys: true,
        top: y, left: text.getText().length + 1,
        shrink: true,
        style: PromptConstant.style.TextInput()
    })

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