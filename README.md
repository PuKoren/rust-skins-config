# Rust labs skins crawler

Node.js crawler to fetch approved workshop skins list from https://rustlabs.com/skins and generate a config file for the Rust mod "Skins".

Skins IDs already known will not be fetched again to avoid using Rustlabs resources and allow easy collaboration.

A future version using Steam Workshop API might be done, in order to not use Rustlabs and avoid crawling.

## How to use

Simply run the index.js script. You need to have node.js installed on your system.
```js
node index.js
```

Once the script finished, you can use the config file generated (`Skins.json`) nd place it in the oxide config folder. The script generates a minimal config file, so if you want to customize other options such as the Skins UI or commands, add it manually or edit the file after reloading the plugin (the plugin will complete the config file with defaults).

If the server is already running, you can reload the plugin on your server with the command `o.reload Skins` after copying the Skins.json file.

## Re-generate the skin list to fetch new skins
Once in a while, delete the "skinlist.json" file and restart the program. New skins will be added to the config.

## Known issues
There is some skins that are not yet handled by the script as they require a special crawling. There is only a handful of them so it can be done by hand for now, until I add it to the script.
