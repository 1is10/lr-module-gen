# Change Log

### [0.9.9] - 18.08.2022

**[!] Deprecations & changes**

- **will be deprecated in next release:** all async methods removed for info.js, instead of using async function, use
  one without prefix & return Promise (check template.ts)
- dropped json support, for config & template info.js files
- utils sync methods, now located inside `sync` key
- when `lr-module-gen gen` called inside project directory with one template, picker disabled
- prompts refactored, for future ease of use
- fixed template module pick glitches
- mouse support for picking module & file picker (not ready for forms)

**New:**

- variable type *Picker* - pick one from some strings set
- variable type *FilePicker*
- utils.patch - utility for patching files (bazel build file or changelog for example 🤔)
- utils.vfsModify - utility for mangling VFSNode - check required
- template: conditional variables - for multi-step creation flow

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
    }
    // & sync version
    postActions: function (vfs, variablesContext) {
        this.utils.execSync('pwd')
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
