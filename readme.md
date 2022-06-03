# lr-module-gen readme

## Installation

### npm/yarn

```zsh
npm i -g lr-module-gen
# or #
yarn global add lr-module-gen
```

### from sources

```zsh
# install nodejs + yarn if not yet
# add yarn bin dir to your PATH, like that (add next line to your .zshrc or .bashrc)
export PATH=$HOME/.yarn/bin:$PATH
# git clone this repo
yarn
yarn run run # will compile cli
yarn link
# to uninstall 
yarn unlink
```

to recompile cli

```zsh
yarn run run
```

## First steps (just to figure out how it works)

1. mkdir & cd to new empty project directory
2. Call `lr-module-gen init` && `lr-module-gen init template-sample`
3. All project info will be placed in `.lr.module.gen` & simple templates inside `templates` directory
4. To generate module call `lr-module-gen gen` or `lr-module-gen gen module`

## Questions & Answers

- How to use git config parameters inside templates?

This case not supported now, if you need some specific shell variables you can use js in your `.lr.module.gen` file.\
For example like this one:

```javascript
const execSync = require('child_process').execSync

module.exports = {
    "generatorOutputPaths": {
        "sources": "./src",
        "tests": "./tests"
    },
    "predefinedVariables": {
        "copyright": {
            "value": "Template copyright",
            "editable": false
        },
        "author": {
            value: (new String(execSync('git config --global user.name'))).trim(),
            editable: false
        }
    },
    "templatesPaths": {
        "module": "templates/module",
        "serviceTemplate": "templates/service"
    }
}
```

## Known bugs

- Template module pick when calling `lr-module-gen gen` has some glitches, with double focus on filter & time delay

## External templates check points
- info.js && .lr.module.gen inside template directory included as simple js file, with rw permissions, all templates should be checked & verified by user
