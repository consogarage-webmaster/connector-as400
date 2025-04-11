# connector-as400
Une application permettant le dialogue entre Prestashop et AS400


## Project structure :
```
connector as400/
├── src/
│   ├── watcher/
│   │   └── fileWatcher.js       # Watches for new files in input folder
│   ├── parser/
│   │   └── fileParser.js        # Parses the content of incoming files
│   ├── prestashop/
│   │   └── apiClient.js         # Handles API communication with PrestaShop
│   ├── jobs/
│   │   └── processFile.js       # Orchestrates parse → API logic
│   └── config.js                # Centralized config
├── input/                       # AS400 drops files here
├── processed/                   # Files moved here after handling
├── failed/                      # Files moved here if processing fails
├── .env
├── index.js
└── package.json
```