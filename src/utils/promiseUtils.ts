
export interface RCPromiseControl<T> {
    promise: Promise<T>
    resolve: (value: T) => void
    reject: (reason: any | undefined) => void
    isFulfilled: () => boolean
}

export const rc = <T>(): RCPromiseControl<T> => {
    let empty = () => {}
    let resolve: (value: T) => void = empty
    let reject: (reason: any | undefined) => void = empty
    let isFulfilled: boolean = false
    let promise = new Promise<T>(((blockResolve, blockReject) => {
        resolve = (v) => {
            isFulfilled = true
            return blockResolve(v)
        }
        reject = (e) => {
            isFulfilled = true
            return blockReject(e)
        }
    }))

    return {
        resolve,
        reject,
        promise,
        isFulfilled: () => isFulfilled
    }
}

const PromiseUtils = {
    rc,
}
export default PromiseUtils