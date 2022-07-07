# Change Log

### [0.9.7] - 8.07.2022
- glob pattern support for paths in `info.js > files`
- `postActions` / `asyncPostActions` added, look at `template.ts`
- `utils` injection into `info.js` config, with following methods `exec(cmd):Promise, execSync(cmd)`

Example for usage inside template manifest:
```javascript
// info.js
{
    //...
    asyncPostActions: async function (vfs, variablesContext) {
        await this.utils.exec('./scripts/any')
    },
    // & sync version
    postActions: async function (vfs, variablesContext) {
        await this.utils.execSync('pwd')
    }
    //...
}
```

### [0.9.6] - 4.06.2022
- async ejs templating
- asyncPostProcessor added

### [0.9.3 - 0.9.4] - 26.02.2022

- fixed first install from sources, with npm/yarn, added typescript + X-flag for launching exec
- brew removed, cause binary was too huge, that redundant for `cli`

### [0.9.1] - 17.02.2022

- first release
