const PromptConstant = {
    cancelConditionString: "(To cancel, press escape or C-c)",
    style: {
        TextInput: () => ({
            focus: {bg: "blue"},
            hover: {bg: "blue"}
        }),
        CTAButton: () => ({
            focus: {bg: "blue"},
            hover: {bg: "blue"}
        }),
        Button: () => ({
            focus: {bg: "blue"},
            hover: {bg: "blue"}
        }),
        Description: () => ({
            fg: "gray"
        }),
        Picker: () => ({
            selected: {
                fg: "white"
            },
            item: {
                fg: "gray"
            }
        }),
        FilePickerWindow: () => ({
            fg: "white",
        })
    }
}
export default PromptConstant
