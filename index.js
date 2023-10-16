const HTMLParser = require('node-html-parser');
const got = require('got');
const fs = require('fs');
const ProgressBar = require('progress');

const SKINSLIST_FILE = './skinslist.json';
const CACHE_FILE = './cache.json';

let SIGINT = false;

async function getParsedPage (uri) {
    const pageContent = await got(uri);
    return HTMLParser.parse(pageContent.body);
}

async function regenSkinList () {
    const root = await getParsedPage("https://rustlabs.com/skins#order=name,desc");

    const elements = root.querySelectorAll('#wrappah > a').map(a => 'https://' + a.rawAttributes.href.replace('//', ''));

    fs.writeFileSync(SKINSLIST_FILE, JSON.stringify(elements, null, 2));
}

function generateCache (skinslist) {
    let cache = [];

    try {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE))
    } catch (e) {
        if (e.code !== 'ENOENT') {
            throw e;
        }
    }

    skinslist.forEach(uri => {
        if (cache.find(c => c.uri === uri)) {
            return;
        }

        cache.push({ uri, workshopid: -1, itemid: '' });
    });

    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

    return cache;
}

function saveCache (cache) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function crawl (toCrawl, cache, tick = () => {}) {
    for (let i = 0; i < toCrawl.length; i++) {
        const skin = toCrawl[i];
        const root = await getParsedPage(skin.uri);

        const workshopid = root.querySelector(".stats-table a")?.innerHTML;

        if (workshopid) {
            skin.workshopid = parseInt(workshopid);

            const itemIdSrc = root.querySelector("[data-name='skin-for'] .item-cell > img")?.rawAttributes.src;
            const itemId = itemIdSrc.substring(itemIdSrc.lastIndexOf('/') + 1).replace('.png', '');

            skin.itemid = itemId;
        } else {
            skin.ignore = true;
        }

        if (SIGINT) {
            return;
        }

        tick();
    }
}

function generatePluginConfig (cache) {
    const config = {
        Skins: cache.filter(i => i.workshopid > -1).reduce((acc, curr) => {
            const previousItem = acc.find(a => a["Item Shortname"] === curr.itemid);

            if (previousItem) {
                previousItem["Skins"].push(curr.workshopid);
            } else {
                acc.push({
                    "Item Shortname": curr.itemid,
                    "Permission": "",
                    "Skins": [curr.workshopid],
                });
            }

            return acc;
        }, []),
    }

    fs.writeFileSync("Skins.json", JSON.stringify(config, null, 2));
}

async function main () {
    let skinslist = [];

    try {
        skinslist = JSON.parse(fs.readFileSync(SKINSLIST_FILE));
    } catch (e) {
        if (e.code === 'ENOENT') {
            await regenSkinList();
            skinslist = JSON.parse(fs.readFileSync(SKINSLIST_FILE));
        } else {
            throw e;
        }
    }

    const cache = await generateCache(skinslist);

    console.log("Cache contains", cache.length, "items.");

    const toCrawl = cache.filter(c => c.workshopid === -1 && !c.ignore);

    if (!toCrawl.length) {
        console.log("The list is up to date. To check if new skins were added, delete the 'skinslist.json' file and restart the program.");
        console.log("Recreating the plugin configuration file.")
        generatePluginConfig(cache);
        return;
    }

    console.log(toCrawl.length, "items will be fetched. Starting the crawl.");

    const bar = new ProgressBar('[:current/:total] :bar :percent', { total: toCrawl.length });

    await crawl(toCrawl, cache, () => bar.tick())
        .catch(e => {
            saveCache(cache);
            throw e;
        })

    console.log("Saving the cache file.")
    saveCache(cache);

    console.log("Recreating the plugin configuration file.")
    generatePluginConfig(cache);
}

process.on('SIGINT', () => {
  console.log('Stopping the crawler...');
  SIGINT = true;
});

main()
.catch(e => {
    console.error(e);
    console.log("Something went wrong. Please open an issue with the error reported above.")
});