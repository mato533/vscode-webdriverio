import path from 'node:path'
import url from 'node:url'

import { browser, expect } from '@wdio/globals'
import shell from 'shelljs'
import { sleep, type SideBarView, type Workbench } from 'wdio-vscode-service'

import {
    STATUS,
    clearAllTestResults,
    clickTreeItemButton,
    collapseAllTests,
    getTestingSection,
    openTestingView,
    waitForResolved,
    waitForTestStatus,
} from '../helpers/index.js'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..', '..')
const workspacePath = path.resolve(rootDir, 'samples/smoke/update-config/')
const beforeConfig = path.resolve(workspacePath, 'wdio.conf.ts')
const afterConfig = path.resolve(workspacePath, 'wdio.conf.ts.template')

describe('VS Code Extension Testing (Update config)', function () {
    let workbench: Workbench
    let sideBarView: SideBarView<any>

    beforeEach(async function () {
        workbench = await browser.getWorkbench()
        await openTestingView(workbench)
        sideBarView = workbench.getSideBar()

        const testingSection = await getTestingSection(sideBarView.getContent())
        await collapseAllTests(testingSection)

        await browser.waitUntil(async () => (await testingSection.getVisibleItems()).length === 1)
    })

    afterEach(async function () {
        await clearAllTestResults(workbench)
    })

    after(function () {
        shell.exec(`git checkout ${beforeConfig}`)
    })

    it('should be resolved the defined tests after configuration changed', async function () {
        const testingSection = await getTestingSection(sideBarView.getContent())
        const items = await testingSection.getVisibleItems()

        await waitForResolved(browser, items[0])

        await expect(items).toMatchTreeStructure([
            {
                text: 'wdio.conf.ts',
                status: STATUS.NOT_YET_RUN,
                children: [
                    {
                        text: 'before.spec.ts',
                        status: STATUS.NOT_YET_RUN,
                        children: [
                            {
                                text: 'Before Tests',
                                status: STATUS.NOT_YET_RUN,
                                children: [{ text: 'TEST BEFORE 1', status: STATUS.NOT_YET_RUN }],
                            },
                        ],
                    },
                    {
                        text: 'sample.spec.ts',
                        status: STATUS.NOT_YET_RUN,
                        children: [
                            {
                                text: 'Sample 1',
                                status: STATUS.NOT_YET_RUN,
                                children: [{ text: 'TEST SAMPLE 1', status: STATUS.NOT_YET_RUN }],
                            },
                        ],
                    },
                ],
            },
        ])

        // Emulate the changing configuration
        shell.cp('-f', afterConfig, beforeConfig)
        await sleep(1500)
        await browser.waitUntil(
            async () => {
                try {
                    if (!(await items[0].isExpanded())) {
                        await items[0].expand()
                    }

                    const children = await items[0].getChildren()
                    const target = children[0]
                    if (!target) {
                        return false
                    }
                    const regex = new RegExp('after.test.ts')
                    return regex.test(await target.getLabel())
                } catch {
                    return false
                }
            },
            { timeoutMsg: 'The label "after.test.ts" is not found.' }
        )

        await expect(items).toMatchTreeStructure([
            {
                text: 'wdio.conf.ts',
                status: STATUS.NOT_YET_RUN,
                children: [
                    {
                        text: 'after.test.ts',
                        status: STATUS.NOT_YET_RUN,
                        children: [
                            {
                                text: 'After Tests',
                                status: STATUS.NOT_YET_RUN,
                                children: [{ text: 'TEST AFTER 1', status: STATUS.NOT_YET_RUN }],
                            },
                        ],
                    },
                ],
            },
        ])
    })

    it('should run tests successfully after changing the configuration', async function () {
        const testingSection = await getTestingSection(sideBarView.getContent())
        const items = await testingSection.getVisibleItems()

        await waitForResolved(browser, items[0])

        await clickTreeItemButton(browser, items[0], 'Run Test')

        await waitForTestStatus(browser, items[0], STATUS.PASSED)

        await expect(items).toMatchTreeStructure([
            {
                text: 'wdio.conf.ts',
                status: STATUS.PASSED,
                children: [
                    {
                        text: 'after.test.ts',
                        status: STATUS.PASSED,
                        children: [
                            {
                                text: 'After Tests',
                                status: STATUS.PASSED,
                                children: [{ text: 'TEST AFTER 1', status: STATUS.PASSED }],
                            },
                        ],
                    },
                ],
            },
        ])
    })
})
