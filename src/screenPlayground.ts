import blessed, { Widgets } from "blessed"
import Node = Widgets.Node


const screen = blessed.screen({
    smartCSR: true
})
screen.title = "Module generator v1.0"

let stack = blessed.form({
    parent: screen,
    keys: true,
    mouse: true,
    left: 1,
    top: 1,
    content: "Submit or cancel?"
})

let y = 2

const createLine = (title: string, child: Node) => {
    let text = blessed.text({
        parent: stack
    })
    text.setText(title)
    text.top = y
    y += 1

}

let text = blessed.textbox({
    parent: stack,
    inputOnFocus: true,
    mouse: true,
    keys: true,
    top: y,
    left: 12 + 2,
    shrink: true,
    style: {
        // bg: "blue",
        focus: {
            bg: "red"
        },
        hover: {
            bg: "red"
        }
    }
})
createLine("Module name:", text)
text.focus()

createLine("Is Secret:", blessed.checkbox({
    parent: stack,
    checked: true,
    mouse: true,
    top: y,
    left: 10 + 2,
    shrink: true
}))
createLine("View model name:", blessed.textbox({
    parent: stack,
    mouse: true,
    keys: true,
    width: 36,
    top: y,
    left: 16 + 2,
    shrink: true,
    style: {
        bg: "blue",
        focus: {
            bg: "red"
        },
        hover: {
            bg: "red"
        }
    }
}))

createLine("Commit", (() => {
    let button = blessed.button({
        parent: stack,
        mouse: true,
        keys: true,
        top: y,
        shrink: true,
        left: 10,
        style: {
            bg: "blue",
            focus: {
                bg: "red"
            },
            hover: {
                bg: "red"
            }
        }
    })
    button.setText(">Commit<")
    button.on("press", () => {
        screen.children.forEach(n => screen.remove(n))
        screen.render()
    })
    return button
})())


screen.key(["escape", "C-c"], () => process.exit())
screen.on("resize", function () {
    screen.render()
})
screen.render()

export default [1,2]