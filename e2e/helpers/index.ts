import { DefaultTreeSection } from 'wdio-vscode-service'
import type { StatusStrings } from 'assertions/index.ts'
import type { TreeItem, Workbench, ViewControl, ViewContent, ViewItemAction, ViewTitlePart } from 'wdio-vscode-service'

export { STATUS } from './constants.js'

export async function openTestingView(workbench: Workbench) {
    const activityBar = workbench.getActivityBar()
    let testingViewControl: ViewControl | undefined
    await browser.waitUntil(
        async () => {
            testingViewControl = await activityBar.getViewControl('Testing')
            return typeof testingViewControl !== 'undefined'
        },
        {
            timeoutMsg: 'Testing view was not opened',
        }
    )
    await testingViewControl!.openView()
    return testingViewControl!
}

export async function getTestingSection(content: ViewContent) {
    return new DefaultTreeSection(content.locatorMap, content.section$, content)
}

export async function waitForResolved(browser: WebdriverIO.Browser, item: TreeItem) {
    await browser.waitUntil(
        async () => {
            const regex = new RegExp('Resolving WebdriverIO Tests')
            return !regex.test(await item.getLabel())
        },
        {
            timeoutMsg: 'Resolving tests ware not finished',
        }
    )
}

export async function clickTreeItemButton(browser: WebdriverIO.Browser, target: TreeItem, buttonLabel: string) {
    let btn: ViewItemAction | undefined
    await browser.waitUntil(
        async () => {
            btn = await target.getActionButton(buttonLabel)
            if (btn && (await (btn.elem as WebdriverIO.Element).isClickable())) {
                return true
            }
            return false
        },
        {
            timeoutMsg: 'The button is not clickable.',
        }
    )

    await (btn!.elem as WebdriverIO.Element).click()
}

export async function waitForTestStatus(browser: WebdriverIO.Browser, item: TreeItem, status: StatusStrings) {
    await browser.waitUntil(
        async () => {
            const label = await item.getLabel()
            // wdio.conf.ts (Passed), in 3.2s
            const matcherResult = label.match(/\(([^)]+)\), in .*s$/)
            return matcherResult && matcherResult[1] === status
        },
        {
            timeout: 180000,
            timeoutMsg: `expected status(${status}) to be different(current: ${await item.getLabel()})`,
        }
    )
}

export async function clearAllTestResults(workbench: Workbench) {
    const notifications = await workbench.getNotifications()
    await Promise.all(
        notifications.map(async (notification) => {
            return await notification.dismiss()
        })
    )
    const bottomBarPanel = workbench.getBottomBar()
    const tabTitle = 'Test Results'
    try {
        const tabContainer = await bottomBarPanel.tabContainer$
        const tab = (await tabContainer.$(`.//a[starts-with(@aria-label, '${tabTitle}')]`)) as WebdriverIO.Element

        if (await tab.isExisting()) {
            await tab.click()
            await bottomBarPanel.elem
                .$(
                    (bottomBarPanel.locatorMap.BottomBarViews.actionsContainer as Function)(
                        'Test Results actions'
                    ) as string
                )
                .$(bottomBarPanel.locatorMap.BottomBarViews.clearText as string)
                .click()
        }
    } catch (_error) {
        console.log(_error)
    }
}

export async function clickTitleActionButton(titlePart: ViewTitlePart, label: string | RegExp) {
    const elements = (await titlePart.elem.$$(
        (titlePart.locatorMap.ViewSection.actionConstructor as Function)()
    )) as WebdriverIO.Element[]

    const regExp = typeof label === 'string' ? new RegExp(label) : label
    for (const element of elements) {
        const actualLabel = await element.getAttribute('aria-label')
        if (regExp.test(actualLabel)) {
            await element.click()
            break
        }
    }
}

export async function collapseAllTests(testingSection: DefaultTreeSection) {
    const items = (await testingSection.getVisibleItems()).reverse()
    for (const item of items) {
        if ((await item.isExpandable()) && (await item.isExpanded())) {
            await item.collapse()
        }
    }
}
