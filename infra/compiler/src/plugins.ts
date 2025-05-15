import type { Plugin } from 'esbuild'
/**
 * @type {import('esbuild').Plugin}
 */
export const esbuildProblemMatcherPlugin: Plugin = {
    name: 'esbuild-problem-matcher',

    setup(build) {
        build.onStart(() => {
            console.log('[watch] build started')
        })
        build.onEnd((result) => {
            result.errors.forEach(({ text, location }) => {
                console.error(`✘ [ERROR] ${text}`)
                if (location) {
                    console.error(`    ${location.file}:${location.line}:${location.column}:`)
                }
            })
            console.log('[watch] build finished')
        })
    },
}
