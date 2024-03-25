<script>
    import { pwaInfo } from 'virtual:pwa-info';
    import { pwaAssetsHead } from 'virtual:pwa-assets/head';
    import {onMount} from "svelte";

    const intervalMS = 10 * 60 * 1000 // check for updates every 10 minutes

    onMount(async () => {
        if (pwaInfo) {
            const { registerSW } = await import('virtual:pwa-register')

            registerSW({
                immediate: true,
                onRegisteredSW(swUrl, registration) {
                    registration && setInterval(async () => {
                        if (!(!registration.installing && navigator))
                            return

                        if (('connection' in navigator) && !navigator.onLine)
                            return

                        console.log('Checking for sw update')

                        const resp = await fetch(swUrl, {
                            cache: 'no-store',
                            headers: {
                                'cache': 'no-store',
                                'cache-control': 'no-cache',
                            },
                        })

                        if (resp?.status === 200)
                            await registration.update()
                    }, intervalMS)

                    console.log(`SW Registered: ${registration}`)
                },

                onRegisterError(error) {
                    console.log('SW registration error', error)
                }
            })
        }
    })

    let webManifest = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '')
</script>

<svelte:head>
    {#if pwaAssetsHead.themeColor}
        <meta name="theme-color" content={pwaAssetsHead.themeColor.content} />
    {/if}
    {#each pwaAssetsHead.links as link}
        <link {...link} />
    {/each}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html webManifest}
</svelte:head>

<main>
    <slot />
</main>